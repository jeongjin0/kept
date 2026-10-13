import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const build = path.join(root, ".output/chrome-mv3");
const workBase = path.join(root, "qa/tmp");
fs.mkdirSync(workBase, { recursive: true });
const work = fs.mkdtempSync(path.join(workBase, "store-"));

const NAME = 'Scroll<span style="color:#59C5BF">Plus</span>';
const MARK = '<svg viewBox="0 0 32 32" width="SIZE" height="SIZE"><defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ACBC5"/><stop offset="1" stop-color="#55BBB6"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#t)"/><rect x="0.6" y="0.6" width="30.8" height="30.8" rx="8.4" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/><g transform="translate(-.4 0)"><path d="M7.6 11.2H13.2" fill="none" stroke="#031A19" stroke-width="3" stroke-linecap="round" opacity="0.4"/><path d="M5.6 16H13.2" fill="none" stroke="#031A19" stroke-width="3" stroke-linecap="round" opacity="0.72"/><path d="M9 20.8H13.2" fill="none" stroke="#031A19" stroke-width="3" stroke-linecap="round" opacity="0.4"/><path d="M16.4 8.4 27.4 16 16.4 23.6Z" fill="#031A19" stroke="#031A19" stroke-width="2.6" stroke-linejoin="round"/></g></svg>';

// One entry per listing language. English is the default listing; Korean goes in store/screenshots/ko.
const LANGS = {
  en: {
    ui: "en", locale: "en-US", dropKo: true,
    shots: path.join(root, "store/screenshots"), tileFile: path.join(root, "store/tile.png"), marqueeFile: path.join(root, "store/marquee.png"),
    popup: ["Low-like videos <em>skip themselves.</em>", "Ready on install. Ads skip too, and the popup counts the time you save."],
    options: ["Your numbers, <em>your rules.</em>", "Pick a preset or type your own. Likes, comments, views."],
    chip: ["Skipped. <em>Undo</em> in one tap.", "Every skip tells you why, and you can take it back."],
    tile: "Skips Shorts, Reels &amp; TikToks <em>with too few likes.</em>",
  },
  ko: {
    ui: "ko", locale: "ko-KR", dropKo: false,
    shots: path.join(root, "store/screenshots/ko"), tileFile: path.join(root, "store/tile-ko.png"), marqueeFile: path.join(root, "store/marquee-ko.png"),
    popup: ["좋아요 적은 영상은 <em>알아서 넘어가요.</em>", "설치하면 바로 켜져요. 광고도 넘기고, 아낀 시간을 세어 줘요."],
    options: ["내 기준, <em>내 숫자.</em>", "프리셋을 고르거나 직접 입력하세요. 좋아요, 댓글, 조회수."],
    chip: ["넘김. <em>되돌리기</em>는 한 번에.", "넘기는 이유가 보여요. 몇 초 동안 되돌릴 수 있어요."],
    tile: "좋아요 적은 쇼츠·릴스·틱톡을 <em>알아서 넘겨요.</em>",
  },
};

const uri = (file) => "data:image/png;base64," + fs.readFileSync(file).toString("base64");

async function capture(lang, cfg, dirOut) {
  const extension = path.join(dirOut, "ext");
  fs.cpSync(build, extension, { recursive: true });
  if (cfg.dropKo) fs.rmSync(path.join(extension, "_locales/ko"), { recursive: true, force: true });
  const context = await chromium.launchPersistentContext(path.join(dirOut, "profile"), {
    headless: false,
    deviceScaleFactor: 2,
    viewport: { width: 760, height: 1100 },
    args: ["--disable-extensions-except=" + extension, "--load-extension=" + extension, "--no-first-run"],
  });
  const messages = JSON.parse(fs.readFileSync(path.join(root, "public/_locales", lang, "messages.json"), "utf8"));
  await context.addInitScript(({ ui, messages }) => {
    if (!globalThis.chrome?.i18n) return;
    chrome.i18n.getUILanguage = () => ui;
    chrome.i18n.getMessage = (key, values = []) => {
      const entry = messages[key];
      if (!entry) return "";
      let text = entry.message;
      for (const [name, holder] of Object.entries(entry.placeholders || {})) text = text.split(`$${name.toUpperCase()}$`).join(values[Number(holder.content.slice(1)) - 1] || "");
      return text;
    };
  }, { ui: cfg.ui, messages });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
  const id = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 320, height: 480 });
  await popup.goto("chrome-extension://" + id + "/popup.html");
  await popup.waitForSelector(".ready");
  // The figures the popup and the settings page show in the images: 18 today, 1,482 in all, and about an hour saved.
  await popup.evaluate(() => chrome.storage.local.set({
    dailySkips: { day: new Date().toLocaleDateString("sv"), count: 18 },
    totalSkips: { since: new Date(Date.now() - 7 * 864e5).toLocaleDateString("sv"), count: 1482, onScreenMs: 622440 },
  }));
  await popup.reload();
  await popup.waitForSelector(".ready");
  await popup.waitForTimeout(400);
  await popup.locator(".popup").screenshot({ path: path.join(dirOut, "popup.png") });
  const options = await context.newPage();
  await options.setViewportSize({ width: 680, height: 1100 });
  await options.goto("chrome-extension://" + id + "/options.html");
  await options.waitForSelector(".ready");
  await options.waitForTimeout(400);
  await options.locator(".sheet").screenshot({ path: path.join(dirOut, "options-full.png") });
  await context.close();
}

