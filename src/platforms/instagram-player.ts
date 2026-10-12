import { visibleVideo } from "../content/page";

const AD_LABEL = /^(?:ad|sponsored|광고|스폰서\s*광고)$/i;

export function followedFromFollowLabel(label: string): boolean | null {
  const text = label.replace(/\s+/g, " ").trim().toLowerCase();
  if (!text || text.length > 48) return null;
  if (/unfollow|팔로우\s*취소|팔로우취소/.test(text)) return true;
  if (/^(?:following|팔로잉)$/.test(text) || /^following\b/.test(text) || /팔로잉/.test(text)) return true;
  if (/^(?:follow|팔로우)$/.test(text)) return false;
  return null;
}

export function instagramFollowButtonFollowed(): boolean | null {
  const video = visibleVideo();
  if (!video) return null;
  let scope: HTMLElement | null = video.parentElement;
  for (let depth = 0; depth < 8 && scope; depth += 1, scope = scope.parentElement) {
    const buttons = scope.querySelectorAll("button, [role='button']");
    if (buttons.length > 60) break;
    for (const node of buttons) {
      if (!(node instanceof HTMLElement)) continue;
      const followed = followedFromFollowLabel(node.getAttribute("aria-label") || node.textContent || "");
      if (followed != null) return followed;
    }
  }
  return null;
}

// A visible disclosure protects advertisements independently of JSON ad flags.
// Do not let an offscreen/sibling ad or a
// caption that merely mentions advertising suppress ordinary Reel filtering.
export function instagramHasVisibleAd(): boolean {
  const video = visibleVideo();
  if (!video) return false;
  const player = video.getBoundingClientRect();
  for (const label of document.querySelectorAll("span[dir='auto']")) {
    const text = label.textContent?.trim() ?? "";
    if (text.length > 16 || !AD_LABEL.test(text)) continue;
    const rect = label.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.width > 180 || rect.height > 40) continue;
    if (rect.top < 0 || rect.bottom > window.innerHeight) continue;
    if (rect.right < player.left - 320 || rect.left > player.right + 120) continue;
    // Wide desktop captions sit beside the video; compact captions overlay it.
    // Require a bounded common player container, never the whole document/feed.
    let parent = label.parentElement;
    for (let depth = 0; depth < 24 && parent && parent !== document.body; depth++, parent = parent.parentElement) {
      if (!parent.contains(video)) continue;
      const box = parent.getBoundingClientRect();
      // Letterboxed media can be shorter than its caption/card. Bound the card
      // by the viewport instead of requiring its label to overlap media pixels.
      if (box.height <= window.innerHeight + 32 && box.width <= player.width + 600) return true;
      break;
    }
  }
  return false;
}
