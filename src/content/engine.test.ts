import { describe, expect, it } from "vitest";
import { createEngine, type EngineDeps, type EngineItem } from "./engine";
import { DEFAULT_SETTINGS, presetRule, type Settings } from "../lib/score";

function low(id: string): EngineItem {
  return {
    id,
    platform: "youtube",
    surface: "player",
    creatorId: "channel",
    kind: "video",
    metrics: { views: 10000, likes: 10, comments: 0, shares: 0, saves: null },
  };
}

function harness(partial: Partial<Settings> = {}, advanceResult = true, duringAdvance?: (show: (item: EngineItem) => void) => void, undoDeps: Pick<EngineDeps, "rememberUndo" | "sessionKeep" | "advanceGapMs" | "settleMs" | "ready"> = {}) {
  const settings: Settings = { ...DEFAULT_SETTINGS, platforms: { ...DEFAULT_SETTINGS.platforms }, rule: presetRule("balanced"), allowlist: [], ...partial };
  let clock = 0;
  let seq = 1;
  const tasks: Array<{ id: number; at: number; fn: () => void }> = [];
  const advances: string[] = [];
  const reasons: string[] = [];
  const retreats: string[] = [];
  const chips: string[] = [];
  const models: unknown[] = [];
  let skips = 0;
  const skipMs: number[] = [];
  let blocked = false;
  let latest = "";
  let calls = 0;
  const engine = createEngine({
    getSettings: () => settings,
    now: () => clock,
    advance: async (reason) => {
      calls += 1;
      advances.push(latest);
      reasons.push(reason);
      duringAdvance?.((item) => {
        latest = item.id;
        engine.onItem(item);
      });
      return advanceResult;
    },
    retreat: async () => {
      retreats.push(latest);
      return true;
    },
    onSkipped: (ms) => {
      skips += 1;
      skipMs.push(ms);
    },
    setRule: (next) => {
      settings.rule = next;
    },
    isBlocked: () => blocked,
    render: (chip) => {
      chips.push(chip ? chip.mode : "none");
      models.push(chip);
    },
    schedule: (fn, ms) => {
      const id = seq;
      seq += 1;
      tasks.push({ id, at: clock + ms, fn });
      return id;
    },
    cancel: (id) => {
      const index = tasks.findIndex((task) => task.id === id);
      if (index >= 0) tasks.splice(index, 1);
    },
    ...undoDeps,
  });

  async function drain() {
    for (let step = 0; step < 8; step += 1) await Promise.resolve();
  }

  function flush(ms: number) {
    const target = clock + ms;
    for (;;) {
      const due = tasks.filter((task) => task.at <= target).sort((a, b) => a.at - b.at);
      if (!due.length) break;
      const task = due[0];
      clock = task.at;
      const index = tasks.findIndex((item) => item.id === task.id);
      if (index >= 0) tasks.splice(index, 1);
      task.fn();
    }
    clock = target;
  }

  function show(item: EngineItem) {
    latest = item.id;
    engine.onItem(item);
  }

  return {
    engine,
    settings,
    show,
    flush,
    drain,
    advances,
    reasons,
    retreats,
    chips,
    models,
    skipMs,
    get skips() { return skips; },
    get calls() { return calls; },
    setBlocked(value: boolean) { blocked = value; },
  };
}

function ad(id: string, metrics: EngineItem["metrics"] = null): EngineItem {
  return { ...low(id), kind: "ad", metrics };
}

const good = { views: 900000, likes: 40000, comments: 200, shares: 10, saves: null };

