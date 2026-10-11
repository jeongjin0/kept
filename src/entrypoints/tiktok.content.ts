import { defineContentScript } from "wxt/utils/define-content-script";
import { startFilter } from "../content/controller";
import { gridAnchors, moveUntilIdChanges, tiktokActive, tiktokMarker, tiktokNextReady } from "../content/page";

function requestMove(key: "ArrowDown" | "ArrowUp"): boolean {
  window.postMessage({ source: "scrollplus", type: "advance", key }, "*");
  return true;
}

export default defineContentScript({
  matches: ["https://www.tiktok.com/*"],
  runAt: "document_start",
  main() {
    startFilter({
      platform: "tiktok",
      readActive: () => tiktokActive(),
      advance: () => moveUntilIdChanges(() => requestMove("ArrowDown"), tiktokMarker),
      retreat: () => moveUntilIdChanges(() => requestMove("ArrowUp"), tiktokMarker),
      listGrid: () => gridAnchors(/@[^/]+\/video\/(\d+)/),
      // TikTok keeps its next control disabled until it has the next video, often for half a second and sometimes for two.
      ready: tiktokNextReady,
      // TikTok takes a second press while it is still scrolling, but ignores one made within a few hundredths of a second of the
      // first, and answers a press made 0.1-0.3 s after a video arrived as fast as one made at once (qa/skip-timing-tiktok.md).
      // The sound is left alone: TikTok keeps a mute made by a script as the person's own choice for every later video.
      advanceGapMs: 100,
      settleMs: 150,
      watchScroll: true,
    });
  },
});
