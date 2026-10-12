import { localDay, type TotalSkips } from "./score";
import { uiLanguage } from "./numbers";

// What a person spends on a video they do not want: they look, see it is not for them, and swipe it away. About 3 s is a cautious
// figure. In 2026 watch histories donated by 16,981 TikTok users the median swipe came after 6 s and a third of all videos were gone
// within 3 s, and that includes videos people liked. It is an estimate of what ScrollPlus spares you, not a measurement of your habits.
export const MANUAL_DISMISS_MS = 3000;

function whole(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

// How long a skipped video was on screen, as it is added to the total. A skip that took longer than a person would have saved
// nothing, so it counts as exactly that long: the time saved is never negative, skip by skip.
export function clampOnScreen(ms: unknown): number {
  return typeof ms === "number" && Number.isFinite(ms) ? Math.min(Math.max(Math.round(ms), 0), MANUAL_DISMISS_MS) : MANUAL_DISMISS_MS;
}

export function parseTotals(value: unknown, today: string = localDay()): TotalSkips {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const count = whole(raw.count) ?? 0;
  const onScreen = typeof raw.onScreenMs === "number" && Number.isFinite(raw.onScreenMs) && raw.onScreenMs >= 0 ? raw.onScreenMs : 0;
  const since = typeof raw.since === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.since) ? raw.since : today;
  return { since, count, onScreenMs: Math.min(onScreen, count * MANUAL_DISMISS_MS) };
}

export function addSkip(totals: TotalSkips, onScreenMs: unknown): TotalSkips {
  return { since: totals.since, count: totals.count + 1, onScreenMs: totals.onScreenMs + clampOnScreen(onScreenMs) };
}

export function savedMs(totals: TotalSkips): number {
  return Math.max(0, totals.count * MANUAL_DISMISS_MS - totals.onScreenMs);
}

// "47 sec", "12 min", "3 hr 12 min" (narrow: "47s", "12m", "3h 12m"; Korean: "47초", "12분", "3시간 12분"). Rounded down, so the
// figure never claims more than there is. From 100 hours on the minutes are left out.
export function formatDuration(ms: number, style: "short" | "narrow" = "short", lang: string = uiLanguage()): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const unit = (value: number, name: "second" | "minute" | "hour") => {
    try {
      return new Intl.NumberFormat(lang, { style: "unit", unit: name, unitDisplay: style, maximumFractionDigits: 0 }).format(value).replace(/\u00a0/g, " ");
    } catch {
      return value + (name === "hour" ? " h" : name === "minute" ? " min" : " s");
    }
  };
  if (seconds < 60) return unit(seconds, "second");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return unit(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours >= 100 || rest === 0 ? unit(hours, "hour") : unit(hours, "hour") + " " + unit(rest, "minute");
}

// "Oct 12" / "10월 12일", with the year when it is not this year's.
export function formatDay(day: string, lang: string = uiLanguage(), now: Date = new Date()): string {
  const [year, month, date] = day.split("-").map(Number);
  const value = new Date(year, month - 1, date);
  try {
    const parts: Intl.DateTimeFormatOptions = value.getFullYear() === now.getFullYear() ? { month: "short", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" };
    return new Intl.DateTimeFormat(lang, parts).format(value);
  } catch {
    return day;
  }
}
