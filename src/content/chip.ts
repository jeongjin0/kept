import { svgIcon } from "../lib/icons";
import { formatCount } from "../lib/numbers";
import { t } from "../lib/i18n";
import type { ChipModel, ChipReason } from "./engine";

// Keep the chip inside the viewport as well as outside the video.
const EDGE_GAP_PX = 8;
const SIDE_GAP_PX = 16;
const COMPACT_GAP_PX = 8;

const CSS = [
  ":host { all: initial; }",
  "*, *::before, *::after { box-sizing: border-box; }",
  ".chip { position: relative; width: 228px; font: 600 14.5px/1.3 ui-sans-serif, system-ui, -apple-system, 'Apple SD Gothic Neo', 'Segoe UI', sans-serif; color: #EEF5F4; background: #0D1414; border: 1px solid rgba(89, 197, 191, 0.24); border-radius: 18px; padding: 12px; display: grid; gap: 10px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2); animation: in 120ms ease-out both; }",
  ".chip.leaving { animation: out 200ms ease-out both; }",
  ".head { display: flex; align-items: center; gap: 10px; min-width: 0; }",
  ".dot { width: 26px; height: 26px; border-radius: 50%; background: #59C5BF; color: #031A19; display: grid; place-items: center; flex: none; }",
  ".dot svg { display: block; }",
  ".label { font-variant-numeric: tabular-nums; min-width: 0; }",
  ".chip:not(.compact) .head.run { display: none; }",
  ".rows { display: grid; gap: 6px; }",
  ".rows:empty { display: none; }",
  ".r { display: flex; align-items: center; gap: 8px; font-variant-numeric: tabular-nums; }",
  ".r::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #59C5BF; flex: none; }",
  ".r:nth-child(n+2) { font-weight: 500; font-size: 13.5px; color: #99ACAB; }",
  ".head .count { display: none; }",
  ".chip.pause { gap: 12px; }",
  ".actions { display: grid; gap: 8px; }",
  "button { font: inherit; font-weight: 600; color: #EEF5F4; background: rgba(238, 245, 244, 0.12); border: 0; border-radius: 999px; min-height: 34px; padding: 8px 15px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: background 180ms ease-out; }",
  "button:hover { background: rgba(238, 245, 244, 0.18); }",
  "button:focus-visible { outline: 2px solid #59C5BF; outline-offset: 2px; }",
  "button.primary { background: #59C5BF; color: #031A19; }",
  "button.primary:hover { background: #6AD6CF; }",
  // A comments panel can leave only 62 px between the guide and the video. No logo or reasons in this narrow state.
  ".chip.compact { width: 44px; padding: 6px 0 2px; gap: 4px; justify-items: center; border-radius: 22px; }",
  ".chip.compact .head { justify-content: center; padding: 4px 0; }",
  ".chip.compact .dot, .chip.compact .label, .chip.compact .rows, .chip.compact .txt, .chip.compact.pause .head { display: none; }",
  ".chip.compact button { width: 40px; min-height: 40px; padding: 0; border-radius: 20px; background: transparent; color: #59C5BF; }",
  ".chip.compact button:hover { background: rgba(238, 245, 244, 0.1); }",
  ".chip.compact button svg { width: 18px; height: 18px; }",
  ".chip.compact:not(.pause) button { border-top: 1px solid rgba(238, 245, 244, 0.12); border-top-left-radius: 0; border-top-right-radius: 0; }",
  ".chip.compact .actions { gap: 2px; }",
  ".count { font-size: 14px; font-variant-numeric: tabular-nums; }",
  ".chip.compact .head .count { display: block; }",
  "@keyframes in { from { opacity: 0; } to { opacity: 1; } }",
  "@keyframes out { from { opacity: 1; } to { opacity: 0; } }",
  "@media (prefers-reduced-motion: reduce) { .chip, .chip.leaving { animation-duration: 1ms; } }",
].join("\n");

function button(label: string, onClick: () => void, icon?: Parameters<typeof svgIcon>[0], primary = false): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  node.setAttribute("aria-label", label);
  node.title = label;
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
  // Without an on-screen anchor, a side chip stays hidden until a video is available.
  anchor?: () => HTMLElement | null;
}

// Something a person reads or presses on a site. The chip is never put on top of one of these.
const BUSY = "a, button, input, textarea, select, video, iframe, img, canvas, p, h1, h2, h3, h4, h5, h6, li, nav, aside, [role='button'], [role='link'], [role='menuitem'], [role='textbox'], [role='dialog'], [role='menu'], ytd-guide-renderer, ytd-engagement-panel-section-list-renderer";