describe("interrupted skip runs", () => {
  it("ends the run when late counts leave a video on screen", async () => {
    const box = harness();
    for (let i = 0; i < 5; i++) {
      box.show(low(String(i))); await box.drain(); box.flush(450);
    }
    box.show({ ...low("late"), metrics: null });
    box.flush(4000);
    box.show(low("late")); await box.drain();
    expect(box.skips).toBe(5);
    box.show(low("next")); await box.drain();
    expect(box.models.at(-1)).toEqual({ mode: "skipped", metric: "likes", value: 10 });
  });
  it("ends the run when revisiting a video that was already kept", async () => {
    const box = harness();
    box.show({ ...low("good"), metrics: good });
    for (let i = 0; i < 5; i++) {
      box.show(low(String(i))); await box.drain(); box.flush(450);
    }
    box.show({ ...low("good"), metrics: good });
    box.show(low("next")); await box.drain();
    expect(box.models.at(-1)).toEqual({ mode: "skipped", metric: "likes", value: 10 });
  });
  it("does not group reasons across a video that passes the rule", async () => {
    const box = harness();
    box.show(low("a")); await box.drain();
    box.show({ ...low("good"), metrics: good });
    box.flush(450); box.show(low("b")); await box.drain();
    expect(box.models.at(-1)).toEqual({ mode: "skipped", metric: "likes", value: 10 });
  });
  it("does not move while hidden and retains a safety pause on return", async () => {
    const box = harness();
    box.engine.setVisible(false); box.show(low("hidden")); await box.drain();
    expect(box.skips).toBe(0);
    box.engine.setVisible(true); box.engine.poke(); await box.drain();
    expect(box.skips).toBe(1);
    for (let i = 0; i < 5; i++) {
      box.flush(450); box.show(low(String(i))); await box.drain();
    }
    expect(box.models.at(-1)).toEqual({ mode: "paused", canLower: true });
    box.engine.setVisible(false); box.engine.setVisible(true);
    box.show(low("next")); await box.drain();
    expect(box.skips).toBe(6);
    expect(box.models.at(-1)).toEqual({ mode: "paused", canLower: true });
  });

  it("does not revive a chip when an in-flight move finishes while hidden", async () => {
    const box = harness({}, true, () => box.engine.setVisible(false));
    box.show(low("a")); await box.drain();
    expect(box.skips).toBe(1);
    expect(box.models.at(-1)).toBeNull();
  });

  it("starts a fresh run after a session-kept video", async () => {
    const box = harness({}, true, undefined, { sessionKeep: new Set(["kept"]) });
    for (let i = 0; i < 5; i++) {
      box.show(low(String(i))); await box.drain(); box.flush(450);
    }
    box.show(low("kept"));
    box.show(low("next")); await box.drain();
    expect(box.skips).toBe(6);
    expect(box.models.at(-1)).toEqual({ mode: "skipped", metric: "likes", value: 10 });
  });

  it("starts a fresh run after keeping the current creator", async () => {
    const box = harness();
    for (let i = 0; i < 5; i++) {
      box.show(low(String(i))); await box.drain(); box.flush(450);
    }
    box.setBlocked(true); box.show(low("kept")); box.engine.keepCurrent();
    box.setBlocked(false); box.show(low("next")); await box.drain();
    expect(box.models.at(-1)).toEqual({ mode: "skipped", metric: "likes", value: 10 });
  });

  for (const interruption of ["disable", "leave"] as const) {
    it(`does not revive a notification when a move finishes after ${interruption}`, async () => {
      const box = harness({}, true, () => {
        if (interruption === "disable") {
          box.settings.enabled = false;
          box.engine.settingsChanged();
        } else box.engine.onInactive();
      });
      box.show(low("a")); await box.drain();
      expect(box.skips).toBe(1); // The site did carry out the move.
      expect(box.models.at(-1)).toBeNull();
    });
  }
});

