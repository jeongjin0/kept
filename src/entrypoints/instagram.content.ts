import { defineContentScript } from "wxt/utils/define-content-script";
import { startFilter } from "../content/controller";
import { gridAnchors, instagramReelId, moveUntilIdChanges, visibleVideo } from "../content/page";
import type { SkipReason } from "../content/engine";
import { instagramHasVisibleAd } from "../platforms/instagram-player";

function requestMove(key: "ArrowDown" | "ArrowUp", reason?: SkipReason): boolean {
  // A count never moves on from an ad or a photo card. Only the ad rule may leave an ad.
  const ad = key === "ArrowDown" && reason === "ad";
  if (key === "ArrowDown" && !ad && (!visibleVideo() || instagramHasVisibleAd())) return false;
  if (!visibleVideo() && !instagramReelId()) return false;
  window.postMessage({ source: "scrollplus", type: "advance", key, ad }, "*");
  return true;
}

function signedOut(): boolean {
  if (location.pathname.startsWith("/accounts/login")) return true;
  return document.querySelector('input[name="username"]') != null;
}

export default defineContentScript({
  matches: ["https://www.instagram.com/*"],
  runAt: "document_start",
  main() {
    startFilter({
      platform: "instagram",
      readActive: () => {
        const id = instagramReelId();
        if (!id) return null;
        // Keep non-video feed cards, including image advertisements. Preserve an
        // active identity so a preceding skip's Undo chip survives this card.
        const kind = !visibleVideo() ? "carousel" as const : instagramHasVisibleAd() ? "ad" as const : undefined;
        return { id, creatorId: null, kind };
      },
      advance: (reason) => moveUntilIdChanges(() => requestMove("ArrowDown", reason), instagramReelId),
      retreat: () => moveUntilIdChanges(() => requestMove("ArrowUp"), instagramReelId),
      listGrid: () => gridAnchors(/\/reel\/([A-Za-z0-9_-]+)/),
      instagramSignedOut: signedOut,
      // Reels is moved by its own Next control, which is never disabled, and takes a press while it is still scrolling
      // (qa/skip-timing-instagram.md). The address of a reel changes a little before the reel is on screen enough to be moved on
      // from (at least 60% of it), so look again every 50 ms until it is.
      advanceGapMs: 100,
      ready: () => visibleVideo() != null,
      watchScroll: true,
    });
  },
});