export function mountChip(actions: { undo: () => void; keepGoing: () => void; lower: () => void }, options: ChipOptions = {}) {
  let host: HTMLDivElement | null = null;
  let root: HTMLDivElement | null = null;
  let leaveTimer: number | null = null;
  let placeTimer: number | null = null;
  let previousModel = "null";
  let watching = false;
  let frame: number | null = null;
  let motionUntil = 0;
  let watchedAnchor: HTMLElement | null = null;
  const ancestors = new Set<Element>();
  const resized = new ResizeObserver(() => queuePlace());
  const structure = new MutationObserver((records) => {
    if (records.some((record) => {
      if (record.target === host) return false;
      if (record.type === "childList") return ![...record.addedNodes, ...record.removedNodes].every((node) => node === host);
      const target = record.target;
      return target instanceof Element && (ancestors.has(target) || !!target.closest(BUSY) ||
        [...target.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()));
    })) queuePlace();
  });

  function ensure(): void {
    if (host && root) return;
    host = document.createElement("div");
    host.id = "scrollplus-chip-host";
    host.style.position = "fixed";
    host.style.zIndex = "2147483646";
    host.style.visibility = "hidden";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    root = document.createElement("div");
    shadow.append(style, root);
    (document.documentElement ?? document.body).append(host);
    window.addEventListener("resize", () => queuePlace(), { passive: true });
    window.addEventListener("scroll", () => queuePlace(), { capture: true, passive: true });
    document.addEventListener("transitionrun", (event) => {
      if (!watching || !(event.target instanceof Element) || !ancestors.has(event.target)) return;
      // Follow the moving column while a panel animates. There is no repeating placement work on an idle page.
      motionUntil = performance.now() + 600;
      queuePlace();
    }, true);
    document.addEventListener("transitionend", () => queuePlace(), true);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopWatching();
      else if (previousModel !== "null") { startWatching(); place(); }
    });
  }

  function queuePlace(): void {
    if (!watching || document.hidden || frame != null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!watching || document.hidden) return;
      place();
      if (performance.now() < motionUntil) queuePlace();
    });
  }

  function watchAnchor(anchor: HTMLElement | null): void {
    const chain: Element[] = [];
    for (let node: Element | null = anchor; node; node = node.parentElement) chain.push(node);
    // Sites may keep the video node but move its player into another container.
    if (anchor === watchedAnchor && chain.length === ancestors.size && [...ancestors].every((node, index) => node === chain[index])) return;
    resized.disconnect();
    ancestors.clear();
    watchedAnchor = anchor;
    for (const node of chain) {
      ancestors.add(node);
      resized.observe(node);
    }
  }

  function startWatching(): void {
    if (watching || document.hidden) return;
    watching = true;
    structure.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class", "hidden", "aria-expanded"] });
  }

  function stopWatching(): void {
    watching = false;
    structure.disconnect();
    resized.disconnect();
    ancestors.clear();
    watchedAnchor = null;
    motionUntil = 0;
    if (frame != null) cancelAnimationFrame(frame);
    frame = null;
    if (placeTimer != null) window.clearTimeout(placeTimer);
    placeTimer = null;
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
          // Transparent layout wrappers can sit above visible navigation. Check the stack, not just its first element.
          if (stack.some((node) => node !== host && node.closest(BUSY))) return false;
          if (top1 && [...top1.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())) return false;
        }
      }
    } catch {
      return false;
    }
    return true;
  }

  // Use only the left gutter. If even the compact chip would cover the page, do not show it there.
  function placeSide(box: DOMRect): boolean {
    const chip = chipNode();
    if (!host || !chip) return false;
    const height = window.innerHeight;
    // The middle of the window. A feed such as TikTok's scrolls to the next video while the chip is up, so the video's own box is moving
    // and its middle is not where it will rest. The video is as tall as the window or nearly, so the window's middle is its middle.
    const middle = height / 2;
    for (const compact of [false, true]) {
      chip.classList.toggle("compact", compact);
      host.style.transform = "none";
      host.style.bottom = "auto";
      const { width, height: chipHeight } = chip.getBoundingClientRect();
      const left = box.left - (compact ? COMPACT_GAP_PX : SIDE_GAP_PX) - width;
      const top = Math.min(Math.max(middle - chipHeight / 2, 72), Math.max(72, height - chipHeight - 24));
      if (!isFree(left, top, width, chipHeight)) continue;
      host.style.left = left + "px";
      host.style.top = top + "px";
      return true;
    }
    return false;
  }

  function place(): void {
    if (!host || !chipNode() || document.hidden) return;
    let box: DOMRect | null = null;
    try {
      const anchor = options.anchor?.() ?? null;
      if (watching) watchAnchor(anchor);
      box = anchor?.getBoundingClientRect() ?? null;
    } catch {
      box = null;
    }
    const width = document.documentElement.clientWidth || window.innerWidth;
    const onScreen = !!box && box.width > 0 && box.height > 0 && box.right > 0 && box.left < width && box.bottom > 0 && box.top < window.innerHeight;
    // Hide before measuring or moving, so a comments panel cannot reveal a stale position over the video.
    host.style.visibility = "hidden";
    if (!box || !onScreen || !placeSide(box)) return;
    host.style.visibility = "visible";
  }

  // Place the chip now, and once more a moment later: the video of a feed that is still swapping players may not be there yet.
  function settle(): void {
    if (document.hidden) return;
    startWatching();
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
    // The narrow chip is just a count and Undo. Keep the reasons available in its tooltip and accessible name.
    head.classList.toggle("run", !!run);
    head.replaceChildren(dot, span("count", String(run?.length ?? 1)), ...(run ? [] : [span("label", reasonLabel(model))]));
    rows.replaceChildren(...(run ? run.map((reason) => span("r", reasonLabel(reason))) : []));
    chip.title = (run ?? [model]).map(reasonLabel).join("\n");
    chip.setAttribute("aria-label", chip.title);
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
        stopWatching();
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
        chip.title = t("paused");
        chip.setAttribute("aria-label", t("paused"));
        row.append(button(t("keepGoing"), actions.keepGoing, "streak", true));
        if (model.canLower) row.append(button(t("lowerBar"), actions.lower, "minus"));
        chip.append(head, row);
      }
      root.replaceChildren(chip);
      settle();
    },
  };
}

