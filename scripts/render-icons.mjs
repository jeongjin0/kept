import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const out = path.join(root, "public/icon");
fs.mkdirSync(out, { recursive: true });

// The mark: three streaks behind a play triangle on a rounded tile. Heavier strokes and no rim below 24 px so that it holds at 16.
const mark = (size) => {
  const small = size <= 24;
  const line = small ? 3.6 : 3;
  const tri = small ? 3 : 2.6;
  const rim = small ? "" : '<rect x="0.6" y="0.6" width="30.8" height="30.8" rx="8.4" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/>';
  const streak = (d, o) => '<path d="' + d + '" fill="none" stroke="#031A19" stroke-width="' + line + '" stroke-linecap="round" opacity="' + o + '"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="' + size + '" height="' + size + '">'
    + '<defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ACBC5"/><stop offset="1" stop-color="#55BBB6"/></linearGradient></defs>'
    + '<rect width="32" height="32" rx="9" fill="url(#t)"/>' + rim
    + '<g transform="translate(-.4 0)">' + streak("M7.6 11.2H13.2", 0.4) + streak("M5.6 16H13.2", 0.72) + streak("M9 20.8H13.2", 0.4)
    + '<path d="M16.4 8.4 27.4 16 16.4 23.6Z" fill="#031A19" stroke="#031A19" stroke-width="' + tri + '" stroke-linejoin="round"/></g>'
    + '</svg>';
};

const browser = await chromium.launch();
try {
  for (const size of [16, 32, 48, 128]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    const artwork = size === 128 ? 96 : size;
    await page.setContent('<!doctype html><body style="margin:0;background:transparent;display:grid;place-items:center;width:' + size + 'px;height:' + size + 'px">' + mark(artwork) + '</body>');
    await page.screenshot({ path: path.join(out, size + ".png"), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log("icons written");
