import { svgIcon } from "../lib/icons";
import { formatCount } from "../lib/numbers";
import { t } from "../lib/i18n";
import type { ChipModel } from "./engine";

const CSS = [
  ":host { all: initial; }",
  "*, *::before, *::after { box-sizing: border-box; }",
  ".chip { font: 500 14px/1.2 ui-sans-serif, system-ui, -apple-system, 'Apple SD Gothic Neo', 'Segoe UI', sans-serif; color: #F4F1EA; background: #10110F; border: 1px solid rgba(244, 241, 234, 0.2); border-radius: 999px; padding: 7px 7px 7px 9px; display: flex; gap: 10px; align-items: center; box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45); animation: in 120ms ease-out both; white-space: nowrap; }",
  ".chip.leaving { animation: out 200ms ease-out both; }",
  ".chip.stack { flex-direction: column; align-items: stretch; border-radius: 18px; padding: 14px; gap: 12px; white-space: normal; max-width: 280px; }",
  ".dot { width: 24px; height: 24px; border-radius: 50%; background: #FF4D2E; color: #10110F; display: grid; place-items: center; flex: none; }",
  ".dot svg { display: block; }",
  ".label { font-variant-numeric: tabular-nums; }",
  ".actions { display: flex; gap: 8px; }",
  "button { font: inherit; font-weight: 600; color: #F4F1EA; background: rgba(244, 241, 234, 0.1); border: 0; border-radius: 999px; padding: 7px 13px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: background 180ms ease-out; }",
  "button:hover { background: rgba(244, 241, 234, 0.18); }",
  "button:focus-visible { outline: 2px solid #FF4D2E; outline-offset: 2px; }",
  "button.primary { background: #FF4D2E; color: #10110F; }",
  "button.primary:hover { background: #FF6446; }",
  "@keyframes in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }",
  "@keyframes out { from { opacity: 1; } to { opacity: 0; } }",
  "@media (prefers-reduced-motion: reduce) { .chip, .chip.leaving { animation-duration: 1ms; } }",
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

export function mountChip(actions: { undo: () => void; keepGoing: () => void; lower: () => void }) {
  let host: HTMLDivElement | null = null;
  let root: HTMLDivElement | null = null;
  let leaveTimer: number | null = null;
  let previousModel = "null";

  function ensure(): void {
    if (host && root) return;
    host = document.createElement("div");
    host.id = "scrollplus-chip-host";
    host.style.position = "fixed";
    host.style.left = "50%";
    host.style.bottom = "32px";
    host.style.transform = "translateX(-50%)";
    host.style.zIndex = "2147483646";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    root = document.createElement("div");
    shadow.append(style, root);
    (document.documentElement ?? document.body).append(host);
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
        dot.append(svgIcon("forward", 12));
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
    },
  };
}
