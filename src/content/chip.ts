import { svgIcon } from "../lib/icons";
import { formatCount } from "../lib/numbers";
import { t } from "../lib/i18n";
import type { ChipPosition } from "../lib/score";
import type { ChipModel } from "./engine";

// A video is never closer to the window's edge than this many px when the chip is centred on it.
const EDGE_GAP_PX = 8;

const CSS = [
  ":host { all: initial; }",
  "*, *::before, *::after { box-sizing: border-box; }",
  // A dark body keeps the words readable on any video. The accent border and glow keep the chip itself visible on a dark one.
  ".chip { position: relative; font: 600 15px/1.2 ui-sans-serif, system-ui, -apple-system, 'Apple SD Gothic Neo', 'Segoe UI', sans-serif; color: #EEF5F4; background: #0D1414; border: 1.5px solid #59C5BF; border-radius: 999px; padding: 8px 8px 8px 10px; display: flex; gap: 12px; align-items: center; box-shadow: 0 0 22px rgba(89, 197, 191, 0.4), 0 12px 30px rgba(0, 0, 0, 0.55); animation: in 120ms ease-out both; white-space: nowrap; }",
  // One ring that widens and fades when the chip appears, to catch the eye without moving the chip.
  ".chip::after { content: ''; position: absolute; inset: -1.5px; border: 2px solid #59C5BF; border-radius: inherit; pointer-events: none; animation: ping 700ms ease-out both; }",
  ".chip.leaving { animation: out 200ms ease-out both; }",
  ".chip.leaving::after { display: none; }",
  ".chip.stack { flex-direction: column; align-items: stretch; border-radius: 20px; padding: 14px; gap: 12px; white-space: normal; max-width: 300px; }",
  ".dot { width: 28px; height: 28px; border-radius: 50%; background: #59C5BF; color: #031A19; display: grid; place-items: center; flex: none; }",
  ".dot svg { display: block; }",
  ".label { font-variant-numeric: tabular-nums; }",
  ".actions { display: flex; gap: 8px; }",
  "button { font: inherit; font-weight: 600; color: #EEF5F4; background: rgba(238, 245, 244, 0.12); border: 0; border-radius: 999px; min-height: 34px; padding: 8px 15px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: background 180ms ease-out; }",
  "button:hover { background: rgba(238, 245, 244, 0.18); }",
  "button:focus-visible { outline: 2px solid #59C5BF; outline-offset: 2px; }",
  "button.primary { background: #59C5BF; color: #031A19; }",
  "button.primary:hover { background: #6AD6CF; }",
  "@keyframes in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; } }",
  "@keyframes ping { from { inset: -1.5px; opacity: 0.85; } to { inset: -11px; opacity: 0; } }",
  "@keyframes out { from { opacity: 1; } to { opacity: 0; } }",
  "@media (prefers-reduced-motion: reduce) { .chip, .chip.leaving, .chip::after { animation-duration: 1ms; } }",
].join("\n");

function button(label: string, onClick: () => void, icon?: Parameters<typeof svgIcon>[0], primary = false): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  if (primary) node.className = "primary";
  if (icon) node.append(svgIcon(icon, 14));
  node.append(label);
  node.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return node;
}

function skippedLabel(model: Extract<ChipModel, { mode: "skipped" }>): string {
  if (model.metric === "ad") return t("chipAd");
  const count = formatCount(model.value);
  if (model.metric === "comments") return t("chipComments", count);
  if (model.metric === "views") return t("chipViews", count);
  return t("chipLikes", count);
}

export interface ChipOptions {
  // Where the chip sits. Defaults to "top".
  position?: () => ChipPosition;
  // The video the chip is centred on, when one is on screen. Without it the chip is centred on the window.
  anchor?: () => HTMLElement | null;
}