async function captureChip(lang, cfg, dirOut) {
  const messages = JSON.parse(fs.readFileSync(path.join(root, "public/_locales", lang, "messages.json"), "utf8"));
  const browser = await chromium.launch();
  // Reduced motion: the chip is drawn at rest, without the ring that widens while it appears.
  const context = await browser.newContext({ deviceScaleFactor: 2, locale: cfg.locale, viewport: { width: 900, height: 320 }, reducedMotion: "reduce" });
  // The fixture page is not an extension page, so give it the same message lookup chrome.i18n would.
  await context.addInitScript(({ messages, ui }) => {
    window.chrome = {
      i18n: {
        getUILanguage: () => ui,
        getMessage: (key, subs) => {
          const entry = messages[key];
          if (!entry) return "";
          const values = Array.isArray(subs) ? subs : subs == null ? [] : [subs];
          let text = entry.message;
          for (const [name, holder] of Object.entries(entry.placeholders || {})) {
            const index = Number(String(holder.content).replace("$", "")) - 1;
            text = text.split("$" + name.toUpperCase() + "$").join(values[index] == null ? "" : String(values[index]));
          }
          return text;
        },
      },
    };
  }, { messages, ui: cfg.ui });
  const page = await context.newPage();
  await page.goto("file://" + path.join(root, "dist-fixture/player.html"));
  await page.evaluate(() => {
    document.body.style.visibility = "hidden";
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    window.__scrollplus.show({ id: "weak", metrics: { views: 91200, likes: 312, comments: 4, shares: 0, saves: null } });
  });
  await page.waitForFunction(() => {
    const host = document.querySelector("#scrollplus-chip-host");
    return !!host && !!host.shadowRoot && !!host.shadowRoot.querySelector(".chip");
  });
  await page.waitForTimeout(260);
  const box = await page.locator("#scrollplus-chip-host").boundingBox();
  // The glow and the shadow reach 40 px or so from the chip.
  const pad = 56;
  await page.screenshot({ path: path.join(dirOut, "chip.png"), omitBackground: true, clip: { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 } });
  await browser.close();
  return { w: box.width + pad * 2, h: box.height + pad * 2, pad, inner: box.width };
}

const BASE_CSS = [
  "*{box-sizing:border-box;margin:0}",
  "html,body{width:100%;height:100%;background:#0D1414;color:#EEF5F4;font-family:ui-sans-serif,system-ui,-apple-system,'Apple SD Gothic Neo','Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}",
  ".stage{position:relative;width:1280px;height:800px;background:radial-gradient(900px 600px at 82% 12%,rgba(89,197,191,.16),transparent 60%),#0D1414}",
  ".copy{position:absolute;left:96px;top:0;bottom:0;width:480px;display:flex;flex-direction:column;justify-content:center;gap:22px}",
  ".brand{display:flex;align-items:center;gap:12px;font-size:22px;font-weight:650;letter-spacing:-.02em;color:#EEF5F4}",
  "h1{font-size:68px;line-height:1.05;font-weight:700;letter-spacing:-.04em;text-wrap:balance;word-break:keep-all}",
  "h1 em{font-style:normal;color:#59C5BF}",
  "p{font-size:24px;line-height:1.4;color:#99ACAB;max-width:440px;text-wrap:balance;word-break:keep-all}",
  ".shot{position:absolute;filter:drop-shadow(0 30px 60px rgba(0,0,0,.55))}",
  ".shot img{display:block;border-radius:22px}",
].join("");

function page(body, extra = "") {
  return '<!doctype html><meta charset="utf-8"><style>' + BASE_CSS + extra + '</style><div class="stage">' + body + "</div>";
}

const brand = '<div class="brand">' + MARK.replaceAll("SIZE", "36") + "<span>" + NAME + "</span></div>";
const copy = ([h1, p]) => '<div class="copy">' + brand + "<h1>" + h1 + "</h1><p>" + p + "</p></div>";

