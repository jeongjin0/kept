import { defineContentScript } from "wxt/utils/define-content-script";
import { startFilter } from "../content/controller";
import { gridAnchors, moveUntilIdChanges, youtubeShortId } from "../content/page";
import type { SkipReason } from "../content/engine";
import { youtubeHasActiveAd } from "../platforms/youtube-player";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  runAt: "document_start",
  main() {
    // YouTube announces the start of every move between Shorts. In QA it came within 0.53 s of every press the site acted on,
    // and never after a press it ignored (for example while it was still loading the next batch of Shorts).
    let moveStarts = 0;
    document.addEventListener("yt-navigate-start", () => {
      moveStarts += 1;
    });
    startFilter({
      platform: "youtube",
      readActive: () => {
        const id = youtubeShortId();
        return id ? { id, creatorId: null, kind: youtubeHasActiveAd() ? "ad" as const : undefined } : null;
      },
      advance: (reason) => {
        const startsAtPress = moveStarts;
        // Counted, not timed, so a move that starts in the same millisecond as the press still counts. Inert until the page has
        // announced a move at least once, so a change in the site can only bring back the plain wait.
        const begun = () => moveStarts === 0 || moveStarts > startsAtPress;
        return quietly(() => moveUntilIdChanges(() => requestMove("ArrowDown", reason), youtubeShortId, { repress: { afterMs: 700, everyMs: 400, begun } }));
      },
      retreat: () => moveUntilIdChanges(() => requestMove("ArrowUp"), youtubeShortId),
      listGrid: () => gridAnchors(/\/shorts\/([^/?#]+)/),
      advanceGapMs: 150,
    });
  },
});

function requestMove(key: "ArrowDown" | "ArrowUp", reason?: SkipReason): boolean {
  // Check again at the moment of the click: an ad is only ever moved on from for being an ad, and a
  // video never because the slot was an ad a moment ago.
  if (key === "ArrowDown" && reason && youtubeHasActiveAd() !== (reason === "ad")) return false;
  window.postMessage({ source: "scrollplus", type: "advance", key }, "*");
  return true;
}

// A Short that is being skipped has already started to play and stays on screen for about half a second. Keep it quiet for that
// time. The site sets the volume again when it loads the next Short; if the move does not happen the player is put back here.
async function quietly<T>(move: () => Promise<T>): Promise<T> {
  const video = document.querySelector<HTMLVideoElement>("ytd-reel-video-renderer video") ?? document.querySelector<HTMLVideoElement>("video");
  const mutedHere = !!video && !video.muted;
  if (video && mutedHere) video.muted = true;
  try {
    return await move();
  } finally {
    if (video && mutedHere && video.muted) video.muted = false;
  }
}
