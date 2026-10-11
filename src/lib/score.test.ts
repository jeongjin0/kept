import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, PRESET_LIKES, activePreset, decide, lowerRule, normalizeSettings, presetRule, type Metrics, type Settings } from "./score";

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
    const item = metrics({ likes: 3000 });
    expect(decide({ ...base, settings: settings({ rule: presetRule("lenient") }), metrics: item }).action).toBe("keep");
    expect(decide({ ...base, settings: settings({ rule: presetRule("balanced") }), metrics: item }).action).toBe("skip");
    expect(decide({ ...base, settings: settings({ rule: presetRule("strict") }), metrics: item }).action).toBe("skip");
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
  it("keeps ads, carousels, and anything switched off", () => {
    const low = metrics({ likes: 0 });
    expect(decide({ ...base, kind: "ad", settings: settings(), metrics: low }).reason).toBe("ad");
    expect(decide({ ...base, kind: "carousel", settings: settings(), metrics: low }).reason).toBe("carousel");
    expect(decide({ ...base, settings: settings({ enabled: false }), metrics: low }).reason).toBe("disabled");
    expect(decide({ ...base, settings: settings({ platforms: { youtube: false, tiktok: true, instagram: true } }), metrics: low }).reason).toBe("disabled");
  });
  it("keeps an ad whatever its counts when Skip ads is off, which is the default", () => {
    expect(DEFAULT_SETTINGS.skipAds).toBe(false);
    for (const likes of [0, 125, 90000]) {
      expect(decide({ ...base, kind: "ad", settings: settings(), metrics: metrics({ likes }) })).toEqual({ action: "keep", reason: "ad" });
    }
    expect(decide({ ...base, kind: "ad", settings: settings(), metrics: null })).toEqual({ action: "keep", reason: "ad" });
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
    expect(lowered?.likes.min).toBe(2000);
    expect(lowerRule({ ...presetRule("balanced"), likes: { on: true, min: 5 } })).toBeNull();
  });
  it("leaves Skip ads off for settings saved before it existed and only accepts a real true", () => {
    expect(normalizeSettings(undefined).skipAds).toBe(false);
    expect(normalizeSettings({ enabled: true, rule: presetRule("strict") }).skipAds).toBe(false);
    expect(normalizeSettings({ skipAds: "yes" }).skipAds).toBe(false);
    expect(normalizeSettings({ skipAds: 1 }).skipAds).toBe(false);
    expect(normalizeSettings({ skipAds: true }).skipAds).toBe(true);
  });
  it("starts from the balanced preset and reads old settings", () => {
    expect(normalizeSettings(undefined).rule).toEqual(presetRule("balanced"));
    expect(normalizeSettings({ sensitivity: "strict" }).rule).toEqual(presetRule("strict"));
    expect(normalizeSettings({ rule: { likes: { on: true, min: -4 } } }).rule.likes.min).toBe(PRESET_LIKES.balanced);
  });
});

