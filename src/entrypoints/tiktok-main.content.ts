import { defineContentScript } from "wxt/utils/define-content-script";
import { tiktokActive, tiktokControl } from "../content/page";
import { extractTikTok } from "../platforms/extract";
import { createEmbeddedReader, createItemBridge } from "../platforms/item-bridge";
import { observeJsonResponses } from "../platforms/observe";

export default defineContentScript({
  matches: ["https://www.tiktok.com/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    const bridge = createItemBridge("tiktok", tiktokActive, true);
    const ingest = (data: unknown) => bridge.ingest(extractTikTok(data));
    const readJson = createEmbeddedReader(ingest);
    observeJsonResponses((url) => url.includes("tiktok.com") && (url.includes("/api/") || url.includes("item_list")), ingest);
    const readEmbedded = () => {
      for (const id of ["__UNIVERSAL_DATA_FOR_REHYDRATION__", "SIGI_STATE"]) {
        const node = document.getElementById(id);
        const text = node?.textContent;
        if (node && text) readJson(node, text);
      }
    };
    document.addEventListener("DOMContentLoaded", readEmbedded);
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const data = event.data as { source?: string; type?: string; key?: string } | null;
      if (!data || data.source !== "scrollplus" || data.type !== "advance" || (data.key !== "ArrowUp" && data.key !== "ArrowDown")) return;
      try {
        moveFeed(data.key === "ArrowUp" ? "prev" : "next");
      } catch {
        /* leave the page alone */
      }
    });
    window.setInterval(() => {
      readEmbedded();
      bridge.publish();
    }, 700);
  },
});

const KEYS = { next: { key: "ArrowDown", code: 40 }, prev: { key: "ArrowUp", code: 38 } };

function moveFeed(direction: "next" | "prev"): void {
  const control = tiktokControl(direction);
  if (control) {
    control.click();
    return;
  }
  const { key, code } = KEYS[direction];
  document.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, keyCode: code, which: code, bubbles: true, cancelable: true }));
}
