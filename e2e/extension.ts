import { chromium, expect, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export async function launch(language?: "en" | "ko", profile?: string) {
  const extension = path.resolve(process.env.SCROLLPLUS_EXTENSION_PATH ?? ".output/chrome-mv3");
  const dir = profile ?? fs.mkdtempSync(path.join(os.tmpdir(), "scrollplus-ext-"));
  const context = await chromium.launchPersistentContext(dir, {
    executablePath: process.env.SCROLLPLUS_CHROME_EXECUTABLE,
    headless: false,
    args: ["--disable-extensions-except=" + extension, "--load-extension=" + extension],
  });
  if (language) {
    const messages = JSON.parse(fs.readFileSync(`public/_locales/${language}/messages.json`, "utf8"));
    await context.addInitScript(({ language, messages }) => {
      if (!globalThis.chrome?.i18n) return;
      chrome.i18n.getUILanguage = () => language;
      chrome.i18n.getMessage = (key: string, substitutions?: string | string[]) => {
        const entry = messages[key];
        if (!entry) return "";
        const values = Array.isArray(substitutions) ? substitutions : [substitutions ?? ""];
        let text = entry.message;
        for (const [name, holder] of Object.entries(entry.placeholders || {})) {
          text = text.split(`$${name.toUpperCase()}$`).join(values[Number((holder as { content: string }).content.slice(1)) - 1] || "");
        }
        return text;
      };
    }, { language, messages });
  }
  try {
    const isExtension = (worker: { url(): string }) => worker.url().startsWith("chrome-extension://");
    const worker = context.serviceWorkers().find(isExtension) ?? await context.waitForEvent("serviceworker", { predicate: isExtension });
    await expect.poll(() => worker.evaluate(async () => {
      const local = globalThis.chrome?.storage?.local;
      return typeof local?.get === "function" ? (await local.get("settings")).settings?.enabled : false;
    }), { message: "extension worker has initialized storage" }).toBe(true);
    return { context, worker, id: new URL(worker.url()).host, profile: dir };
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
}

export async function open(context: BrowserContext, id: string, file: string, scale = 1) {
  const page = await context.newPage();
  await page.goto("chrome-extension://" + id + "/" + file);
  if (file === "popup.html") {
    const client = await context.newCDPSession(page);
    await client.send("Emulation.setDeviceMetricsOverride", { width: 320, height: 480, deviceScaleFactor: scale, mobile: false });
  }
  await page.waitForSelector(".ready");
  return page;
}

export async function stored(page: Page) {
  return page.evaluate(async () => (await chrome.storage.local.get("settings")).settings);
}
