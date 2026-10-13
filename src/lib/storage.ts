import {
  DEFAULT_SETTINGS, SCHEMA_VERSION, STORAGE_DAILY, STORAGE_SCHEMA, STORAGE_SETTINGS, STORAGE_TOTALS, localDay, migrateSettings, normalizeSettings,
  type DailySkips, type Settings, type TotalSkips,
} from "./score";
import { addSkip, parseTotals } from "./saved";

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(STORAGE_SETTINGS);
  return normalizeSettings(data[STORAGE_SETTINGS]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_SETTINGS]: settings });
}

export async function readSkipCount(): Promise<number> {
  const data = await chrome.storage.local.get(STORAGE_DAILY);
  const daily = data[STORAGE_DAILY] as DailySkips | undefined;
  if (!daily || daily.day !== localDay()) return 0;
  return Number.isSafeInteger(daily.count) && daily.count >= 0 ? daily.count : 0;
}

export async function readTotals(): Promise<TotalSkips> {
  const data = await chrome.storage.local.get(STORAGE_TOTALS);
  return parseTotals(data[STORAGE_TOTALS]);
}

// onScreenMs: how long the skipped video was on screen before ScrollPlus moved on from it.
export async function incrementSkips(onScreenMs: number): Promise<void> {
  await chrome.runtime.sendMessage({ type: "scrollplus:skipped", onScreenMs });
}

// Only the background worker writes the counts, so simultaneous tabs cannot lose an increment.
export async function recordSkip(onScreenMs?: unknown): Promise<void> {
  const today = localDay();
  const data = await chrome.storage.local.get([STORAGE_DAILY, STORAGE_TOTALS]);
  const daily = data[STORAGE_DAILY] as DailySkips | undefined;
  const previous = daily && daily.day === today && Number.isSafeInteger(daily.count) && daily.count >= 0 ? daily.count : 0;
  const totals = addSkip(parseTotals(data[STORAGE_TOTALS], today), onScreenMs);
  await chrome.storage.local.set({
    [STORAGE_DAILY]: { day: today, count: previous + 1 } satisfies DailySkips,
    [STORAGE_TOTALS]: totals satisfies TotalSkips,
  });
}

// Runs when the extension is installed or updated. A fresh install gets the defaults. Settings saved by an earlier version are moved
// to the current scale once: the schema marker is written together with them, so a later run finds it and leaves them alone.
export async function ensureInstalledState(): Promise<void> {
  const data = await chrome.storage.local.get([STORAGE_SETTINGS, STORAGE_DAILY, STORAGE_TOTALS, STORAGE_SCHEMA]);
  const next: Record<string, unknown> = {};
  const schema = data[STORAGE_SCHEMA];
  const current = typeof schema === "number" && schema >= SCHEMA_VERSION;
  if (!data[STORAGE_SETTINGS]) next[STORAGE_SETTINGS] = DEFAULT_SETTINGS;
  else if (!current) next[STORAGE_SETTINGS] = migrateSettings(data[STORAGE_SETTINGS], typeof schema === "number" ? schema : 1);
  if (!current) next[STORAGE_SCHEMA] = SCHEMA_VERSION;
  if (!data[STORAGE_DAILY]) next[STORAGE_DAILY] = { day: localDay(), count: 0 };
  if (!data[STORAGE_TOTALS]) next[STORAGE_TOTALS] = parseTotals(undefined);
  if (Object.keys(next).length > 0) await chrome.storage.local.set(next);
}
