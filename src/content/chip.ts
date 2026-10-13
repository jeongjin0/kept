import { svgIcon } from "../lib/icons";
import { formatCount } from "../lib/numbers";
import { t } from "../lib/i18n";
import type { ChipPosition } from "../lib/score";
import type { ChipModel, ChipReason } from "./engine";

// A video is never closer to the window's edge than this many px when the chip is centred on it.
const EDGE_GAP_PX = 8;
// The chip is a card this wide. Beside a video it keeps this much clear of the video's edge.
const CARD_WIDTH_PX = 228;
const SIDE_GAP_PX = 16;
// To the right of a video the sites put a column of buttons (like, comment, share). The card starts after it.
const RIGHT_BUTTONS_PX = 78;

const CSS = [
  ":host { all: initial; }",
  "*, *::before, *::after { box-sizing: border-box; }",
  // A dark body keeps the words readable on any video. The accent border and glow keep the chip itself visible on a dark one.
  ".chip { position: relative; width: 228px; font: 600 14.5px/1.3 ui-sans-serif, system-ui, -apple-system, 'Apple SD Gothic Neo', 'Segoe UI', sans-serif; color: #EEF5F4; background: #0D1414; border: 1.5px solid #59C5BF; border-radius: 18px; padding: 12px; display: grid; gap: 10px; box-shadow: 0 0 22px rgba(89, 197, 191, 0.4), 0 12px 30px rgba(0, 0, 0, 0.55); animation: in 120ms ease-out both; }",
  // One ring that widens and fades when the chip appears, to catch the eye without moving the chip.
  ".chip::after { content: ''; position: absolute; inset: -1.5px; border: 2px solid #59C5BF; border-radius: inherit; pointer-events: none; animation: ping 700ms ease-out both; }",
  ".chip.leaving { animation: out 200ms ease-out both; }",
  ".chip.leaving::after { display: none; }",
  ".head { display: flex; align-items: center; gap: 10px; min-width: 0; }",
  ".dot { width: 26px; height: 26px; border-radius: 50%; background: #59C5BF; color: #031A19; display: grid; place-items: center; flex: none; }",
  ".dot svg { display: block; }",
  ".label { font-variant-numeric: tabular-nums; min-width: 0; }",
  ".label.run { color: #59C5BF; font-size: 13.5px; }",
  ".rows { display: grid; gap: 6px; }",
  ".rows:empty { display: none; }",
  ".r { display: flex; align-items: center; gap: 8px; font-variant-numeric: tabular-nums; }",
  ".r::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #59C5BF; flex: none; }",
  ".r:nth-child(n+2) { font-weight: 500; font-size: 13.5px; color: #99ACAB; }",
  ".chip.pause { gap: 12px; }",
  ".actions { display: grid; gap: 8px; }",
  "button { font: inherit; font-weight: 600; color: #EEF5F4; background: rgba(238, 245, 244, 0.12); border: 0; border-radius: 999px; min-height: 34px; padding: 8px 15px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: background 180ms ease-out; }",
  "button:hover { background: rgba(238, 245, 244, 0.18); }",
  "button:focus-visible { outline: 2px solid #59C5BF; outline-offset: 2px; }",
  "button.primary { background: #59C5BF; color: #031A19; }",
  "button.primary:hover { background: #6AD6CF; }",
  // Where there is no room beside the video the card shrinks to a pill: the mark, how many in a row, and Undo.
  ".chip.compact { width: 52px; padding: 8px 0; gap: 6px; justify-items: center; border-radius: 26px; }",
  ".chip.compact .head { flex-direction: column; gap: 4px; }",
  ".chip.compact .label, .chip.compact .rows, .chip.compact .txt { display: none; }",
  ".chip.compact button { width: 34px; min-height: 34px; padding: 0; border-radius: 50%; }",
  ".count { display: none; font-size: 13px; font-variant-numeric: tabular-nums; }",
  ".chip.compact .count { display: block; }",
  "@keyframes in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; } }",
  "@keyframes ping { from { inset: -1.5px; opacity: 0.85; } to { inset: -11px; opacity: 0; } }",
  "@keyframes out { from { opacity: 1; } to { opacity: 0; } }",
  "@media (prefers-reduced-motion: reduce) { .chip, .chip.leaving, .chip::after { animation-duration: 1ms; } }",
].join("\n");

