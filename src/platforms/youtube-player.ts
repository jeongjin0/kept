// YouTube sets is-ads-overlay on the Shorts reel renderer for exactly as long as an advertisement
// fills the slot on screen. It changes in the same millisecond as the URL and the navigate-finish
// event, in both directions, so it never lags the id it belongs to. The advertisement's own
// ytd-ad-slot-renderer is not a safe marker: it stays in the DOM for up to 200 ms after the next
// Short has started, which would make that Short look like an ad. See qa/ads.md.
export function youtubeHasActiveAd(): boolean {
  return document.querySelector("ytd-reel-video-renderer[is-ads-overlay]") != null;
}

// The visible Shorts subscribe button, in the two interface languages.
// A long caption that merely mentions subscribing does not count.
export function followedFromSubscribeLabel(label: string): boolean | null {
  const text = label.replace(/\s+/g, " ").trim().toLowerCase();
  if (!text || text.length > 80) return null;
  if (/unsubscribe|구독\s*취소|구독취소/.test(text)) return true;
  if (/(?:^|[^a-z])subscribed(?:[^a-z]|$)|구독중|구독됨/.test(text)) return true;
  if (/^(?:subscribe|구독)$/.test(text) || /^subscribe to\b/.test(text)) return false;
  return null;
}

export function youtubeSubscribeButtonFollowed(): boolean | null {
  const reel = document.querySelector("ytd-reel-video-renderer[is-active]") ?? document.querySelector("ytd-reel-video-renderer");
  if (!(reel instanceof HTMLElement)) return null;
  const legacy = reel.querySelector("ytd-subscribe-button-renderer");
  if (legacy) return legacy.hasAttribute("subscribed");
  for (const button of reel.querySelectorAll("button")) {
    const label = button.getAttribute("aria-label") || button.textContent || "";
    const followed = followedFromSubscribeLabel(label);
    if (followed != null) return followed;
  }
  return null;
}
