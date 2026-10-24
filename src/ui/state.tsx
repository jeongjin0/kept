import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS, STORAGE_DAILY, STORAGE_SETTINGS, STORAGE_TOTALS, normalizeSettings, type Platform, type Settings, type TotalSkips } from "../lib/score";
import type { IconName } from "../lib/icons";
import { parseTotals } from "../lib/saved";
import { readSkipCount, readTotals, saveSettings } from "../lib/storage";
import { resetFilterSettings } from "../lib/session-keep";
import type { PlaybackState } from "../content/engine";

export type PlaybackAction = "undo" | "continue" | "lower";

export interface ActiveState {
  platform: Platform | null;
  creatorId: string | null;
  instagramSignedOut: boolean;
  documentKey: string;
  controls: PlaybackState | null;
}

export const SITES: Record<Platform, { name: string; icon: IconName }> = {
  youtube: { name: "YouTube Shorts", icon: "youtube" },
  tiktok: { name: "TikTok", icon: "tiktok" },
  instagram: { name: "Instagram Reels", icon: "reels" },
};

export function useFilterState(live = false) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [skips, setSkips] = useState(0);
  const [totals, setTotals] = useState<TotalSkips>(() => parseTotals(undefined));
  const [active, setActive] = useState<ActiveState | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);
  const activeRef = useRef<{ tabId: number; context: ActiveState } | null>(null);
  const actionPending = useRef(false);
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
    let refreshing = false;
    const refreshActive = async () => {
      if (refreshing || actionPending.current) return;
      refreshing = true;
      try {
        const next = await askActive();
        if (alive) { activeRef.current = next; setActive(next?.context ?? null); }
      } finally { refreshing = false; }
    };
    void refreshActive();
    const refreshTimer = live ? window.setInterval(() => void refreshActive(), 500) : null;
    return () => {
      alive = false;
      window.clearTimeout(midnight);
      document.removeEventListener("visibilitychange", refreshCount);
      chrome.storage.onChanged.removeListener(listener);
      if (refreshTimer != null) window.clearInterval(refreshTimer);
    };
  }, [live]);

  const control = useCallback(async (action: PlaybackAction) => {
    if (actionPending.current) return;
    const target = activeRef.current;
    if (!target?.context.controls) return;
    actionPending.current = true; setActing(true); setActionFailed(false);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id !== target.tabId) throw new Error("Active tab changed");
      const response = await chrome.tabs.sendMessage(target.tabId, {
        type: "scrollplus:control", action, documentKey: target.context.documentKey, revision: target.context.controls.revision,
      });
      if (response?.ok !== true) throw new Error("Action unavailable");
      const next = await askActive();
      activeRef.current = next; setActive(next?.context ?? null);
    } catch {
      setActionFailed(true);
      const next = await askActive();
      activeRef.current = next; setActive(next?.context ?? null);
    } finally { actionPending.current = false; setActing(false); }
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

  return { settings, ready, skips, totals, active, update, allowCurrent, control, acting, actionFailed, reset, resetting, resetFailed };
}

async function askActive(): Promise<{ tabId: number; context: ActiveState } | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) return null;
    const response = await chrome.tabs.sendMessage(tab.id, { type: "scrollplus:context" });
    if (!response || typeof response !== "object") return null;
    return { tabId: tab.id, context: response as ActiveState };
  } catch {
    return null;
  }
}
