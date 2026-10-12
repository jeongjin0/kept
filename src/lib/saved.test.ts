import { describe, expect, it } from "vitest";
import { MANUAL_DISMISS_MS, addSkip, clampOnScreen, formatDay, formatDuration, parseTotals, savedMs } from "./saved";

const fresh = { since: "2026-10-12", count: 0, onScreenMs: 0 };

describe("time saved", () => {
  it("counts about 3 s per skip less the time the video was on screen", () => {
    let totals = fresh;
    for (let index = 0; index < 100; index += 1) totals = addSkip(totals, 400);
    expect(totals.count).toBe(100);
    expect(totals.onScreenMs).toBe(40000);
    expect(savedMs(totals)).toBe(100 * MANUAL_DISMISS_MS - 40000);
    expect(savedMs(totals)).toBe(260000);
  });
  it("never counts a slow skip as negative, skip by skip", () => {
    // One skip took 9 s, which is more than a person needs: it saves nothing, and the 100 quick skips still save theirs.
    let totals = fresh;
    for (let index = 0; index < 100; index += 1) totals = addSkip(totals, 400);
    totals = addSkip(totals, 9000);
    expect(savedMs(totals)).toBe(100 * (MANUAL_DISMISS_MS - 400));
  });
  it("treats an unknown time as a skip that saved nothing", () => {
    expect(clampOnScreen(undefined)).toBe(MANUAL_DISMISS_MS);
    expect(clampOnScreen("fast")).toBe(MANUAL_DISMISS_MS);
    expect(clampOnScreen(Number.NaN)).toBe(MANUAL_DISMISS_MS);
    expect(clampOnScreen(Infinity)).toBe(MANUAL_DISMISS_MS);
    expect(savedMs(addSkip(fresh, undefined))).toBe(0);
  });
  it("keeps what is sensible and rounds", () => {
    expect(clampOnScreen(-20)).toBe(0);
    expect(clampOnScreen(312.6)).toBe(313);
    expect(clampOnScreen(50000)).toBe(MANUAL_DISMISS_MS);
  });
  it("reads stored totals defensively", () => {
    expect(parseTotals(undefined, "2026-10-12")).toEqual({ since: "2026-10-12", count: 0, onScreenMs: 0 });
    expect(parseTotals("x", "2026-10-12")).toEqual({ since: "2026-10-12", count: 0, onScreenMs: 0 });
    expect(parseTotals({ since: "2026-09-01", count: 10, onScreenMs: 4000 })).toEqual({ since: "2026-09-01", count: 10, onScreenMs: 4000 });
    expect(parseTotals({ since: "yesterday", count: -3, onScreenMs: "a" }, "2026-10-12")).toEqual({ since: "2026-10-12", count: 0, onScreenMs: 0 });
    expect(parseTotals({ since: "2026-09-01", count: 1.5, onScreenMs: 10 }, "2026-10-12").count).toBe(0);
    // A total that claims more time on screen than the skips could have taken is cut back, so the saving is never below zero.
    expect(savedMs(parseTotals({ since: "2026-09-01", count: 2, onScreenMs: 999999 }))).toBe(0);
  });
});

describe("durations", () => {
  const sec = 1000;
  const min = 60 * sec;
  const hour = 60 * min;
  it("writes seconds, minutes and hours in English", () => {
    expect(formatDuration(0, "short", "en")).toBe("0 sec");
    expect(formatDuration(47 * sec, "short", "en")).toBe("47 sec");
    expect(formatDuration(12 * min + 59 * sec, "short", "en")).toBe("12 min");
    expect(formatDuration(hour, "short", "en")).toBe("1 hr");
    expect(formatDuration(3 * hour + 12 * min, "short", "en")).toBe("3 hr 12 min");
  });
  it("has a narrow form for tight places", () => {
    expect(formatDuration(47 * sec, "narrow", "en")).toBe("47s");
    expect(formatDuration(12 * min, "narrow", "en")).toBe("12m");
    expect(formatDuration(3 * hour + 12 * min, "narrow", "en")).toBe("3h 12m");
  });
  it("writes the same figures in Korean", () => {
    expect(formatDuration(47 * sec, "short", "ko")).toBe("47초");
    expect(formatDuration(12 * min, "short", "ko")).toBe("12분");
    expect(formatDuration(3 * hour + 12 * min, "short", "ko")).toBe("3시간 12분");
    expect(formatDuration(3 * hour + 12 * min, "narrow", "ko")).toBe("3시간 12분");
  });
  it("rounds down and leaves the minutes out from 100 hours", () => {
    expect(formatDuration(59.9 * sec, "short", "en")).toBe("59 sec");
    expect(formatDuration(59 * min + 59 * sec, "short", "en")).toBe("59 min");
    expect(formatDuration(100 * hour + 40 * min, "short", "en")).toBe("100 hr");
    expect(formatDuration(-5, "short", "en")).toBe("0 sec");
  });
  it("writes a day with the year only when it is not this year's", () => {
    const now = new Date(2026, 9, 20);
    expect(formatDay("2026-10-12", "en", now)).toBe("Oct 12");
    expect(formatDay("2026-10-12", "ko", now)).toBe("10월 12일");
    expect(formatDay("2025-12-31", "en", now)).toBe("Dec 31, 2025");
  });
});
