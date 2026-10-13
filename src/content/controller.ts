import { decide, DEFAULT_SETTINGS, normalizeSettings, STORAGE_SETTINGS, type ItemKind, type Metrics, type Platform, type Settings } from "../lib/score";
import { incrementSkips, loadSettings, saveSettings } from "../lib/storage";
import { loadUndoKeeps, rememberUndo, validVideoId, type UndoView } from "../lib/session-keep";
import { createEngine, type EngineItem, type SkipReason } from "./engine";
import { mountChip } from "./chip";
import { mostVisibleVideo } from "./page";
import type { ExtractedItem } from "../platforms/extract";
import { visiblePoll } from "../lib/visible-poll";

export interface Adapter {
  platform: Platform;
  readActive: () => { id: string; creatorId: string | null; kind?: ItemKind; followed?: boolean | null } | null;
  advance: (reason: SkipReason) => Promise<boolean>;
  retreat: () => Promise<boolean>;
  listGrid: () => Array<{ id: string; element: HTMLElement }>;
  instagramSignedOut?: () => boolean;
  // Shortest wait between two automatic moves on this site. The engine default applies when absent.
  advanceGapMs?: number;
  // Shortest time a video is the active one before ScrollPlus moves on from it. None when absent.
  settleMs?: number;
  // False while the site cannot move yet (see the engine). Absent: always ready.
  ready?: () => boolean;
  // The site scrolls from one video to the next and announces nothing when the next one has arrived. Look at which video is
  // active while the page scrolls and when it stops, not only at the next poll.
  watchScroll?: boolean;
}

interface ItemMessage {
  source?: string;
  type?: string;
  item?: ExtractedItem & { platform?: Platform };
  items?: ExtractedItem[];
}

// A missing player is only the end of the feed once it stays missing: on a site that scrolls from one video to the next there is
// none for a moment in between.
const INACTIVE_AFTER_MS = 300;
// While a feed that is watched scrolls, look at which video is active about this often.
const SCROLL_LOOK_MS = 60;

export function startFilter(adapter: Adapter): void {
  let settings: Settings = DEFAULT_SETTINGS;
  let ready = false;
  let settingsRevision = 0;
  let sessionRevision = -1;
  const sessionKeep = new Set<string>();
  const cache = new Map<string, ExtractedItem>();
  let pointerDown = false;
  const chip = mountChip(
    {
      undo: () => engine.undo(),
      keepGoing: () => engine.keepGoing(),
      lower: () => engine.lower(),
    },
    { position: () => settings.chipPosition, anchor: () => mostVisibleVideo() },
  );
  const engine = createEngine({
    getSettings: () => settings,
    now: () => Date.now(),
    advanceGapMs: adapter.advanceGapMs,
    settleMs: adapter.settleMs,
    ready: adapter.ready,
    advance: (reason) => adapter.advance(reason),
    retreat: () => adapter.retreat(),
    onSkipped: (onScreenMs) => {
      void incrementSkips(onScreenMs);
    },
    setRule: (next) => {
      settings = { ...settings, rule: next };
      void saveSettings(settings);
    },
    isBlocked: () => document.hidden || pointerDown || typing() || menuOpen(),
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

  let inactiveSince = 0;

  function showActive(): void {
    if (!ready || document.hidden) return;
    const active = adapter.readActive();
    if (!active) {
      const now = Date.now();
      if (!inactiveSince) inactiveSince = now;
      if (now - inactiveSince >= INACTIVE_AFTER_MS) engine.onInactive();
      return;
    }
    inactiveSince = 0;
    const cached = cache.get(active.id);
    const item: EngineItem = {
      id: active.id,
      platform: adapter.platform,
      surface: "player",
      creatorId: cached?.creatorId ?? active.creatorId,
      metrics: cached?.metrics ?? null,
      followed: active.followed === true || active.followed === false ? active.followed : cached?.followed ?? null,
      // The site's own ad flag outranks a guess from the layout (for example a photo card).
      kind: cached?.kind === "ad" ? "ad" : active.kind ?? cached?.kind ?? "video",
    };
    engine.onItem(item);
  }

  // Grid filtering is off by default. Then the only work left is to restore cards
  // this script hid earlier, so skip listing every page link once none remain.
  let gridsMayBeHidden = true;

  function scanGrids(): void {
    if (document.hidden) return;
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
        followed: known.followed ?? null,
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
        followed: data.item.followed === true || data.item.followed === false ? data.item.followed : previous?.followed ?? null,
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
  window.addEventListener("pointercancel", () => { pointerDown = false; engine.poke(); }, true);
  window.addEventListener("blur", () => { pointerDown = false; }, true);

  let scrollTimer: number | null = null;
  document.addEventListener("visibilitychange", () => {
    pointerDown = false;
    inactiveSince = 0;
    if (scrollTimer != null) window.clearTimeout(scrollTimer);
    scrollTimer = null;
    engine.setVisible(!document.hidden);
  });
  engine.setVisible(!document.hidden);

  // Idle pages produce no scroll events, so this costs nothing until the feed moves.
  if (adapter.watchScroll) {
    let lastScrollLook = 0;
    window.addEventListener("scroll", () => {
      if (scrollTimer != null || document.hidden) return;
      scrollTimer = window.setTimeout(() => {
        scrollTimer = null;
        lastScrollLook = Date.now();
        showActive();
      }, Math.max(0, SCROLL_LOOK_MS - (Date.now() - lastScrollLook)));
    }, { capture: true, passive: true });
    window.addEventListener("scrollend", () => showActive(), true);
  }

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
  visiblePoll(() => {
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
