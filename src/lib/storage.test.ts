import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, SCHEMA_VERSION, STORAGE_DAILY, STORAGE_SCHEMA, STORAGE_SETTINGS, STORAGE_TOTALS, localDay, presetRule } from "./score";
import { ensureInstalledState, readTotals, recordSkip } from "./storage";

let data: Record<string, unknown> = {};

beforeEach(() => {
  data = {};
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: async (keys: string | string[]) => {
          const list = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(list.filter((key) => key in data).map((key) => [key, structuredClone(data[key])]));
        },
        set: async (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) data[key] = structuredClone(value);
        },
      },
    },
  });
});

afterEach(() => vi.unstubAllGlobals());

const v044 = (likes: number, extra: Record<string, unknown> = {}) => ({
  enabled: true,
  rule: { likes: { on: true, min: likes }, comments: { on: false, min: 100 }, views: { on: false, min: 100000 } },
  platforms: { youtube: true, tiktok: true, instagram: true },
  filterGrids: false,
  showSkipChip: true,
  skipAds: false,
  allowlist: [],
  ...extra,
});

describe("installing and updating", () => {
  it("writes the defaults, the schema marker and empty counts on a fresh install", async () => {
    await ensureInstalledState();
    expect(data[STORAGE_SETTINGS]).toEqual(DEFAULT_SETTINGS);
    expect(data[STORAGE_SCHEMA]).toBe(SCHEMA_VERSION);
    expect(data[STORAGE_DAILY]).toEqual({ day: localDay(), count: 0 });
    expect(data[STORAGE_TOTALS]).toEqual({ since: localDay(), count: 0, onScreenMs: 0 });
  });

  it("moves the settings of a 0.4.4 install to the new scale, once", async () => {
    data[STORAGE_SETTINGS] = v044(5000, { allowlist: [{ platform: "youtube", id: "kept" }] });
    data[STORAGE_DAILY] = { day: localDay(), count: 18 };
    await ensureInstalledState();
    const moved = data[STORAGE_SETTINGS] as typeof DEFAULT_SETTINGS;
    expect(moved.rule).toEqual(presetRule("balanced"));
    expect(moved.rule.likes.min).toBe(500);
    expect(moved.skipAds).toBe(true);
    expect(moved.allowlist).toEqual([{ platform: "youtube", id: "kept" }]);
    expect(data[STORAGE_SCHEMA]).toBe(SCHEMA_VERSION);
    // Today's count survives, and the totals start now.
    expect(data[STORAGE_DAILY]).toEqual({ day: localDay(), count: 18 });
    expect(data[STORAGE_TOTALS]).toEqual({ since: localDay(), count: 0, onScreenMs: 0 });
  });

  it("does not move the settings a second time, so a Strict chosen later stays Strict", async () => {
    data[STORAGE_SETTINGS] = v044(1000);
    await ensureInstalledState();
    expect((data[STORAGE_SETTINGS] as typeof DEFAULT_SETTINGS).rule.likes.min).toBe(100);
    // The person picks Strict (1,000 likes, which was Lenient on the old scale) and turns Skip ads off.
    data[STORAGE_SETTINGS] = { ...(data[STORAGE_SETTINGS] as object), rule: presetRule("strict"), skipAds: false };
    await ensureInstalledState();
    await ensureInstalledState();
    const kept = data[STORAGE_SETTINGS] as typeof DEFAULT_SETTINGS;
    expect(kept.rule.likes.min).toBe(1000);
    expect(kept.skipAds).toBe(false);
  });

  it("leaves a rule of the person's own alone and still turns Skip ads on once", async () => {
    data[STORAGE_SETTINGS] = v044(3000);
    await ensureInstalledState();
    const moved = data[STORAGE_SETTINGS] as typeof DEFAULT_SETTINGS;
    expect(moved.rule.likes.min).toBe(3000);
    expect(moved.skipAds).toBe(true);
  });
});

describe("updating from 0.6.x", () => {
  it("moves the chip from the top to the side once, and leaves the rest as it is", async () => {
    data[STORAGE_SCHEMA] = 2;
    data[STORAGE_SETTINGS] = { ...DEFAULT_SETTINGS, rule: presetRule("strict"), skipAds: false, chipPosition: "top" };
    await ensureInstalledState();
    const moved = data[STORAGE_SETTINGS] as typeof DEFAULT_SETTINGS;
    expect(moved.chipPosition).toBe("side");
    expect(moved.rule.likes.min).toBe(1000);
    expect(moved.skipAds).toBe(false);
    expect(data[STORAGE_SCHEMA]).toBe(SCHEMA_VERSION);
    // Chosen again afterwards, it stays.
    data[STORAGE_SETTINGS] = { ...moved, chipPosition: "top" };
    await ensureInstalledState();
    expect((data[STORAGE_SETTINGS] as typeof DEFAULT_SETTINGS).chipPosition).toBe("top");
  });
});

describe("counting skips", () => {
  it("adds one skip to today and to the total, with the time the video was on screen", async () => {
    await ensureInstalledState();
    await recordSkip(400);
    await recordSkip(600);
    expect(data[STORAGE_DAILY]).toEqual({ day: localDay(), count: 2 });
    expect(data[STORAGE_TOTALS]).toEqual({ since: localDay(), count: 2, onScreenMs: 1000 });
    expect(await readTotals()).toEqual({ since: localDay(), count: 2, onScreenMs: 1000 });
  });

  it("starts today's count over on a new day and keeps the total going", async () => {
    data[STORAGE_DAILY] = { day: "2000-01-01", count: 91 };
    data[STORAGE_TOTALS] = { since: "2000-01-01", count: 500, onScreenMs: 200000 };
    await recordSkip(500);
    expect(data[STORAGE_DAILY]).toEqual({ day: localDay(), count: 1 });
    expect(data[STORAGE_TOTALS]).toEqual({ since: "2000-01-01", count: 501, onScreenMs: 200500 });
  });

  it("counts a skip whose time is missing, as one that saved nothing", async () => {
    await recordSkip(undefined);
    expect(data[STORAGE_TOTALS]).toEqual({ since: localDay(), count: 1, onScreenMs: 3000 });
  });
});
