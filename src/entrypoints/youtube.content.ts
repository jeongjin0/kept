import { defineContentScript } from "wxt/utils/define-content-script";
import { startFilter } from "../content/controller";
import { gridAnchors, moveUntilIdChanges, youtubeShortId } from "../content/page";
import type { SkipReason } from "../content/engine";
import { youtubeHasActiveAd } from "../platforms/youtube-player";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  runAt: "document_start",
  main() {
    startFilter({
      platform: "youtube",
      readActive: () => {
        const id = youtubeShortId();
        return id ? { id, creatorId: null, kind: youtubeHasActiveAd() ? "ad" as const : undefined } : null;
      },
      advance: (reason) => moveUntilIdChanges(() => requestMove("ArrowDown", reason), youtubeShortId),
      retreat: () => moveUntilIdChanges(() => requestMove("ArrowUp"), youtubeShortId),
      listGrid: () => gridAnchors(/\/shorts\/([^/?#]+)/),
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
