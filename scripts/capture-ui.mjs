import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const extension = path.resolve(".output/chrome-mv3");
const output = path.resolve(process.argv[2] || "qa/tmp/release-ui");
fs.mkdirSync(output, { recursive: true });
const report = [];
for (const language of ["en", "ko"]) {
  const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(output, `profile-${language}-`)), {
    headless: false,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, "--no-first-run"],
  });
  try {
    // Chrome on macOS follows the OS language; exercise both bundled UI translations explicitly.
    const messages = JSON.parse(fs.readFileSync(`public/_locales/${language}/messages.json`, "utf8"));
    await context.addInitScript(({ lang, messages }) => {
      chrome.i18n.getUILanguage = () => lang;
      chrome.i18n.getMessage = (key, values = []) => {
        const entry = messages[key];
        if (!entry) return "";
        let text = entry.message;
        for (const [name, holder] of Object.entries(entry.placeholders || {})) {
          text = text.split(`$${name.toUpperCase()}$`).join(values[Number(holder.content.slice(1)) - 1] || "");
        }
        return text;
      };
    }, { lang: language, messages });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
    const id = new URL(worker.url()).host;
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const scale of [1, 2]) {
      const client = await context.newCDPSession(page);
      await client.send("Emulation.setDeviceMetricsOverride", { width: 320, height: 480, deviceScaleFactor: scale, mobile: false });
      await page.goto(`chrome-extension://${id}/popup.html`);
      await page.waitForSelector(".ready");
      await page.locator(".popup").screenshot({ path: path.join(output, `01-popup-${language}-${scale}x.png`), animations: "disabled" });
      report.push(await page.evaluate(({ language, scale }) => {
        const popup = document.querySelector(".popup");
        return { language, scale, height: popup.getBoundingClientRect().height, fits: document.documentElement.scrollHeight <= innerHeight, horizontal: document.documentElement.scrollWidth > innerWidth };
      }, { language, scale }));
      await client.detach();
    }
    await page.setViewportSize({ width: 760, height: 1100 });
    await page.goto(`chrome-extension://${id}/options.html`);
    await page.waitForSelector(".ready");
    await page.screenshot({ path: path.join(output, `02-settings-${language}.png`), fullPage: true, animations: "disabled" });
    const input = page.getByRole("textbox", { name: language === "ko" ? "좋아요 최소 개수" : "Minimum Likes", exact: true });
    await input.click();
    await input.fill("700");
    await input.press("Enter");
    await page.waitForFunction(async () => (await chrome.storage.local.get("settings")).settings.rule.likes.min === 700);
    await page.screenshot({ path: path.join(output, `03-custom-${language}.png`), fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 360, height: 1000 });
    await page.screenshot({ path: path.join(output, `04-narrow-${language}.png`), fullPage: true, animations: "disabled" });
    report.push({ language, errors, narrowOverflows: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
  } finally {
    await context.close();
  }
}
fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, report }));
