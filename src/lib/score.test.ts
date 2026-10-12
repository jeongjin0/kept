import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, PRESET_LIKES, activePreset, decide, lowerRule, migrateSettings, normalizeSettings, presetRule, type Metrics, type Settings } from "./score";

function metrics(partial: Partial<Metrics>): Metrics {
  return { views: null, likes: null, comments: null, shares: null, saves: null, ...partial };
}

function settings(partial: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, platforms: { ...DEFAULT_SETTINGS.platforms }, rule: presetRule("balanced"), allowlist: [], ...partial };
}

const base = { platform: "youtube" as const, surface: "player" as const, creatorId: "channel", kind: "video" as const };

describe("decide", () => {
  it("skips when likes are under the minimum and says why", () => {
    expect(decide({ ...base, settings: settings(), metrics: metrics({ views: 90000, likes: 312 }) })).toEqual({ action: "skip", reason: "below", metric: "likes", value: 312, min: PRESET_LIKES.balanced });
  });
  it("keeps a video at exactly the minimum", () => {
    expect(decide({ ...base, settings: settings(), metrics: metrics({ likes: PRESET_LIKES.balanced }) })).toEqual({ action: "keep", reason: "passes" });
  });
  it("judges a brand-new video by the same rule", () => {
    expect(decide({ ...base, settings: settings(), metrics: metrics({ views: 40, likes: 3 }) }).action).toBe("skip");
  });
  it("keeps when the like count is missing", () => {
    expect(decide({ ...base, settings: settings(), metrics: metrics({ views: 90000 }) })).toEqual({ action: "keep", reason: "unscored" });
  });
  it("keeps when metrics are missing entirely", () => {
    expect(decide({ ...base, settings: settings(), metrics: null })).toEqual({ action: "keep", reason: "no-metrics" });
  });
  it("applies each preset", () => {
    const weak = metrics({ likes: 300 });
    expect(decide({ ...base, settings: settings({ rule: presetRule("lenient") }), metrics: weak }).action).toBe("keep");
    expect(decide({ ...base, settings: settings({ rule: presetRule("balanced") }), metrics: weak }).action).toBe("skip");
    expect(decide({ ...base, settings: settings({ rule: presetRule("strict") }), metrics: weak }).action).toBe("skip");
    const middling = metrics({ likes: 700 });
    expect(decide({ ...base, settings: settings({ rule: presetRule("balanced") }), metrics: middling }).action).toBe("keep");
    expect(decide({ ...base, settings: settings({ rule: presetRule("strict") }), metrics: middling }).action).toBe("skip");
    expect(decide({ ...base, settings: settings({ rule: presetRule("strict") }), metrics: metrics({ likes: 1000 }) }).action).toBe("keep");
  });
  it("skips when any enabled rule falls short", () => {
    const rule = presetRule("lenient");
    rule.comments = { on: true, min: 100 };
    const decision = decide({ ...base, settings: settings({ rule }), metrics: metrics({ likes: 50000, comments: 12 }) });
    expect(decision).toMatchObject({ action: "skip", metric: "comments", value: 12 });
  });
  it("ignores a rule whose count the page does not show", () => {
    const rule = presetRule("lenient");
    rule.comments = { on: true, min: 100 };
    expect(decide({ ...base, settings: settings({ rule }), metrics: metrics({ likes: 50000, comments: null }) }).action).toBe("keep");
  });
  it("checks views as a minimum too", () => {
    const rule = presetRule("lenient");
    rule.views = { on: true, min: 100000 };
    expect(decide({ ...base, settings: settings({ rule }), metrics: metrics({ likes: 4000, views: 20000 }) })).toMatchObject({ action: "skip", metric: "views" });
  });
  it("does nothing when every rule is off", () => {
    const rule = presetRule("balanced");
    rule.likes = { ...rule.likes, on: false };
    expect(decide({ ...base, settings: settings({ rule }), metrics: metrics({ likes: 0 }) }).action).toBe("keep");
  });
  it("keeps allowlisted creators and matches instagram names without case", () => {
    const low = metrics({ likes: 0 });
    expect(decide({ ...base, settings: settings({ allowlist: [{ platform: "youtube", id: "channel" }] }), metrics: low })).toEqual({ action: "keep", reason: "allowlist" });
    expect(decide({ ...base, platform: "instagram", creatorId: "Some.User", settings: settings({ allowlist: [{ platform: "instagram", id: "some.user" }] }), metrics: low }).action).toBe("keep");
  });
  it("keeps ads when Skip ads is off, and carousels and anything switched off", () => {
    const low = metrics({ likes: 0 });
    expect(decide({ ...base, kind: "ad", settings: settings({ skipAds: false }), metrics: low })).toEqual({ action: "keep", reason: "ad" });
    expect(decide({ ...base, kind: "carousel", settings: settings(), metrics: low }).reason).toBe("carousel");
    expect(decide({ ...base, settings: settings({ enabled: false }), metrics: low }).reason).toBe("disabled");
    expect(decide({ ...base, settings: settings({ platforms: { youtube: false, tiktok: true, instagram: true } }), metrics: low }).reason).toBe("disabled");
  });
  it("keeps an ad whatever its counts when Skip ads is switched off", () => {
    const off = settings({ skipAds: false });
    for (const likes of [0, 125, 90000]) {
      expect(decide({ ...base, kind: "ad", settings: off, metrics: metrics({ likes }) })).toEqual({ action: "keep", reason: "ad" });
    }
    expect(decide({ ...base, kind: "ad", settings: off, metrics: null })).toEqual({ action: "keep", reason: "ad" });
  });
  it("skips an ad out of the box, because Skip ads is on by default", () => {
    expect(DEFAULT_SETTINGS.skipAds).toBe(true);
    expect(decide({ ...base, kind: "ad", settings: settings(), metrics: metrics({ likes: 125 }) })).toEqual({ action: "skip", reason: "ad" });
  });
  it("skips an ad when Skip ads is on, with or without counts, and says it was an ad", () => {
    const on = settings({ skipAds: true });
    expect(decide({ ...base, kind: "ad", settings: on, metrics: metrics({ likes: 90000 }) })).toEqual({ action: "skip", reason: "ad" });
    expect(decide({ ...base, kind: "ad", settings: on, metrics: null })).toEqual({ action: "skip", reason: "ad" });
  });
  it("does not let Skip ads touch videos, carousels or cards in lists", () => {
    const on = settings({ skipAds: true });
    expect(decide({ ...base, settings: on, metrics: metrics({ likes: 90000 }) })).toEqual({ action: "keep", reason: "passes" });
    expect(decide({ ...base, kind: "carousel", settings: on, metrics: metrics({ likes: 0 }) }).reason).toBe("carousel");
    expect(decide({ ...base, kind: "ad", surface: "grid", settings: settings({ skipAds: true, filterGrids: true }), metrics: metrics({ likes: 0 }) })).toEqual({ action: "keep", reason: "ad" });
  });
  it("keeps ads on a site that is off, when the master switch is off, and for a creator the user kept", () => {
    const ad = { ...base, kind: "ad" as const, metrics: null };
    expect(decide({ ...ad, settings: settings({ skipAds: true, enabled: false }) }).reason).toBe("disabled");
    expect(decide({ ...ad, settings: settings({ skipAds: true, platforms: { youtube: false, tiktok: true, instagram: true } }) }).reason).toBe("disabled");
    expect(decide({ ...ad, settings: settings({ skipAds: true, allowlist: [{ platform: "youtube", id: "channel" }] }) }).reason).toBe("allowlist");
  });
  it("leaves grids alone unless asked", () => {
    const low = metrics({ likes: 0 });
    expect(decide({ ...base, surface: "grid", settings: settings(), metrics: low }).reason).toBe("grid-off");
    expect(decide({ ...base, surface: "grid", settings: settings({ filterGrids: true }), metrics: low }).action).toBe("skip");
  });
  it("keeps a creator the viewer follows, and still skips their ads", () => {
    const low = metrics({ likes: 0 });
    const followed = { ...base, platform: "tiktok" as const, followed: true as const };
    expect(DEFAULT_SETTINGS.keepFollowed).toBe(true);
    expect(decide({ ...followed, settings: settings(), metrics: low })).toEqual({ action: "keep", reason: "followed" });
    expect(decide({ ...followed, settings: settings(), metrics: null })).toEqual({ action: "keep", reason: "followed" });
    expect(decide({ ...followed, surface: "grid", settings: settings({ filterGrids: true }), metrics: low })).toEqual({ action: "keep", reason: "followed" });
    expect(decide({ ...base, platform: "tiktok", followed: false, settings: settings(), metrics: low })).toMatchObject({ action: "skip", reason: "below" });
    expect(decide({ ...base, platform: "tiktok", followed: null, settings: settings(), metrics: low })).toMatchObject({ action: "skip", reason: "below" });
    expect(decide({ ...followed, settings: settings({ keepFollowed: false }), metrics: low })).toMatchObject({ action: "skip", reason: "below" });
    expect(decide({ ...followed, kind: "ad", settings: settings(), metrics: low })).toEqual({ action: "skip", reason: "ad" });
    expect(decide({ ...followed, settings: settings({ enabled: false }), metrics: low }).reason).toBe("disabled");
    expect(decide({ ...followed, settings: settings({ allowlist: [{ platform: "tiktok", id: "channel" }] }), metrics: low }).reason).toBe("allowlist");
  });
});

