import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS, STORAGE_DAILY, STORAGE_SETTINGS, STORAGE_TOTALS, normalizeSettings, type Platform, type Settings, type TotalSkips } from "../lib/score";
import type { IconName } from "../lib/icons";
import { parseTotals } from "../lib/saved";
import { readSkipCount, readTotals, saveSettings } from "../lib/storage";
import { resetFilterSettings } from "../lib/session-keep";

export interface ActiveState {
  platform: Platform | null;
  creatorId: string | null;
  instagramSignedOut: boolean;
}

export const SITES: Record<Platform, { name: string; icon: IconName }> = {
  youtube: { name: "YouTube Shorts", icon: "youtube" },
  tiktok: { name: "TikTok", icon: "tiktok" },
  instagram: { name: "Instagram Reels", icon: "reels" },
};

export function useFilterState() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [skips, setSkips] = useState(0);
  const [totals, setTotals] = useState<TotalSkips>(() => parseTotals(undefined));
  const [active, setActive] = useState<ActiveState | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  const latest = useRef(settings);

  useEffect(() => {
    let alive = true;
    let midnight: number;
    const refreshCount = () => { void readSkipCount().then((count) => { if (alive) setSkips(count); }); };
    const armMidnight = () => {
      const next = new Date();
      next.setHours(24, 0, 0, 0);
      midnight = window.setTimeout(() => { refreshCount(); armMidnight(); }, next.getTime() - Date.now() + 10);
    };
    armMidnight();
    document.addEventListener("visibilitychange", refreshCount);
    void chrome.storage.local.get(STORAGE_SETTINGS).then((data) => {
      if (!alive) return;
      latest.current = normalizeSettings(data[STORAGE_SETTINGS]);
      setSettings(latest.current);
      setReady(true);
    });
    void readSkipCount().then((count) => {
      if (alive) setSkips(count);
    });
    void readTotals().then((next) => {
      if (alive) setTotals(next);
    });
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return;
      if (changes[STORAGE_SETTINGS]) {
        latest.current = normalizeSettings(changes[STORAGE_SETTINGS].newValue);
        setSettings(latest.current);
      }
      if (changes[STORAGE_DAILY]) refreshCount();
      if (changes[STORAGE_TOTALS]) setTotals(parseTotals(changes[STORAGE_TOTALS].newValue));
    };
    chrome.storage.onChanged.addListener(listener);
    void askActive().then((next) => {
      if (alive) setActive(next);
    });
    return () => {
      alive = false;
      window.clearTimeout(midnight);
      document.removeEventListener("visibilitychange", refreshCount);
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const update = useCallback((change: (current: Settings) => Settings) => {
    const next = normalizeSettings(change(latest.current));
    latest.current = next;
    setSettings(next);
    void saveSettings(next);
  }, []);

  const allowCurrent = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error("No active tab");
    const response = await chrome.tabs.sendMessage(tab.id, { type: "scrollplus:allow" });
    if (response?.ok !== true) throw new Error("Creator unavailable");
  }, []);

  const reset = useCallback(async () => {
    setResetting(true); setResetFailed(false);
    try {
      const next = normalizeSettings(await resetFilterSettings());
      latest.current = next; setSettings(next);
    } catch { setResetFailed(true); }
    finally { setResetting(false); }
  }, []);

  return { settings, ready, skips, totals, active, update, allowCurrent, reset, resetting, resetFailed };
}

async function askActive(): Promise<ActiveState | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) return null;
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "scrollplus:context" });
    if (!response || typeof response !== "object") return null;
    return response as ActiveState;
  } catch {
    return null;
  }
}