export function mountChip(actions: { undo: () => void; keepGoing: () => void; lower: () => void }, options: ChipOptions = {}) {
  let host: HTMLDivElement | null = null;
  let root: HTMLDivElement | null = null;
  let leaveTimer: number | null = null;
  let placeTimer: number | null = null;
  let previousModel = "null";
  // The centre of the video's column the last time a video was found. A feed that swaps its video elements has none for a moment.
  let lastCentre: number | null = null;

  function ensure(): void {
    if (host && root) return;
    host = document.createElement("div");
    host.id = "scrollplus-chip-host";
    host.style.position = "fixed";
    host.style.zIndex = "2147483646";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    root = document.createElement("div");
    shadow.append(style, root);
    (document.documentElement ?? document.body).append(host);
    window.addEventListener("resize", () => { lastCentre = null; place(); }, { passive: true });
  }

  // Centred on the video's column, high up, in the middle, or low but above the caption. The height is measured from the window,
  // not from the video: while TikTok scrolls to the next video its box is still moving, but its column is not.
  function place(): void {
    if (!host) return;
    const position = options.position?.() ?? "top";
    let box: DOMRect | null = null;
    try {
      box = options.anchor?.()?.getBoundingClientRect() ?? null;
    } catch {
      box = null;
    }
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = window.innerHeight;
    let center: number;
    if (box && box.width > 0 && box.right > 0 && box.left < width) {
      center = box.left + box.width / 2;
      lastCentre = center;
    } else {
      center = lastCentre ?? width / 2;
    }
    // Measure from the window's edge, where the chip has all the room it can use, and not from wherever it was left before.
    host.style.left = "0px";
    const half = host.getBoundingClientRect().width / 2;
    center = Math.min(Math.max(center, half + EDGE_GAP_PX), Math.max(half + EDGE_GAP_PX, width - half - EDGE_GAP_PX));
    host.style.left = Math.round(center) + "px";
    host.style.transform = position === "middle" ? "translate(-50%, -50%)" : "translateX(-50%)";
    host.style.top = position === "top" ? Math.round(Math.min(140, Math.max(24, height * 0.18))) + "px" : position === "middle" ? "50%" : "auto";
    host.style.bottom = position === "lower" ? Math.round(Math.min(220, Math.max(24, height * 0.28))) + "px" : "auto";
  }

  // Place the chip now, and once more a moment later: the video of a feed that is still swapping players may not be there yet.
  function settle(): void {
    place();
    if (placeTimer != null) window.clearTimeout(placeTimer);
    placeTimer = window.setTimeout(() => {
      placeTimer = null;
      place();
    }, 250);
  }

  function clearLeave() {
    if (leaveTimer != null) window.clearTimeout(leaveTimer);
    leaveTimer = null;
  }

  return {
    contains(target: EventTarget | null): boolean {
      return target instanceof Node && !!host?.contains(target);
    },
    update(model: ChipModel | null): void {
      if (!document.documentElement) return;
      const key = JSON.stringify(model);
      // Repeated feed polling must not replace the focused pause/Undo button.
      if (key === previousModel) return;
      previousModel = key;
      ensure();
      if (!root) return;
      clearLeave();
      // A skip that follows a skip changes the words of the chip that is already there. A new chip each time would flicker
      // once for every video in a row, and a chip button that has focus would be replaced.
      const shown = root.firstElementChild;
      if (model?.mode === "skipped" && shown instanceof HTMLElement && shown.dataset.mode === "skipped" && !shown.classList.contains("leaving")) {
        const label = shown.querySelector(".label");
        if (label) {
          label.textContent = skippedLabel(model);
          settle();
          return;
        }
      }
      if (!model) {
        const existing = root.firstElementChild;
        if (!existing) return;
        existing.classList.add("leaving");
        leaveTimer = window.setTimeout(() => {
          root?.replaceChildren();
          leaveTimer = null;
        }, 200);
        return;
      }
      const chip = document.createElement("div");
      chip.className = model.mode === "paused" ? "chip stack" : "chip";
      chip.dataset.mode = model.mode;
      chip.setAttribute("role", "status");
      if (model.mode === "skipped") {
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.append(svgIcon("streak", 16));
        const label = document.createElement("span");
        label.className = "label";
        label.textContent = skippedLabel(model);
        chip.append(dot, label, button(t("undo"), actions.undo, "undo"));
      } else {
        const label = document.createElement("span");
        label.className = "label";
        label.textContent = t("paused");
        const row = document.createElement("div");
        row.className = "actions";
        row.append(button(t("keepGoing"), actions.keepGoing, undefined, true));
        if (model.canLower) row.append(button(t("lowerBar"), actions.lower));
        chip.append(label, row);
      }
      root.replaceChildren(chip);
      settle();
    },
  };
}
