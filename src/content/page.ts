export function youtubeShortId(): string | null {
  return location.pathname.match(/^\/shorts\/([^/?#]+)/)?.[1] ?? null;
}

export function instagramReelId(): string | null {
  return location.pathname.match(/\/reels?\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

export function visibleVideo(eligible: (video: HTMLVideoElement) => boolean = () => true): HTMLVideoElement | null {
  const videos = document.querySelectorAll("video");
  let best: HTMLVideoElement | null = null;
  let bestRatio = 0;
  for (const video of videos) {
    if (!eligible(video)) continue;
    const rect = video.getBoundingClientRect();
    if (rect.height < 40) continue;
    const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    const ratio = visible / rect.height;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = video;
    }
  }
  return bestRatio >= 0.6 ? best : null;
}

export function tiktokActive(): { id: string; creatorId: string | null } | null {
  const fromUrl = location.pathname.match(/@([^/]+)\/video\/(\d+)/);
  if (fromUrl) return { creatorId: fromUrl[1], id: fromUrl[2] };
  // Profile/search hover previews are grids, even when their player has a video ID.
  if (!/^\/(?:foryou|following)?\/?$/.test(location.pathname)) return null;
  // An empty Following feed contains autoplaying creator recommendation cards.
  const video = visibleVideo(video => !video.closest('[data-e2e="recommend-card"]'));
  if (!video) return null;
  const wrapper = video.closest('[id^="xgwrapper-"]');
  const wrapped = wrapper ? wrapper.id.match(/^xgwrapper-\d+-(\d+)$/) : null;
  let node: HTMLElement | null = video;
  for (let depth = 0; depth < 12 && node; depth += 1) {
    if (wrapped) {
      const author = node.querySelector('a[href^="/@"]');
      const handle = author ? author.getAttribute("href")?.match(/^\/@([^/?#]+)/) : null;
      if (handle) return { creatorId: handle[1], id: wrapped[1] };
    }
    const link = node.querySelector('a[href*="/video/"]');
    if (link instanceof HTMLAnchorElement) {
      const full = link.href.match(/@([^/]+)\/video\/(\d+)/);
      if (full) return { creatorId: full[1], id: full[2] };
      const only = link.href.match(/video\/(\d+)/);
      if (only) return { creatorId: null, id: only[1] };
    }
    node = node.parentElement;
  }
  return wrapped ? { creatorId: null, id: wrapped[1] } : null;
}

// Which TikTok item the feed shows right now. While the next video is still loading its
// player is empty and has no id, so fall back to the feed item that is most on screen.
export function tiktokMarker(): string | null {
  const active = tiktokActive();
  if (active) return active.id;
  let best: string | null = null;
  let bestVisible = 0;
  for (const item of document.querySelectorAll('[data-e2e="recommend-list-item-container"]')) {
    const rect = item.getBoundingClientRect();
    const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    if (visible > bestVisible) {
      bestVisible = visible;
      best = item.id || null;
    }
  }
  return best ? "item:" + best : null;
}

export function gridAnchors(pattern: RegExp): Array<{ id: string; element: HTMLElement }> {
  const found: Array<{ id: string; element: HTMLElement }> = [];
  const seen = new Set<string>();
  for (const link of document.querySelectorAll("a[href]")) {
    if (!(link instanceof HTMLAnchorElement)) continue;
    const match = link.href.match(pattern);
    if (!match?.[1] || seen.has(match[1])) continue;
    // Our hidden cards have no box, but must still be returned so settings can restore them.
    if (link.getAttribute("data-scrollplus-grid") !== "skip") {
      const rect = link.getBoundingClientRect();
      if (rect.height < 24 || rect.height > window.innerHeight * 0.6) continue;
    }
    seen.add(match[1]);
    found.push({ id: match[1], element: link });
  }
  return found;
}

export function pressIn(rootSelector: string, pattern: RegExp, key: "ArrowDown" | "ArrowUp"): boolean {
  const root = document.querySelector(rootSelector);
  if (!root) return false;
  for (const button of root.querySelectorAll("button")) {
    const label = button.getAttribute("aria-label") || "";
    if (pattern.test(label)) {
      button.click();
      return true;
    }
  }
  document.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
  return true;
}

export interface MoveOptions {
  // For a site that announces when a move starts. A press the site did not act on starts nothing, and a press made before a
  // move starts is ignored, so press again from afterMs on, every everyMs, until begun() says the move has started.
  repress?: { afterMs: number; everyMs: number; begun: () => boolean };
}

export function moveUntilIdChanges(press: () => boolean, readId: () => string | null, options: MoveOptions = {}): Promise<boolean> {
  const before = readId();
  let pressed = false;
  try {
    pressed = press();
  } catch {
    pressed = false;
  }
  if (!pressed) return Promise.resolve(false);
  return new Promise((resolve) => {
    const started = Date.now();
    let lastPress = started;
    const timer = window.setInterval(() => {
      const next = readId();
      if (next && next !== before) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }
      const now = Date.now();
      if (now - started > 1800) {
        window.clearInterval(timer);
        resolve(false);
        return;
      }
      const again = options.repress;
      if (again && now - started >= again.afterMs && now - lastPress >= again.everyMs && !again.begun()) {
        lastPress = now;
        try {
          press();
        } catch {
          // The wait above ends the attempt.
        }
      }
    }, 50);
  });
}