function button(label: string, onClick: () => void, icon?: Parameters<typeof svgIcon>[0], primary = false): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  node.setAttribute("aria-label", label);
  if (primary) node.className = "primary";
  if (icon) node.append(svgIcon(icon, 14));
  const text = document.createElement("span");
  text.className = "txt";
  text.textContent = label;
  node.append(text);
  node.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return node;
}

function reasonLabel(reason: ChipReason): string {
  if (reason.metric === "ad") return t("chipAd");
  const count = formatCount(reason.value);
  if (reason.metric === "comments") return t("chipComments", count);
  if (reason.metric === "views") return t("chipViews", count);
  return t("chipLikes", count);
}

function span(className: string, text: string): HTMLSpanElement {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}

export interface ChipOptions {
  // Where the chip sits. Defaults to "side": beside the video, so that none of the video is covered.
  position?: () => ChipPosition;
  // The video the chip is placed by, when one is on screen. Without it the chip is centred on the window.
  anchor?: () => HTMLElement | null;
}

// Something a person reads or presses on a site. The chip is never put on top of one of these.
const BUSY = "a, button, input, textarea, select, video, iframe, img, canvas, [role='button'], [role='link'], [role='menuitem'], [role='textbox']";

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

  function chipNode(): HTMLElement | null {
    const node = root?.firstElementChild;
    return node instanceof HTMLElement ? node : null;
  }

  // Is this part of the window clear of anything a person reads or presses? Nine points of the rectangle are looked at.
  function isFree(left: number, top: number, width: number, height: number): boolean {
    const w = document.documentElement.clientWidth || window.innerWidth;
    const h = window.innerHeight;
    if (left < EDGE_GAP_PX || top < EDGE_GAP_PX || left + width > w - EDGE_GAP_PX || top + height > h - EDGE_GAP_PX) return false;
    try {
      for (const fx of [0.05, 0.5, 0.95]) {
        for (const fy of [0.05, 0.5, 0.95]) {
          const stack = document.elementsFromPoint(left + width * fx, top + height * fy);
          const top1 = stack.find((node) => node !== host);
          if (top1 && top1.closest(BUSY)) return false;
        }
      }
    } catch {
      return true;
    }
    return true;
  }

  // Beside the video, where nothing of it is covered: its left side first, then its right. A card needs the room of a card. Where
  // there is less, a pill is used for a skip, and a pause chip with its two buttons goes over the video as it did before.
  function placeSide(box: DOMRect, paused: boolean): boolean {
    const chip = chipNode();
    if (!host || !chip) return false;
    const height = window.innerHeight;
    // The middle of the window. A feed such as TikTok's scrolls to the next video while the chip is up, so the video's own box is moving
    // and its middle is not where it will rest. The video is as tall as the window or nearly, so the window's middle is its middle.
    const middle = height / 2;
    const tries: Array<{ compact: boolean; right: boolean }> = [
      { compact: false, right: false },
      { compact: false, right: true },
      ...(paused ? [] : [{ compact: true, right: false }, { compact: true, right: true }]),
    ];
    for (const attempt of tries) {
      chip.classList.toggle("compact", attempt.compact);
      host.style.left = "0px";
      host.style.top = "0px";
      host.style.transform = "none";
      host.style.bottom = "auto";
      const rect = host.getBoundingClientRect();
      const left = attempt.right ? box.right + RIGHT_BUTTONS_PX : box.left - SIDE_GAP_PX - rect.width;
      const top = Math.min(Math.max(middle - rect.height / 2, 72), Math.max(72, height - rect.height - 24));
      if (!isFree(left, top, rect.width, rect.height)) continue;
      host.style.left = Math.round(left) + "px";
      host.style.top = Math.round(top) + "px";
      return true;
    }
    chip.classList.remove("compact");
    return false;
  }

  // Over the video, centred on its column: high up, in the middle, or low but above the caption. The height is measured from the
  // window, not from the video: while TikTok scrolls to the next video its box is still moving, but its column is not.
  function placeOver(position: ChipPosition, box: DOMRect | null): void {
    if (!host) return;
    chipNode()?.classList.remove("compact");
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
    host.style.top = position === "lower" ? "auto" : position === "middle" ? "50%" : Math.round(Math.min(140, Math.max(24, height * 0.18))) + "px";
    host.style.bottom = position === "lower" ? Math.round(Math.min(220, Math.max(24, height * 0.28))) + "px" : "auto";
  }

  function place(): void {
    if (!host) return;
    const position = options.position?.() ?? "side";
    let box: DOMRect | null = null;
    try {
      box = options.anchor?.()?.getBoundingClientRect() ?? null;
    } catch {
      box = null;
    }
    const width = document.documentElement.clientWidth || window.innerWidth;
    const onScreen = !!box && box.width > 0 && box.right > 0 && box.left < width;
    if (position === "side" && box && onScreen && placeSide(box, chipNode()?.dataset.mode === "paused")) return;
    placeOver(position === "side" ? "top" : position, box);
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

  // The head says what happened, and below it a row of skips lists each reason, newest first. The Undo button is kept as it is.
  function fillSkipped(chip: HTMLElement, model: Extract<ChipModel, { mode: "skipped" }>): void {
    const head = chip.querySelector(".head");
    const rows = chip.querySelector(".rows");
    if (!(head instanceof HTMLElement) || !(rows instanceof HTMLElement)) return;
    const run = model.run && model.run.length > 1 ? model.run : null;
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.append(svgIcon("streak", 16));
    const total = run ? run.length : 1;
    head.replaceChildren(dot, run ? span("label run", t("chipRun", total)) : span("label", reasonLabel(model)), span("count", total > 1 ? "×" + total : ""));
    rows.replaceChildren(...(run ? run.map((reason) => span("r", reasonLabel(reason))) : []));
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
      // A skip that follows a skip adds a line to the chip that is already there. A new chip each time would flicker once for every
      // video in a row, and a chip button that has focus would be replaced.
      const shown = chipNode();
      if (model?.mode === "skipped" && shown && shown.dataset.mode === "skipped" && !shown.classList.contains("leaving")) {
        fillSkipped(shown, model);
        settle();
        return;
      }
      if (!model) {
        const existing = chipNode();
        if (!existing) return;
        existing.classList.add("leaving");
        leaveTimer = window.setTimeout(() => {
          root?.replaceChildren();
          leaveTimer = null;
        }, 200);
        return;
      }
      const chip = document.createElement("div");
      chip.className = model.mode === "paused" ? "chip pause" : "chip";
      chip.dataset.mode = model.mode;
      chip.setAttribute("role", "status");
      if (model.mode === "skipped") {
        const head = document.createElement("div");
        head.className = "head";
        const rows = document.createElement("div");
        rows.className = "rows";
        chip.append(head, rows, button(t("undo"), actions.undo, "undo"));
        fillSkipped(chip, model);
      } else {
        const head = document.createElement("div");
        head.className = "head";
        head.append(span("label", t("paused")));
        const row = document.createElement("div");
        row.className = "actions";
        row.append(button(t("keepGoing"), actions.keepGoing, undefined, true));
        if (model.canLower) row.append(button(t("lowerBar"), actions.lower));
        chip.append(head, row);
      }
      root.replaceChildren(chip);
      settle();
    },
  };
}

