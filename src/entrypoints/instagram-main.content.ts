import { defineContentScript } from "wxt/utils/define-content-script";
import { instagramReelId, visibleVideo } from "../content/page";
import { extractInstagram } from "../platforms/extract";
import { createEmbeddedReader, createItemBridge } from "../platforms/item-bridge";
import { instagramHasVisibleAd } from "../platforms/instagram-player";
import { observeJsonResponses } from "../platforms/observe";

export default defineContentScript({
  matches: ["https://www.instagram.com/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    const bridge = createItemBridge("instagram", () => {
      const id = instagramReelId();
      return id ? { id, creatorId: null } : null;
    });
    const ingest = (data: unknown) => bridge.ingest(extractInstagram(data));
    const readJson = createEmbeddedReader(ingest);
    observeJsonResponses((url) => url.includes("instagram.com") && (url.includes("graphql") || url.includes("/api/")), ingest);
    const readEmbedded = () => {
      for (const script of document.querySelectorAll("script")) {
        const text = script.textContent || "";
        if (text.length < 20 || text.length > 1500000) continue;
        if (!text.includes("like_count") && !text.includes("play_count")) continue;
        readJson(script, text);
      }
    };
    document.addEventListener("DOMContentLoaded", readEmbedded);
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const data = event.data as { source?: string; type?: string; key?: string; ad?: boolean } | null;
      if (!data || data.source !== "scrollplus" || data.type !== "advance" || (data.key !== "ArrowUp" && data.key !== "ArrowDown")) return;
      try {
        moveReel(data.key === "ArrowUp" ? "prev" : "next", data.ad === true);
      } catch {
        /* leave the page alone */
      }
    });
    window.setInterval(() => {
      readEmbedded();
      bridge.publish();
    }, 800);
  },
});

const NEXT = { label: /next|다음/i, key: "ArrowDown", code: 40 };
const PREV = { label: /previous|prev|이전/i, key: "ArrowUp", code: 38 };

// Click the reel navigation control from the page script, because a click sent from the
// extension's isolated world is ignored on the other two sites. Press the key only as a last resort.
function moveReel(direction: "next" | "prev", ad: boolean): void {
  if (direction === "next" && !ad && (!visibleVideo() || instagramHasVisibleAd())) return;
  const target = direction === "next" ? NEXT : PREV;
  for (const node of document.querySelectorAll("button, [role='button']")) {
    if (target.label.test(node.getAttribute("aria-label") || "") && node instanceof HTMLElement) {
      node.click();
      return;
    }
  }
  document.dispatchEvent(new KeyboardEvent("keydown", { key: target.key, code: target.key, keyCode: target.code, which: target.code, bubbles: true, cancelable: true }));
}