const CARD_CSS = ".card{position:absolute;left:900px;top:64px;width:300px;height:672px;border-radius:30px;background:linear-gradient(160deg,#1F2E2D,#111A19 60%,#0D1414);border:1px solid rgba(238,245,244,.08);box-shadow:0 30px 60px rgba(0,0,0,.55);overflow:hidden}" +
  ".orb{position:absolute;left:-60px;top:70px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(89,197,191,.28),transparent 68%)}" +
  ".blob{position:absolute;left:30px;top:150px;width:240px;height:240px;border-radius:44% 56% 52% 48% / 52% 44% 56% 48%;background:linear-gradient(145deg,rgba(238,245,244,.14),rgba(238,245,244,.03))}" +
  ".acts{position:absolute;right:22px;bottom:178px;display:flex;flex-direction:column;gap:16px}.acts i{display:block;width:40px;height:40px;border-radius:50%;background:rgba(238,245,244,.12)}" +
  ".who{position:absolute;left:28px;bottom:180px;display:flex;align-items:center;gap:10px}.who b{display:block;width:34px;height:34px;border-radius:50%;background:rgba(89,197,191,.55)}.who span{display:block;width:110px;height:10px;border-radius:5px;background:rgba(238,245,244,.2)}" +
  ".chipwrap{position:absolute}.chipwrap img{display:block}";

async function render(lang, cfg) {
  const dirOut = path.join(work, lang);
  fs.mkdirSync(dirOut, { recursive: true });
  fs.mkdirSync(cfg.shots, { recursive: true });
  await capture(lang, cfg, dirOut);
  const chipBox = await captureChip(lang, cfg, dirOut);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const stage = await context.newPage();
  // The chip is shown about 250 px wide, beside the video card and not on it: its right edge 18 px from the video's left edge, centred on it.
  const chipScale = 250 / chipBox.inner;
  const chipW = Math.round(chipBox.w * chipScale);
  const chipH = Math.round(chipBox.h * chipScale);
  const chipTop = Math.round(64 + 672 / 2 - chipH / 2 - 20);
  const chipLeft = Math.round(900 - 18 - chipW + chipBox.pad * chipScale);
  const jobs = [
    { file: "popup.png", html: page(copy(cfg.popup) + '<div class="shot" style="left:700px;top:96px"><img src="' + uri(path.join(dirOut, "popup.png")) + '" width="480"></div>') },
    { file: "options.png", html: page(copy(cfg.options) + '<div class="shot" style="left:640px;top:0;width:560px;height:800px;overflow:hidden;border-radius:0 0 22px 22px"><img src="' + uri(path.join(dirOut, "options-full.png")) + '" width="560" style="border-radius:0;margin-top:56px"></div>') },
    { file: "chip.png", html: page(copy(cfg.chip) + '<div class="card"><div class="orb"></div><div class="blob"></div><div class="acts"><i></i><i></i><i></i></div><div class="who"><b></b><span></span></div></div><div class="chipwrap" style="left:' + chipLeft + 'px;top:' + chipTop + 'px"><img src="' + uri(path.join(dirOut, "chip.png")) + '" width="' + chipW + '"></div>', CARD_CSS) },
  ];
  for (const job of jobs) {
    await stage.setContent(job.html);
    await stage.waitForTimeout(150);
    await stage.screenshot({ path: path.join(cfg.shots, job.file) });
  }
  const tile = await context.newPage();
  await tile.setViewportSize({ width: 440, height: 280 });
  await tile.setContent('<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0}html,body{width:440px;height:280px;background:radial-gradient(260px 200px at 90% 0%,rgba(89,197,191,.22),transparent 70%),#0D1414;color:#EEF5F4;font-family:ui-sans-serif,system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif;-webkit-font-smoothing:antialiased}.t{position:absolute;left:32px;right:32px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:16px}h2{font-size:46px;line-height:1.02;font-weight:700;letter-spacing:-.035em}p{font-size:17px;line-height:1.35;color:#99ACAB;max-width:340px;text-wrap:balance;word-break:keep-all}p em{font-style:normal;color:#59C5BF}</style><div class="t">' + MARK.replaceAll("SIZE", "48") + "<h2>" + NAME + "</h2><p>" + cfg.tile + "</p></div>");
  await tile.screenshot({ path: cfg.tileFile });
  const marquee = await context.newPage();
  await marquee.setViewportSize({ width: 1400, height: 560 });
  await marquee.setContent(page(copy(cfg.popup) + '<div class="shot" style="left:1000px;top:100px"><img src="' + uri(path.join(dirOut, "popup.png")) + '" width="320"></div>', ".stage{width:1400px;height:560px}.copy{left:80px;width:700px}h1{font-size:62px;max-width:700px}p{max-width:650px;font-size:23px}"));
  await marquee.screenshot({ path: cfg.marqueeFile });
  await browser.close();
}

for (const [lang, cfg] of Object.entries(LANGS)) await render(lang, cfg);
console.log("store images written");
