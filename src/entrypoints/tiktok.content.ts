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
      // first. It answers a press made less than about 0.16 s after a video arrived in 0.23 s instead of 0.13 s, so a press at 150 ms
      // leaves the skipped video on screen longer than one at 180 ms does (qa/skip-timing-tiktok.md).
      // The sound is left alone: TikTok keeps a mute made by a script as the person's own choice for every later video.
      advanceGapMs: 100,
      settleMs: 180,
      watchScroll: true,
    });
  },
});