describe("engine and ads", () => {
  it("keeps an ad that has few likes while Skip ads is off", async () => {
    const box = harness({ skipAds: false });
    box.show(ad("a", low("a").metrics));
    await box.drain();
    box.flush(10000);
    await box.drain();
    expect(box.advances).toEqual([]);
    expect(box.skips).toBe(0);
  });

  it("skips an ad as soon as it is known to be one, without waiting for counts", async () => {
    const box = harness({ skipAds: true });
    box.flush(10000);
    box.show(ad("a"));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    expect(box.reasons).toEqual(["ad"]);
    expect(box.skips).toBe(1);
    expect(box.models.at(-1)).toEqual({ mode: "skipped", metric: "ad" });
  });

  it("skips an ad that has plenty of likes, and still names the ad rule", async () => {
    const box = harness({ skipAds: true });
    box.flush(10000);
    box.show(ad("a", good));
    await box.drain();
    expect(box.reasons).toEqual(["ad"]);
    expect(box.models.at(-1)).toEqual({ mode: "skipped", metric: "ad" });
  });

  it("tells the page it is leaving for a count, not an ad, when likes are low", async () => {
    const box = harness({ skipAds: true });
    box.show(low("a"));
    await box.drain();
    expect(box.reasons).toEqual(["below"]);
  });

  it("keeps a low-like video from a followed creator, and skips it when that switch is off", async () => {
    const kept = harness();
    kept.show({ ...low("a"), platform: "tiktok", followed: true });
    await kept.drain();
    kept.flush(10000);
    expect(kept.advances).toEqual([]);
    const dropped = harness({ keepFollowed: false });
    dropped.show({ ...low("b"), platform: "tiktok", followed: true });
    await dropped.drain();
    expect(dropped.advances).toEqual(["b"]);
    expect(dropped.reasons).toEqual(["below"]);
  });

  it("does not skip ordinary videos that pass because Skip ads is on", async () => {
    const box = harness({ skipAds: true });
    box.flush(10000);
    box.show({ ...low("a"), metrics: good });
    await box.drain();
    box.flush(5000);
    expect(box.advances).toEqual([]);
  });

  it("skips a video once it turns out to be an ad shortly after it opened", async () => {
    const box = harness({ skipAds: true });
    box.flush(10000);
    box.show({ ...low("a"), metrics: good });
    await box.drain();
    expect(box.advances).toEqual([]);
    box.flush(300);
    box.show(ad("a", good));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    expect(box.reasons).toEqual(["ad"]);
  });

  it("leaves an ad alone that is only recognised after the decision window has passed", async () => {
    const box = harness({ skipAds: true });
    box.flush(10000);
    box.show({ ...low("a"), metrics: good });
    await box.drain();
    box.flush(2500);
    box.show(ad("a", good));
    await box.drain();
    expect(box.advances).toEqual([]);
  });

  it("applies the setting to the ad already on screen when it is switched on", async () => {
    const box = harness({ skipAds: false });
    box.flush(10000);
    box.show(ad("a"));
    await box.drain();
    expect(box.advances).toEqual([]);
    box.settings.skipAds = true;
    box.engine.settingsChanged();
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("restores a skipped ad on Undo and keeps it for the session", async () => {
    const box = harness({ skipAds: true });
    box.flush(10000);
    box.show(ad("a"));
    await box.drain();
    box.engine.undo();
    await box.drain();
    expect(box.retreats).toEqual(["a"]);
    box.show(ad("a"));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("counts ads and low-like videos together toward the six-skip pause", async () => {
    const box = harness({ skipAds: true });
    box.flush(10000);
    for (let index = 1; index <= 7; index += 1) {
      box.show(index % 2 ? ad("v" + index) : low("v" + index));
      await box.drain();
      if (index < 6) box.flush(450);
    }
    expect(box.advances).toEqual(["v1", "v2", "v3", "v4", "v5", "v6"]);
    expect(box.chips.at(-1)).toBe("paused");
  });

  it("stops trying to skip an ad when the page cannot move", async () => {
    const box = harness({ skipAds: true }, false);
    box.flush(10000);
    box.show(ad("a"));
    await box.drain();
    expect(box.calls).toBe(1);
    box.flush(6000);
    await box.drain();
    const calls = box.calls;
    box.engine.poke();
    await box.drain();
    expect(box.calls).toBe(calls);
    expect(box.skips).toBe(0);
  });
});

describe("engine", () => {
  it("reconsiders a mounted player at the same id and preserves its session Undo across kind changes", async () => {
    const box = harness();
    box.show({ ...low("mounted"), kind: "carousel" });
    await box.drain();
    expect(box.advances).toEqual([]);
    box.flush(500);
    box.show(low("mounted"));
    await box.drain();
    expect(box.advances).toEqual(["mounted"]);
    box.engine.undo();
    await box.drain();
    box.show({ ...low("mounted"), kind: "carousel" });
    box.show(low("mounted"));
    await box.drain();
    expect(box.advances).toEqual(["mounted"]);
    expect(box.skips).toBe(1);
  });

  it("keeps a video when metrics never arrive", async () => {
    const box = harness();
    box.show({ ...low("a"), metrics: null });
    box.flush(699);
    expect(box.advances).toEqual([]);
    box.flush(1);
    await box.drain();
    expect(box.advances).toEqual([]);
  });

  it("skips when metrics arrive during the grace period", async () => {
    const box = harness();
    box.show({ ...low("a"), metrics: null });
    box.flush(900);
    box.show(low("a"));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("still judges late counts on a freshly loaded page", async () => {
    const box = harness();
    box.show({ ...low("a"), metrics: null });
    box.flush(3300);
    box.show(low("a"));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("does not skip when counts arrive long after the video opened", async () => {
    const box = harness();
    box.flush(10000);
    box.show({ ...low("b"), metrics: null });
    box.flush(2100);
    box.show(low("b"));
    await box.drain();
    expect(box.advances).toEqual([]);
  });

  it("skips once metrics arrive", async () => {
    const box = harness();
    box.show({ ...low("a"), metrics: null });
    box.flush(200);
    box.show(low("a"));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    expect(box.chips.at(-1)).toBe("skipped");
  });

  it("keeps the skip chip after the next video stays", async () => {
    const box = harness({}, true, (show) => {
      show({
        ...low("b"),
        metrics: { views: 900000, likes: 40000, comments: 200, shares: 10, saves: null },
      });
    });
    box.show(low("a"));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    expect(box.skips).toBe(1);
    expect(box.chips.at(-1)).toBe("skipped");
    expect(box.models.at(-1)).toEqual({ mode: "skipped", metric: "likes", value: 10 });
    box.flush(2500);
    expect(box.chips.at(-1)).toBe("none");
  });

  it("pauses after six consecutive skips", async () => {
    const box = harness();
    for (let index = 1; index <= 7; index += 1) {
      box.show(low("v" + index));
      await box.drain();
      if (index < 6) box.flush(450);
    }
    expect(box.advances).toEqual(["v1", "v2", "v3", "v4", "v5", "v6"]);
    expect(box.chips.at(-1)).toBe("paused");
  });

  it("lists each skip of a row, newest first, and starts over once the chip has gone", async () => {
    const box = harness();
    box.show({ ...low("a"), metrics: { ...low("a").metrics!, likes: 41 } });
    await box.drain();
    // One skip is the plain chip, with no row.
    expect(box.models.at(-1)).toEqual({ mode: "skipped", metric: "likes", value: 41 });
    box.flush(450);
    box.show({ ...ad("b"), kind: "ad", metrics: null });
    await box.drain();
    box.flush(450);
    box.show({ ...low("c"), metrics: { ...low("c").metrics!, likes: 312 } });
    await box.drain();
    expect(box.models.at(-1)).toEqual({
      mode: "skipped", metric: "likes", value: 312,
      run: [{ metric: "likes", value: 312 }, { metric: "ad" }, { metric: "likes", value: 41 }],
    });
    // The chip goes after 2.5 s. The next skip is a row of one again.
    box.flush(2600);
    expect(box.chips.at(-1)).toBe("none");
    box.show({ ...low("d"), metrics: { ...low("d").metrics!, likes: 5 } });
    await box.drain();
    expect(box.models.at(-1)).toEqual({ mode: "skipped", metric: "likes", value: 5 });
  });

  it("shows at most three reasons of a row", async () => {
    const box = harness({ skipAds: true });
    for (let index = 1; index <= 5; index += 1) {
      box.show({ ...low("v" + index), metrics: { ...low("v" + index).metrics!, likes: index } });
      await box.drain();
      box.flush(450);
    }
    const last = box.models.at(-1) as { run?: unknown[] };
    expect(last.run).toHaveLength(3);
  });

  it("undo keeps the current video for the session", async () => {
    const box = harness();
    box.show(low("a"));
    await box.drain();
    box.engine.undo();
    await box.drain();
    expect(box.retreats).toEqual(["a"]);
    box.show(low("a"));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("commits Undo before a retreat can replace the document", async () => {
    let commit!: () => void;
    const saved: string[] = [];
    const box = harness({}, true, undefined, { rememberUndo: id => {
      saved.push(id);
      return new Promise<void>(resolve => { commit = resolve; });
    } });
    box.show(low("a"));
    await box.drain();
    box.engine.undo();
    await box.drain();
    expect(saved).toEqual(["a"]);
    expect(box.retreats).toEqual([]);
    commit();
    await box.drain();
    expect(box.retreats).toEqual(["a"]);
  });

  it("a failed session write still restores and keeps the video in this document", async () => {
    const box = harness({}, true, undefined, { rememberUndo: async () => { throw new Error("Worker unavailable"); } });
    box.show(low("a"));
    await box.drain();
    box.engine.undo();
    await box.drain();
    expect(box.retreats).toEqual(["a"]);
    box.show(low("a"));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("undo keeps the skipped id when the page already shows the next video", async () => {
    const box = harness({}, true, (show) => show(low("next")));
    box.show(low("skipped"));
    await box.drain();
    box.engine.undo();
    await box.drain();
    box.show(low("skipped"));
    await box.drain();
    expect(box.advances).toEqual(["skipped"]);
    box.flush(450);
    box.show(low("next"));
    await box.drain();
    expect(box.advances).toEqual(["skipped", "next"]);
  });

  it("applies changed settings to a video previously kept while paused", async () => {
    const box = harness({ enabled: false });
    box.show(low("a"));
    await box.drain();
    box.flush(10000);
    box.settings.enabled = true;
    box.engine.settingsChanged();
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("keep going works after the six-skip chip has waited for a decision", async () => {
    const box = harness();
    for (let index = 1; index <= 6; index += 1) {
      box.show(low("v" + index));
      await box.drain();
      box.flush(450);
    }
    box.show(low("v7"));
    box.flush(10000);
    box.engine.keepGoing();
    await box.drain();
    expect(box.advances).toHaveLength(7);
  });

  it("lowering the bar works after a long pause", async () => {
    const box = harness();
    for (let index = 1; index <= 6; index += 1) {
      box.show(low("v" + index));
      await box.drain();
      box.flush(450);
    }
    box.show({ ...low("v7"), metrics: { ...low("v7").metrics!, likes: 3000 } });
    box.flush(10000);
    box.engine.lower();
    await box.drain();
    expect(box.settings.rule.likes.min).toBe(200);
    expect(box.advances).toHaveLength(6);
    expect(box.chips.at(-1)).toBe("none");
  });

  it("keeps timely metrics usable while a comment is being written", async () => {
    const box = harness();
    box.flush(10000);
    box.setBlocked(true);
    box.show(low("a"));
    box.flush(10000);
    box.setBlocked(false);
    box.engine.poke();
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("does not advance while blocked, then skips when free", async () => {
    const box = harness();
    box.setBlocked(true);
    box.show(low("a"));
    await box.drain();
    expect(box.calls).toBe(0);
    box.setBlocked(false);
    box.engine.poke();
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("does not loop when the page cannot advance", async () => {
    const box = harness({}, false);
    box.show(low("a"));
    await box.drain();
    expect(box.calls).toBe(1);
    box.flush(400);
    await box.drain();
    box.flush(400);
    await box.drain();
    box.flush(5200);
    await box.drain();
    const calls = box.calls;
    expect(calls).toBeGreaterThan(1);
    box.engine.poke();
    await box.drain();
    box.flush(1000);
    await box.drain();
    expect(box.calls).toBe(calls);
  });
});

describe("pace between automatic moves", () => {
  it("holds the next move back for 450 ms by default", async () => {
    const box = harness();
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    box.show(low("b"));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    box.flush(449);
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    box.flush(1);
    await box.drain();
    expect(box.advances).toEqual(["a", "b"]);
  });

  it("moves straight on to the next low video when the site allows no wait", async () => {
    const box = harness({}, true, undefined, { advanceGapMs: 0 });
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    box.show(low("b"));
    await box.drain();
    expect(box.advances).toEqual(["a", "b"]);
  });

  it("judges a video that arrives while the move is still settling", async () => {
    let first = true;
    const box = harness({}, true, (show) => {
      if (!first) return;
      first = false;
      show(low("b"));
    }, { advanceGapMs: 0 });
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    expect(box.advances).toEqual(["a", "b"]);
  });

  it("still waits the default gap for a video that arrives while the move is settling", async () => {
    let first = true;
    const box = harness({}, true, (show) => {
      if (!first) return;
      first = false;
      show(low("b"));
    });
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    box.flush(450);
    await box.drain();
    expect(box.advances).toEqual(["a", "b"]);
  });

  it("keeps a good video that arrives while the move is still settling", async () => {
    let first = true;
    const box = harness({}, true, (show) => {
      if (!first) return;
      first = false;
      show({ ...low("b"), metrics: good });
    }, { advanceGapMs: 0 });
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    box.flush(10000);
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("still pauses after six skips in a row when there is no wait", async () => {
    const box = harness({}, true, undefined, { advanceGapMs: 0 });
    box.flush(10000);
    for (let index = 1; index <= 7; index += 1) {
      box.show(low("v" + index));
      await box.drain();
    }
    expect(box.advances).toEqual(["v1", "v2", "v3", "v4", "v5", "v6"]);
    expect(box.chips.at(-1)).toBe("paused");
  });
});

describe("settling before a move", () => {
  it("does not move on from a video until it has been the active one for the settle time", async () => {
    const box = harness({}, true, undefined, { advanceGapMs: 0, settleMs: 150 });
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    box.flush(149);
    await box.drain();
    expect(box.advances).toEqual([]);
    box.flush(1);
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("counts the settle time from the arrival of the video, not from the last move", async () => {
    const box = harness({}, true, undefined, { advanceGapMs: 100, settleMs: 150 });
    box.flush(10000);
    box.show(low("a"));
    box.flush(150);
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    // b arrives 80 ms after the move: the 100 ms gap is over before it has settled, the settle time is not.
    box.flush(80);
    box.show(low("b"));
    await box.drain();
    box.flush(149);
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    box.flush(1);
    await box.drain();
    expect(box.advances).toEqual(["a", "b"]);
  });

  it("leaves a video that is passed over before it has settled", async () => {
    const box = harness({}, true, undefined, { advanceGapMs: 0, settleMs: 150 });
    box.flush(10000);
    box.show(low("a"));
    box.flush(100);
    box.show({ ...low("b"), metrics: good });
    await box.drain();
    box.flush(1000);
    await box.drain();
    expect(box.advances).toEqual([]);
  });
});

describe("time on screen reported with a skip", () => {
  it("reports how long the skipped video was the active one", async () => {
    const box = harness({}, true, undefined, { advanceGapMs: 0, settleMs: 300 });
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    box.flush(300);
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    expect(box.skipMs).toEqual([300]);
  });

  it("measures the skipped video, not the next one that arrives while the site is still moving", async () => {
    const box = harness({}, true, (show) => show({ ...low("b"), metrics: good }), { advanceGapMs: 0, settleMs: 300 });
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    box.flush(300);
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    expect(box.skipMs).toEqual([300]);
  });

  it("reports each skip of a row on its own", async () => {
    const box = harness({}, true, undefined, { advanceGapMs: 0, settleMs: 200 });
    box.flush(10000);
    box.show(low("a"));
    box.flush(200);
    await box.drain();
    box.flush(50);
    box.show(low("b"));
    box.flush(200);
    await box.drain();
    expect(box.advances).toEqual(["a", "b"]);
    // Not 450: the time of one skip is not added to the next.
    expect(box.skipMs).toEqual([200, 200]);
  });
});

describe("a site that cannot move yet", () => {
  function waiting() {
    let open = false;
    const box = harness({}, true, undefined, { advanceGapMs: 0, ready: () => open });
    return { box, open: () => { open = true; } };
  }

  it("waits until the site can move, then moves within a moment", async () => {
    const { box, open } = waiting();
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    box.flush(1000);
    await box.drain();
    expect(box.advances).toEqual([]);
    open();
    box.flush(49);
    await box.drain();
    expect(box.advances).toEqual([]);
    box.flush(1);
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("gives up 5 s after the video opened when the site never can", async () => {
    const { box } = waiting();
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    box.flush(4900);
    await box.drain();
    box.flush(200);
    await box.drain();
    box.engine.poke();
    box.flush(2000);
    await box.drain();
    expect(box.calls).toBe(0);
    expect(box.chips.at(-1)).toBe("none");
  });

  it("does not move on from a video the person has already left", async () => {
    const { box, open } = waiting();
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    box.flush(500);
    box.show({ ...low("b"), metrics: good });
    await box.drain();
    open();
    box.flush(2000);
    await box.drain();
    expect(box.advances).toEqual([]);
  });

  it("does not move while the person is typing, then moves when they stop", async () => {
    const { box, open } = waiting();
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    box.setBlocked(true);
    open();
    box.flush(300);
    await box.drain();
    expect(box.advances).toEqual([]);
    box.setBlocked(false);
    box.engine.poke();
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });

  it("keeps Undo available for the last skip while the next one waits", async () => {
    let open = true;
    const box = harness({}, true, undefined, { advanceGapMs: 0, ready: () => open });
    box.flush(10000);
    box.show(low("a"));
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    open = false;
    box.show(low("b"));
    await box.drain();
    box.flush(800);
    await box.drain();
    expect(box.advances).toEqual(["a"]);
    box.engine.undo();
    await box.drain();
    expect(box.retreats).toHaveLength(1);
    open = true;
    box.flush(2000);
    await box.drain();
    expect(box.advances).toEqual(["a"]);
  });
});
