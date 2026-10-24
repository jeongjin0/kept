import { decide, lowerRule, type Decision, type ItemKind, type Metric, type Metrics, type Platform, type Rule, type Settings, type Surface } from "../lib/score";

export interface EngineItem {
  id: string;
  platform: Platform;
  surface: Surface;
  creatorId: string | null;
  metrics: Metrics | null;
  kind: ItemKind;
  followed?: boolean | null;
}

// Why one video was skipped: a count that was under its minimum, or an ad.
export type ChipReason = { metric: Metric; value: number } | { metric: "ad" };

// run is every skip of the current row of skips, newest first, and is there only when the row has more than one.
export type ChipModel =
  | ({ mode: "skipped"; run?: ChipReason[] } & ChipReason)
  | { mode: "paused"; canLower: boolean };

// A row of skips shows at most this many reasons.
const RUN_SHOWN = 3;

// Why ScrollPlus is moving on: a count under its minimum, or an ad with Skip ads on.
export type SkipReason = "below" | "ad";

export interface PlaybackState {
  revision: string;
  inFeed: boolean;
  paused: boolean;
  canLower: boolean;
  canUndo: boolean;
  busy: boolean;
}

export interface EngineDeps {
  getSettings: () => Settings;
  now: () => number;
  advance: (reason: SkipReason) => Promise<boolean>;
  retreat: () => Promise<boolean>;
  // A skip went through. onScreenMs: how long the skipped video was the active one, from the moment it was first seen to the moment the
  // site had moved on from it.
  onSkipped: (onScreenMs: number) => void;
  setRule: (next: Rule) => void;
  isBlocked: () => boolean;
  render: (chip: ChipModel | null) => void;
  schedule: (fn: () => void, ms: number) => number;
  cancel: (id: number) => void;
  sessionKeep?: Set<string>;
  rememberUndo?: (id: string) => Promise<void>;
  // Shortest wait between two automatic moves. Defaults to ADVANCE_GAP_MS.
  advanceGapMs?: number;
  // Shortest time a video is the active one before ScrollPlus moves on from it. Defaults to none.
  settleMs?: number;
  // False while the site cannot move yet, for example while TikTok has no next video and keeps its next control disabled. A press
  // then does nothing and the wait for its move would take 1.8 s, so the engine looks again every 50 ms instead.
  ready?: () => boolean;
}

const METRIC_WAIT_MS = 700;
const METRIC_GRACE_MS = 2000;
const STARTUP_GRACE_MS = 6000;
const ADVANCE_GAP_MS = 450;
const CHIP_HOLD_MS = 2500;
const SKIP_CAP = 6;
const RETRY_GAP_MS = 400;
const RETRY_FOR_MS = 5000;
const READY_POLL_MS = 50;

