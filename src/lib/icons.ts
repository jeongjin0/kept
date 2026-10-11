export type IconName =
  | "power" | "heart" | "comment" | "eye" | "youtube" | "tiktok" | "reels" | "sliders" | "star" | "grid"
  | "pill" | "trash" | "plus" | "minus" | "reset" | "user" | "check" | "undo" | "forward" | "megaphone";

export type Shape =
  | { t: "path"; d: string; fill?: boolean }
  | { t: "rect"; x: number; y: number; w: number; h: number; r: number }
  | { t: "circle"; cx: number; cy: number; r: number; fill?: boolean };

const p = (d: string, fill = false): Shape => ({ t: "path", d, fill });
const r = (x: number, y: number, w: number, h: number, rx: number): Shape => ({ t: "rect", x, y, w, h, r: rx });
const c = (cx: number, cy: number, radius: number, fill = false): Shape => ({ t: "circle", cx, cy, r: radius, fill });

export const ICONS: Record<IconName, Shape[]> = {
  power: [p("M8 2.2v5.4"), p("M4.7 4.5a5.2 5.2 0 1 0 6.6 0")],
  heart: [p("M8 13.3S2.5 10.1 2.5 6.2A2.9 2.9 0 0 1 8 4.9a2.9 2.9 0 0 1 5.5 1.3c0 3.9-5.5 7.1-5.5 7.1Z")],
  comment: [p("M3.4 3h9.2A1.4 1.4 0 0 1 14 4.4v5.2a1.4 1.4 0 0 1-1.4 1.4H8l-3.2 2.4V11h-1.4A1.4 1.4 0 0 1 2 9.6V4.4A1.4 1.4 0 0 1 3.4 3Z")],
  eye: [p("M1.5 8S3.8 3.8 8 3.8 14.5 8 14.5 8 12.2 12.2 8 12.2 1.5 8 1.5 8Z"), c(8, 8, 1.9)],
  youtube: [r(3.6, 1.8, 8.8, 12.4, 2.4), p("M6.5 5.3v5.4L10.9 8 6.5 5.3Z", true)],
  tiktok: [p("M9.4 2.3v7.5a2.5 2.5 0 1 1-2.5-2.5"), p("M9.4 2.3c.3 1.9 1.4 3 3.3 3.2")],
  reels: [r(2.2, 2.2, 11.6, 11.6, 3.2), p("M2.4 5.7h11.2"), p("M5.9 2.3l1.5 3.4M9.5 2.3 11 5.7"), p("M7 8.4v3l2.6-1.5L7 8.4Z", true)],
  sliders: [p("M2.4 4.6h6.1M11.4 4.6h2.2M2.4 11.4h2.2M7.4 11.4h6.2"), c(10, 4.6, 1.4), c(6, 11.4, 1.4)],
  star: [p("m8 2.1 1.7 3.5 3.8.5-2.8 2.7.7 3.8L8 10.7l-3.4 1.9.7-3.8L2.5 6.1l3.8-.5L8 2.1Z")],
  grid: [r(2.4, 2.4, 4.4, 4.4, 1.2), r(9.2, 2.4, 4.4, 4.4, 1.2), r(2.4, 9.2, 4.4, 4.4, 1.2), r(9.2, 9.2, 4.4, 4.4, 1.2)],
  pill: [r(1.8, 4.6, 12.4, 6.8, 3.4), p("M5.4 8h5.2")],
  trash: [p("M3 4.6h10M6.3 4.6V3.1h3.4v1.5M4.2 4.6l.5 8.2h6.6l.5-8.2")],
  plus: [p("M8 3.4v9.2M3.4 8h9.2")],
  minus: [p("M3.4 8h9.2")],
  reset: [p("M2.8 8a5.2 5.2 0 1 0 1.7-3.9"), p("M2.8 2.6v3h3")],
  user: [c(8, 5.5, 2.5), p("M3.2 13.5c.4-2.5 2.2-3.9 4.8-3.9s4.4 1.4 4.8 3.9")],
  check: [p("m3.4 8.4 3 3 6.2-6.4")],
  undo: [p("M5.4 3.2 2.8 5.8l2.6 2.6"), p("M3 5.8h6.2a3.5 3.5 0 0 1 0 7H6.4")],
  forward: [p("M3.6 3.8 9 8l-5.4 4.2V3.8Z"), p("M12.4 3.4v9.2")],
  megaphone: [p("M2.6 6.2h2.2l5.6-2.8v9.2L4.8 9.8H2.6a.8.8 0 0 1-.8-.8V7a.8.8 0 0 1 .8-.8Z"), p("M5 9.9l.8 2.9h1.8l-.6-2.4"), p("M12.6 6.4a2.6 2.6 0 0 1 0 3.2")],
};

const NS = "http://www.w3.org/2000/svg";

export function svgIcon(name: IconName, size = 16): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const shape of ICONS[name]) {
    const node = document.createElementNS(NS, shape.t);
    if (shape.t === "path") node.setAttribute("d", shape.d);
    if (shape.t === "rect") {
      node.setAttribute("x", String(shape.x));
      node.setAttribute("y", String(shape.y));
      node.setAttribute("width", String(shape.w));
      node.setAttribute("height", String(shape.h));
      node.setAttribute("rx", String(shape.r));
    }
    if (shape.t === "circle") {
      node.setAttribute("cx", String(shape.cx));
      node.setAttribute("cy", String(shape.cy));
      node.setAttribute("r", String(shape.r));
    }
    if ((shape.t === "path" || shape.t === "circle") && shape.fill) {
      node.setAttribute("fill", "currentColor");
      node.setAttribute("stroke", "none");
    }
    svg.append(node);
  }
  return svg;
}