describe("presets and settings", () => {
  it("recognises a preset and calls anything else custom", () => {
    expect(activePreset(presetRule("strict"))).toBe("strict");
    const custom = presetRule("balanced");
    custom.likes = { on: true, min: 700 };
    expect(activePreset(custom)).toBeNull();
    const extra = presetRule("balanced");
    extra.views = { ...extra.views, on: true };
    expect(activePreset(extra)).toBeNull();
  });
  it("keeps the spare numbers when a preset is chosen", () => {
    const custom = presetRule("balanced");
    custom.comments = { on: true, min: 300 };
    expect(presetRule("strict", custom).comments).toEqual({ on: false, min: 300 });
  });
  it("lowers every active rule one step and stops at the floor", () => {
    const lowered = lowerRule(presetRule("balanced"));
    expect(lowered?.likes.min).toBe(200);
    expect(lowerRule({ ...presetRule("balanced"), likes: { on: true, min: 5 } })).toBeNull();
  });
  it("has Skip ads on unless the settings say false, and only a real false turns it off", () => {
    expect(normalizeSettings(undefined).skipAds).toBe(true);
    expect(normalizeSettings({ enabled: true, rule: presetRule("strict") }).skipAds).toBe(true);
    expect(normalizeSettings({ skipAds: "no" }).skipAds).toBe(true);
    expect(normalizeSettings({ skipAds: 0 }).skipAds).toBe(true);
    expect(normalizeSettings({ skipAds: true }).skipAds).toBe(true);
    expect(normalizeSettings({ skipAds: false }).skipAds).toBe(false);
  });
  it("keeps followed accounts unless the settings say false", () => {
    expect(normalizeSettings(undefined).keepFollowed).toBe(true);
    expect(normalizeSettings({ keepFollowed: false }).keepFollowed).toBe(false);
    expect(normalizeSettings({ keepFollowed: "no" }).keepFollowed).toBe(true);
    expect(normalizeSettings({ keepFollowed: 0 }).keepFollowed).toBe(true);
  });
  it("places the skip chip at the top unless the settings say otherwise", () => {
    expect(DEFAULT_SETTINGS.chipPosition).toBe("top");
    expect(normalizeSettings(undefined).chipPosition).toBe("top");
    expect(normalizeSettings({ chipPosition: "middle" }).chipPosition).toBe("middle");
    expect(normalizeSettings({ chipPosition: "lower" }).chipPosition).toBe("lower");
    expect(normalizeSettings({ chipPosition: "bottom" }).chipPosition).toBe("top");
    expect(normalizeSettings({ chipPosition: 3 }).chipPosition).toBe("top");
  });
  it("starts from the balanced preset and reads old settings", () => {
    expect(normalizeSettings(undefined).rule).toEqual(presetRule("balanced"));
    expect(normalizeSettings({ sensitivity: "strict" }).rule).toEqual(presetRule("strict"));
    expect(normalizeSettings({ rule: { likes: { on: true, min: -4 } } }).rule.likes.min).toBe(PRESET_LIKES.balanced);
  });
});


