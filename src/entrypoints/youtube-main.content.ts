import { defineContentScript } from "wxt/utils/define-content-script";
import { youtubeShortId } from "../content/page";
import { extractYouTube, youtubeFollowPairs } from "../platforms/extract";
import { observeJsonResponses } from "../platforms/observe";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    let latest: unknown = null;
    const followedById = new Map<string, boolean>();
    const remember = (data: unknown) => {
      for (const pair of youtubeFollowPairs(data)) followedById.set(pair.id, pair.followed);
    };
    observeJsonResponses((url) => url.includes("youtube.com/youtubei/") && /reel|player|next/.test(url), remember);
    const publish = (player?: unknown) => {
      try {
        const id = youtubeShortId();
        if (!id) return;
        const source = player ?? latest ?? (window as Window & { ytInitialPlayerResponse?: unknown }).ytInitialPlayerResponse;
        const extracted = extractYouTube(source);
        if (!extracted || extracted.id !== id) return;
        if (followedById.has(extracted.id)) extracted.followed = followedById.get(extracted.id);
        window.postMessage({ source: "scrollplus", type: "item", item: { platform: "youtube", surface: "player", ...extracted } }, "*");
      } catch {
        /* leave the page alone */
      }
    };
    document.addEventListener("yt-navigate-finish", (event) => {
      const detail = (event as CustomEvent<{ response?: { playerResponse?: unknown } }>).detail;
      latest = detail?.response?.playerResponse ?? (window as Window & { ytInitialPlayerResponse?: unknown }).ytInitialPlayerResponse;
      remember(detail?.response ?? latest);
      publish(latest);
    });
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const data = event.data as { source?: string; type?: string; key?: string } | null;
      if (!data || data.source !== "scrollplus" || data.type !== "advance" || (data.key !== "ArrowUp" && data.key !== "ArrowDown")) return;
      const selector = data.key === "ArrowUp" ? "#navigation-button-up button" : "#navigation-button-down button";
      const button = document.querySelector(selector);
      if (button instanceof HTMLElement) button.click();
    });
    window.setInterval(() => publish(), 500);
  },
});
