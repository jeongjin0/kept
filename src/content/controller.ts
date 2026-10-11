import { decide, DEFAULT_SETTINGS, normalizeSettings, STORAGE_SETTINGS, type ItemKind, type Metrics, type Platform, type Settings } from "../lib/score";
import { incrementSkips, loadSettings, saveSettings } from "../lib/storage";
import { loadUndoKeeps, rememberUndo, validVideoId, type UndoView } from "../lib/session-keep";
import { createEngine, type EngineItem, type SkipReason } from "./engine";
import { mountChip } from "./chip";
import type { ExtractedItem } from "../platforms/extract";

export interface Adapter {
  platform: Platform;
  readActive: () => { id: string; creatorId: string | null; kind?: ItemKind } | null;
  advance: (reason: SkipReason) => Promise<boolean>;
  retreat: () => Promise<boolean>;
  listGrid: () => Array<{ id: string; element: HTMLElement }>;
  instagramSignedOut?: () => boolean;
  // Shortest wait between two automatic moves on this site. The engine default applies when absent.
  advanceGapMs?: number;
}

interface ItemMessage {
  source?: string;
  type?: string;
  item?: ExtractedItem & { platform?: Platform };
  items?: ExtractedItem[];
}

export function startFilter(adapter: Adapter): void {
  let settings: Settings = DEFAULT_SETTINGS;
  let ready = false;
  let settingsRevision = 0;
  let sessionRevision = -1;
  const sessionKeep = new Set<string>();
  const cache = new Map<string, ExtractedItem>();
  let pointerDown = false;
  const chip = mountChip({
    undo: () => engine.undo(),
    keepGoing: () => engine.keepGoing(),
    lower: () => engine.lower(),
  });
  const engine = createEngine({
    getSettings: () => settings,
    now: () => Date.now(),
    advanceGapMs: adapter.advanceGapMs,
    advance: (reason) => adapter.advance(reason),
    retreat: () => adapter.retreat(),
    onSkipped: () => {
      void incrementSkips();
    },
    setRule: (next) => {
      settings = { ...settings, rule: next };
      void saveSettings(settings);
    },
    isBlocked: () => pointerDown || typing() || menuOpen(),
    render: (model) => chip.update(model),
    schedule: (fn, ms) => window.setTimeout(fn, ms),
    cancel: (id) => window.clearTimeout(id),
    sessionKeep,
    rememberUndo: async (id) => {
      try { applySession(await rememberUndo(adapter.platform, id)); }
      catch { sessionKeep.add(id); }
    },
  });

  function applySession(view: UndoView): void {
    if (view.platform !== adapter.platform || !Number.isSafeInteger(view.revision) || view.revision < sessionRevision || !Array.isArray(view.ids)) return;
    sessionRevision = view.revision;
    sessionKeep.clear();
    for (const id of view.ids) if (validVideoId(id)) sessionKeep.add(id);
    if (view.reset && view.settings) {
      settingsRevision++;
      settings = normalizeSettings(view.settings);
      engine.settingsChanged();
    }
    showActive();
  }

  function context() {
    const active = adapter.readActive();
    const cached = active ? cache.get(active.id) : undefined;
    return {
      platform: adapter.platform,
      creatorId: cached?.creatorId ?? active?.creatorId ?? null,
      instagramSignedOut: adapter.instagramSignedOut?.() === true,
    };
  }

  function showActive(): void {
    if (!ready) return;
    const active = adapter.readActive();
    if (!active) {
      engine.onInactive();
      return;
    }
    const cached = cache.get(active.id);
    const item: EngineItem = {
      id: active.id,
      platform: adapter.platform,
      surface: "player",
      creatorId: cached?.creatorId ?? active.creatorId,
      metrics: cached?.metrics ?? null,
      // The site's own ad flag outranks a guess from the layout (for example a photo card).
      kind: cached?.kind === "ad" ? "ad" : active.kind ?? cached?.kind ?? "video",
    };
    engine.onItem(item);
  }

  // Grid filtering is off by default. Then the only work left is to restore cards
  // this script hid earlier, so skip listing every page link once none remain.
  let gridsMayBeHidden = true;

  function scanGrids(): void {
    if (!settings.filterGrids && !gridsMayBeHidden) return;
    let cards: Array<{ id: string; element: HTMLElement }> = [];
    try {
      cards = adapter.listGrid();
    } catch {
      return;
    }
    gridsMayBeHidden = settings.filterGrids;
    for (const card of cards) {
      const known = cache.get(card.id);
      if (!settings.filterGrids || !known) {
        if (card.element.getAttribute("data-scrollplus-grid") === "skip") {
          card.element.removeAttribute("hidden");
          card.element.removeAttribute("data-scrollplus-grid");
        }
        continue;
      }
      const decision = decide({
        settings,
        platform: adapter.platform,
        surface: "grid",
        creatorId: known.creatorId,
        metrics: known.metrics,
        kind: known.kind,
      });
      if (decision.action === "skip") {
        card.element.setAttribute("hidden", "");
        card.element.setAttribute("data-scrollplus-grid", "skip");
      } else if (card.element.getAttribute("data-scrollplus-grid") === "skip") {
        card.element.removeAttribute("hidden");
        card.element.removeAttribute("data-scrollplus-grid");
      }
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data as ItemMessage;
    if (!data || data.source !== "scrollplus" || data.item?.platform && data.item.platform !== adapter.platform && data.type === "item") return;
    if (data.type === "item" && data.item && (!data.item.platform || data.item.platform === adapter.platform)) {
      const previous = cache.get(data.item.id);
      cache.set(data.item.id, {
        ...previous,
        ...data.item,
        creatorId: data.item.creatorId ?? previous?.creatorId ?? null,
        metrics: data.item.metrics ?? previous?.metrics ?? null,
        kind: data.item.kind ?? previous?.kind ?? "video",
      });
      showActive();
    }
    if (data.type === "cache" && Array.isArray(data.items)) {
      for (const item of data.items) cache.set(item.id, item);
      scanGrids();
    }
  });

  window.addEventListener("pointerdown", (event) => {
    if (chip.contains(event.target)) return;
    pointerDown = true;
  }, true);
  window.addEventListener("pointerup", (event) => {
    const inside = chip.contains(event.target);
    pointerDown = false;
    if (!inside) engine.poke();
  }, true);
  window.addEventListener("focusout", () => engine.poke(), true);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "scrollplus:session" && _sender.id === chrome.runtime.id) {
      applySession(message); sendResponse({ ok: true }); return false;
    }
    if (message?.type === "scrollplus:context") {
      sendResponse(context());
      return false;
    }
    if (message?.type === "scrollplus:allow") {
      const creatorId = context().creatorId;
      if (!creatorId) { sendResponse({ ok: false }); return false; }
      void (async () => {
        const id = adapter.platform === "instagram" ? creatorId.toLowerCase() : creatorId.replace(/^@/, "");
        const exists = settings.allowlist.some((entry) => entry.platform === adapter.platform && entry.id.toLowerCase() === id.toLowerCase());
        if (!exists) {
          settings = { ...settings, allowlist: [...settings.allowlist, { platform: adapter.platform, id }] };
          await saveSettings(settings);
        }
        engine.keepCurrent();
        sendResponse({ ok: true });
      })().catch(() => sendResponse({ ok: false }));
      return true;
    }
    return false;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[STORAGE_SETTINGS]) return;
    settingsRevision++;
    settings = normalizeSettings(changes[STORAGE_SETTINGS].newValue);
    engine.settingsChanged();
    scanGrids();
  });

  function initialize(): void {
    const revision = settingsRevision;
    void Promise.all([loadSettings(), loadUndoKeeps(adapter.platform)]).then(([next, view]) => {
      if (revision === settingsRevision) settings = next;
      applySession(view);
      ready = true;
      showActive();
      scanGrids();
    }).catch(() => {
      // Unknown session state must not re-skip a remembered video. Keep while retrying.
      window.setTimeout(initialize, 1000);
    });
  }
  initialize();
  window.setInterval(() => {
    showActive();
    scanGrids();
  }, 400);
}

function typing(): boolean {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement)) return false;
  if (element.closest("#scrollplus-chip-host")) return false;
  return element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable;
}

function menuOpen(): boolean {
  for (const node of document.querySelectorAll("ytd-menu-popup-renderer, [role='menu']")) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.getAttribute("aria-hidden") === "true") continue;
    const rect = node.getBoundingClientRect();
    if (rect.width > 8 && rect.height > 8) return true;
  }
  return false;
}

export function rememberMetrics(cache: Map<string, ExtractedItem>, item: ExtractedItem): void {
  cache.set(item.id, item);
}

export type { Metrics, ItemKind };
