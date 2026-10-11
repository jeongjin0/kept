// YouTube sets is-ads-overlay on the Shorts reel renderer for exactly as long as an advertisement
// fills the slot on screen. It changes in the same millisecond as the URL and the navigate-finish
// event, in both directions, so it never lags the id it belongs to. The advertisement's own
// ytd-ad-slot-renderer is not a safe marker: it stays in the DOM for up to 200 ms after the next
// Short has started, which would make that Short look like an ad. See qa/ads.md.
export function youtubeHasActiveAd(): boolean {
  return document.querySelector("ytd-reel-video-renderer[is-ads-overlay]") != null;
}
