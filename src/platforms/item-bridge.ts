import type { Metrics, Platform } from "../lib/score";
import type { ExtractedItem } from "./extract";

type Active = { id: string; creatorId: string | null };
type Player = Omit<ExtractedItem, "metrics"> & { metrics: Metrics | null };

function knownFollow(value: boolean | null | undefined): boolean | null {
  return value === true || value === false ? value : null;
}

function sameItem(a: Player | undefined | null, b: Player): boolean {
  return a?.id === b.id && a.creatorId === b.creatorId && a.kind === b.kind
    && knownFollow(a?.followed) === knownFollow(b.followed)
    && a.metrics?.likes === b.metrics?.likes && a.metrics?.comments === b.metrics?.comments
    && a.metrics?.views === b.metrics?.views && a.metrics?.shares === b.metrics?.shares
    && a.metrics?.saves === b.metrics?.saves;
}

// Keep metrics for revisits, but do not clone the entire browsing history on every poll.
export function createItemBridge(platform: Platform, readActive: () => Active | null, publishUnknown = false) {
  const cache = new Map<string, ExtractedItem>();
  let lastPlayer: Player | null = null;

  function publish(): void {
    try {
      const active = readActive();
      if (!active) { lastPlayer = null; return; }
      const known = cache.get(active.id);
      if (!known && !publishUnknown) { lastPlayer = null; return; }
      const player: Player = known
        ? { ...known, creatorId: known.creatorId ?? active.creatorId }
        : { id: active.id, creatorId: active.creatorId, metrics: null, kind: "video" };
      if (sameItem(lastPlayer, player)) return;
      window.postMessage({ source: "scrollplus", type: "item", item: { platform, surface: "player", ...player } }, "*");
      lastPlayer = player;
    } catch {
      /* leave the page alone */
    }
  }

  function ingest(items: ExtractedItem[]): void {
    const changed: ExtractedItem[] = [];
    for (const item of items) {
      if (sameItem(cache.get(item.id), item)) continue;
      cache.set(item.id, item);
      changed.push(item);
    }
    // The isolated script merges these changes; settings and grid rescans remain independent.
    if (changed.length) window.postMessage({ source: "scrollplus", type: "cache", items: changed }, "*");
    publish();
  }

  return { ingest, publish };
}

// Removed scripts can be collected; replacing a script's text is still observed, even
// when the length and prefix match the previous payload.
export function createEmbeddedReader(ingest: (data: unknown) => void) {
  const seen = new WeakMap<Node, string>();
  return (node: Node, text: string): void => {
    if (seen.get(node) === text) return;
    seen.set(node, text);
    try { ingest(JSON.parse(text)); }
    catch { /* not a JSON payload; retry only when its text changes */ }
  };
}
