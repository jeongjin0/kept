import { chromium, expect, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export async function launch(language?: "en" | "ko", profile?: string, nativeVisibility = false) {
  const extension = path.resolve(process.env.SCROLLPLUS_EXTENSION_PATH ?? ".output/chrome-mv3");
  const dir = profile ?? fs.mkdtempSync(path.join(os.tmpdir(), "scrollplus-ext-"));
  // Ordinary Playwright pages all emulate foreground focus. Visibility checks
  // need a disposable native browser connected without that default override.
  let close: () => Promise<void>;
  let context: BrowserContext;
  if (nativeVisibility) {
    const child = spawn(process.env.SCROLLPLUS_CHROME_EXECUTABLE ?? chromium.executablePath(), [
      "--user-data-dir=" + dir, "--remote-debugging-port=0", "--no-first-run", "--no-default-browser-check",
      "--no-sandbox", // Disposable QA profile, matching Playwright's Linux launch default.
      "--disable-background-networking", "--disable-component-update", "--password-store=basic", "--use-mock-keychain",
      "--disable-component-extensions-with-background-pages", "--disable-default-apps",
      "--disable-extensions-except=" + extension, "--load-extension=" + extension, "about:blank",
    ], { stdio: "ignore" });
    try {
      const activePort = path.join(dir, "DevToolsActivePort");
      await expect.poll(() => fs.existsSync(activePort), { timeout: 15000 }).toBe(true);
      const [port] = fs.readFileSync(activePort, "utf8").split("\n");
      const browser = await chromium.connectOverCDP("http://127.0.0.1:" + port, { noDefaults: true });
      context = browser.contexts()[0];
      close = async () => {
        try {
          const client = await browser.newBrowserCDPSession();
          await client.send("Browser.close").catch(() => {});
          await browser.close().catch(() => {});
        } finally { if (child.exitCode == null) child.kill(); }
      };
    } catch (error) { child.kill(); throw error; }
  } else {
    context = await chromium.launchPersistentContext(dir, {
      executablePath: process.env.SCROLLPLUS_CHROME_EXECUTABLE,
      headless: false,
      args: ["--disable-extensions-except=" + extension, "--load-extension=" + extension],
    });
    close = () => context.close();
  }
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
    const isExtension = (worker: { url(): string }) => worker.url().startsWith("chrome-extension://") && worker.url().endsWith("/background.js");
    const worker = context.serviceWorkers().find(isExtension) ?? await context.waitForEvent("serviceworker", { predicate: isExtension });
    await expect.poll(() => worker.evaluate(async () => {
      const local = globalThis.chrome?.storage?.local;
      return typeof local?.get === "function" ? (await local.get("settings")).settings?.enabled : false;
    }), { message: "extension worker has initialized storage" }).toBe(true);
    return { context, worker, id: new URL(worker.url()).host, profile: dir, close };
  } catch (error) {
    await close().catch(() => {});
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