describe("the presets are 100, 500 and 1,000 likes", () => {
  it("names the three levels by their like counts", () => {
    expect(PRESET_LIKES).toEqual({ lenient: 100, balanced: 500, strict: 1000 });
    expect(DEFAULT_SETTINGS.rule).toEqual(presetRule("balanced"));
    expect(DEFAULT_SETTINGS.rule.likes).toEqual({ on: true, min: 500 });
    expect(activePreset({ ...presetRule("balanced"), likes: { on: true, min: 100 } })).toBe("lenient");
    expect(activePreset({ ...presetRule("balanced"), likes: { on: true, min: 1000 } })).toBe("strict");
    // 5,000 was Balanced before 0.5.0. It is a number of the person's own now.
    expect(activePreset({ ...presetRule("balanced"), likes: { on: true, min: 5000 } })).toBeNull();
  });
});

describe("moving settings from 0.4.x to the 0.5.0 scale", () => {
  const old = (likes: number, extra: Record<string, unknown> = {}) => ({
    enabled: true,
    rule: { likes: { on: true, min: likes }, comments: { on: false, min: 100 }, views: { on: false, min: 100000 } },
    platforms: { youtube: true, tiktok: true, instagram: true },
    filterGrids: false,
    showSkipChip: true,
    skipAds: false,
    allowlist: [],
    ...extra,
  });

  it("keeps the preset a person had, so each name stays what it was", () => {
    expect(activePreset(migrateSettings(old(1000)).rule)).toBe("lenient");
    expect(activePreset(migrateSettings(old(5000)).rule)).toBe("balanced");
    expect(activePreset(migrateSettings(old(20000)).rule)).toBe("strict");
    expect(migrateSettings(old(1000)).rule.likes.min).toBe(100);
    expect(migrateSettings(old(5000)).rule.likes.min).toBe(500);
    expect(migrateSettings(old(20000)).rule.likes.min).toBe(1000);
  });
  it("keeps the spare minimums of comments and views when it moves a preset", () => {
    const moved = migrateSettings(old(5000, { rule: { likes: { on: true, min: 5000 }, comments: { on: false, min: 300 }, views: { on: false, min: 250000 } } })).rule;
    expect(moved).toEqual({ likes: { on: true, min: 500 }, comments: { on: false, min: 300 }, views: { on: false, min: 250000 } });
  });
  it("leaves a rule of the person's own as it is", () => {
    expect(migrateSettings(old(3000)).rule.likes).toEqual({ on: true, min: 3000 });
    expect(migrateSettings(old(700)).rule.likes).toEqual({ on: true, min: 700 });
    const withComments = migrateSettings(old(5000, { rule: { likes: { on: true, min: 5000 }, comments: { on: true, min: 100 }, views: { on: false, min: 100000 } } })).rule;
    expect(withComments.likes.min).toBe(5000);
    const likesOff = migrateSettings(old(5000, { rule: { likes: { on: false, min: 5000 }, comments: { on: true, min: 50 }, views: { on: false, min: 100000 } } })).rule;
    expect(likesOff.likes).toEqual({ on: false, min: 5000 });
  });
  it("turns Skip ads on once, and keeps everything else", () => {
    const moved = migrateSettings(old(5000, { enabled: false, filterGrids: true, showSkipChip: false, platforms: { youtube: true, tiktok: false, instagram: true }, allowlist: [{ platform: "youtube", id: "kept-creator" }] }));
    expect(moved.skipAds).toBe(true);
    expect(moved.enabled).toBe(false);
    expect(moved.filterGrids).toBe(true);
    expect(moved.showSkipChip).toBe(false);
    expect(moved.platforms).toEqual({ youtube: true, tiktok: false, instagram: true });
    expect(moved.allowlist).toEqual([{ platform: "youtube", id: "kept-creator" }]);
    expect(moved.chipPosition).toBe("top");
    expect(moved.keepFollowed).toBe(true);
  });
  it("reads settings from the first versions and anything unreadable as the defaults", () => {
    expect(migrateSettings({ sensitivity: "strict" }).rule).toEqual(presetRule("strict"));
    expect(migrateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings("broken")).toEqual(DEFAULT_SETTINGS);
  });
});