export function createEngine(deps: EngineDeps) {
  const bornAt = deps.now();
  const advanceGapMs = deps.advanceGapMs ?? ADVANCE_GAP_MS;
  const settleMs = deps.settleMs ?? 0;
  let current: EngineItem | null = null;
  let waitTimer: number | null = null;
  let chipTimer: number | null = null;
  let gapTimer: number | null = null;
  let consecutive = 0;
  let paused = false;
  let advancing = false;
  let suspended = false;
  let activityRevision = 0;
  let runRevision = 0;
  let lastSkippedId: string | null = null;
  let undoFromId: string | null = null;
  let itemRevision = 0;
  let noticeEngaged = false;
  let chipDeadline = 0;
  let chipRemaining = 0;
  // The reasons of the skips that follow each other while one chip is up, newest first.
  let runReasons: ChipReason[] = [];
  let metricsReady = false;
  let skipQueuedFor: string | null = null;
  const sessionKeep = deps.sessionKeep ?? new Set<string>();
  const finished = new Set<string>();
  let lastAdvanceAt = Number.NEGATIVE_INFINITY;
  let seenAt = Number.NEGATIVE_INFINITY;

  function judge(item: EngineItem): Decision {
    return decide({
      settings: deps.getSettings(),
      platform: item.platform,
      surface: item.surface,
      creatorId: item.creatorId,
      metrics: item.metrics,
      kind: item.kind,
      followed: item.followed,
    });
  }

  // Counts may arrive late on a freshly loaded page, so the first video gets a longer window.
  function graceEnd(): number {
    return Math.max(seenAt + METRIC_GRACE_MS, bornAt + STARTUP_GRACE_MS);
  }

  function clearWait() {
    if (waitTimer != null) deps.cancel(waitTimer);
    waitTimer = null;
  }

  function clearGap() {
    if (gapTimer != null) deps.cancel(gapTimer);
    gapTimer = null;
    skipQueuedFor = null;
  }

  function clearChip() {
    if (chipTimer != null) deps.cancel(chipTimer);
    chipTimer = null;
    chipRemaining = 0;
    runReasons = [];
    deps.render(null);
  }

  function resetRun() {
    runRevision++;
    paused = false;
    consecutive = 0;
    clearChip();
  }

  function resumeCurrent() {
    activityRevision++;
    clearWait();
    clearGap();
    resetRun();
    if (!current) return;
    finished.delete(current.id);
    seenAt = deps.now();
    metricsReady = false;
    evaluate(current);
  }

  function showSkipped(decision: Decision) {
    if (chipTimer != null) deps.cancel(chipTimer);
    chipTimer = null;
    if (!deps.getSettings().showSkipChip || decision.action !== "skip") {
      deps.render(null);
      return;
    }
    const reason: ChipReason = decision.reason === "ad" ? { metric: "ad" } : { metric: decision.metric, value: decision.value };
    runReasons.unshift(reason);
    if (runReasons.length > RUN_SHOWN) runReasons.length = RUN_SHOWN;
    deps.render({ mode: "skipped", ...reason, ...(runReasons.length > 1 ? { run: [...runReasons] } : {}) });
    chipRemaining = CHIP_HOLD_MS;
    armChip();
  }

  function armChip() {
    if (noticeEngaged || !chipRemaining) return;
    chipDeadline = deps.now() + chipRemaining;
    chipTimer = deps.schedule(() => {
      chipTimer = null;
      chipRemaining = 0;
      runReasons = [];
      if (!paused) deps.render(null);
    }, chipRemaining);
  }

  function showPaused() {
    deps.render({ mode: "paused", canLower: lowerRule(deps.getSettings().rule) != null });
  }

  async function performSkip(item: EngineItem) {
    if (item.id !== current?.id || sessionKeep.has(item.id) || finished.has(item.id)) return;
    if (advancing || paused || suspended) return;
    if (deps.isBlocked()) return;
    const decision = judge(current);
    if (decision.action !== "skip") return;
    const now = deps.now();
    // The next video can arrive while the site is still moving, and then seenAt is already its own.
    const shownAt = seenAt;
    const gap = Math.max(advanceGapMs - (now - lastAdvanceAt), settleMs - (now - seenAt));
    if (gap > 0) {
      if (skipQueuedFor === item.id) return;
      skipQueuedFor = item.id;
      if (gapTimer != null) deps.cancel(gapTimer);
      gapTimer = deps.schedule(() => {
        gapTimer = null;
        skipQueuedFor = null;
        void performSkip(item);
      }, gap);
      return;
    }
    if (deps.ready && !deps.ready()) {
      if (now - seenAt >= RETRY_FOR_MS) {
        finished.add(item.id);
        resetRun();
        return;
      }
      if (skipQueuedFor === item.id) return;
      skipQueuedFor = item.id;
      if (gapTimer != null) deps.cancel(gapTimer);
      gapTimer = deps.schedule(() => {
        gapTimer = null;
        skipQueuedFor = null;
        void performSkip(item);
      }, READY_POLL_MS);
      return;
    }
    advancing = true;
    const startedAtItem = itemRevision;
    const revision = activityRevision;
    const run = runRevision;
    let moved = false;
    try {
      moved = await deps.advance(decision.reason);
    } catch {
      moved = false;
    } finally {
      advancing = false;
    }
    if (!moved) {
      if (revision !== activityRevision) {
        if (current) evaluate(current);
        return;
      }
      if (current?.id !== item.id) return;
      if (deps.now() - seenAt >= RETRY_FOR_MS) {
        finished.add(item.id);
        resetRun();
        return;
      }
      if (gapTimer != null) deps.cancel(gapTimer);
      gapTimer = deps.schedule(() => {
        gapTimer = null;
        void performSkip(item);
      }, RETRY_GAP_MS);
      return;
    }
    finished.add(item.id);
    lastSkippedId = itemRevision - startedAtItem <= 1 ? item.id : null;
    undoFromId = lastSkippedId ? current?.id ?? null : null;
    lastAdvanceAt = deps.now();
    deps.onSkipped(Math.max(0, lastAdvanceAt - shownAt));
    // Visibility suspends a run rather than ending it: an already-issued sixth
    // move must still reach the safety cap, even if its notification is hidden.
    if (run === runRevision) {
      consecutive += 1;
      if (consecutive >= SKIP_CAP) paused = true;
    }
    // A move already sent to the site can finish after disable, navigation or a
    // tab switch. Count the real move, but never bring back the old run or chip.
    if (revision !== activityRevision) {
      if (current) evaluate(current);
      return;
    }
    if (paused) {
      showPaused();
      return;
    }
    showSkipped(decision);
    // The next video may have arrived while this move was still settling. Judge it now instead of at the next poll.
    if (current && current.id !== item.id) evaluate(current);
  }

  function evaluate(item: EngineItem) {
    if (item.id !== current?.id || sessionKeep.has(item.id) || finished.has(item.id)) return;
    if (advancing || suspended) return;
    const decision = judge(item);
    if (decision.action === "keep") {
      const waiting = decision.reason === "no-metrics" || decision.reason === "unscored";
      if (waiting && deps.now() < graceEnd()) return;
      finished.add(item.id);
      consecutive = 0;
      paused = false;
      runReasons = [];
      if (chipTimer == null) deps.render(null);
      return;
    }
    if (!metricsReady && deps.now() >= graceEnd()) {
      finished.add(item.id);
      resetRun();
      return;
    }
    metricsReady = true;
    if (paused) {
      showPaused();
      return;
    }
    void performSkip(item);
  }

  function armWait(item: EngineItem) {
    if (waitTimer != null) return;
    waitTimer = deps.schedule(() => {
      waitTimer = null;
      if (current?.id === item.id && current.metrics == null) evaluate(current);
    }, METRIC_WAIT_MS);
  }

  return {
    getState(): PlaybackState {
      return {
        revision: [activityRevision, itemRevision, lastAdvanceAt, Number(advancing), Number(paused)].join(":"),
        inFeed: current != null,
        paused: paused && !suspended,
        canLower: paused && !advancing && !suspended && lowerRule(deps.getSettings().rule) != null,
        canUndo: lastSkippedId != null && current != null && !advancing && !suspended,
        busy: advancing,
      };
    },
    setNoticeEngaged(engaged: boolean) {
      if (noticeEngaged === engaged) return;
      noticeEngaged = engaged;
      if (engaged && chipTimer != null) {
        chipRemaining = Math.max(0, chipDeadline - deps.now());
        deps.cancel(chipTimer);
        chipTimer = null;
      } else if (!engaged && chipRemaining && !paused) {
        chipRemaining = Math.max(1000, chipRemaining);
        armChip();
      }
    },
    appearanceChanged() {
      if (paused) showPaused();
      else clearChip();
    },
    onItem(item: EngineItem) {
      const changed = current?.id !== item.id;
      if (changed) {
        itemRevision++;
        if (lastSkippedId && current && undoFromId === current.id && current.id === lastSkippedId) undoFromId = item.id;
        else if (item.id !== undoFromId) { lastSkippedId = null; undoFromId = null; }
      }
      // A player can mount after its URL/counts, or replace a non-video card.
      // Reconsider that observation without clearing a user's session Undo.
      if (!changed && current && (current.kind !== item.kind || (item.followed === true && current.followed !== true))) finished.delete(item.id);
      current = item;
      if (changed) {
        seenAt = deps.now();
        metricsReady = false;
        clearGap();
      }
      if (sessionKeep.has(item.id)) {
        clearWait();
        clearGap();
        // Do this once on arrival, rather than invalidating a pending move on every poll.
        if (changed) activityRevision++;
        resetRun();
        return;
      }
      if (changed) clearWait();
      if (finished.has(item.id)) {
        // A revisited video stays, so it also ends a run of automatic skips.
        if (changed) resetRun();
        return;
      }
      // An ad needs no counts, so it is judged as soon as it is known to be one.
      if (item.surface === "player" && item.metrics == null && item.kind !== "ad") {
        armWait(item);
        return;
      }
      clearWait();
      evaluate(item);
    },
    poke() {
      if (!current || finished.has(current.id) || sessionKeep.has(current.id)) return;
      if (current.metrics == null && waitTimer != null) return;
      evaluate(current);
    },
    async undo(): Promise<boolean> {
      if (!lastSkippedId || !current || advancing || suspended) return false;
      const id = lastSkippedId;
      const fromId = current.id;
      const fromRevision = itemRevision;
      sessionKeep.add(id);
      finished.delete(id);
      lastSkippedId = null;
      undoFromId = null;
      activityRevision++;
      clearWait();
      clearGap();
      if (chipTimer != null) deps.cancel(chipTimer);
      chipTimer = null;
      chipRemaining = 0;
      runReasons = [];
      consecutive = Math.max(0, consecutive - 1);
      paused = false;
      deps.render(null);
      advancing = true;
      // Commit the memory-only choice before a site retreat can replace this document.
      try {
        await (deps.rememberUndo?.(id) ?? Promise.resolve()).catch(() => {});
        const moved = await deps.retreat();
        if (!moved && current?.id === fromId && itemRevision === fromRevision) { lastSkippedId = id; undoFromId = fromId; }
        return moved;
      } catch {
        if (current?.id === fromId && itemRevision === fromRevision) { lastSkippedId = id; undoFromId = fromId; }
        return false;
      }
      finally { advancing = false; }
    },
    keepGoing() {
      resumeCurrent();
    },
    lower() {
      const next = lowerRule(deps.getSettings().rule);
      if (!next) return;
      deps.setRule(next);
      resumeCurrent();
    },
    settingsChanged() {
      finished.clear();
      resumeCurrent();
    },
    onInactive() {
      activityRevision++;
      current = null;
      lastSkippedId = null;
      undoFromId = null;
      clearWait();
      clearGap();
      resetRun();
    },
    setVisible(visible: boolean) {
      if (suspended === !visible) return;
      suspended = !visible;
      activityRevision++;
      clearWait();
      clearGap();
      clearChip();
      // Preserve the six-skip safety pause across tab switches. The next visible
      // observation gets a fresh grace period for counts that arrived while away.
      if (visible) {
        seenAt = deps.now();
        metricsReady = false;
        if (paused) showPaused();
      }
    },
    keepCurrent() {
      if (!current) return;
      activityRevision++;
      sessionKeep.add(current.id);
      finished.add(current.id);
      clearWait();
      clearGap();
      resetRun();
    },
  };
}
