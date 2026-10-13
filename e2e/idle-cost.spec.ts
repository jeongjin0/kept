import { expect, test } from "@playwright/test";
import { launch } from "./extension";

test("Instagram reads embedded scripts only when inserted or changed", async () => {
  const { context, worker, close } = await launch(undefined, undefined, true);
  try {
    await worker.evaluate(async () => {
      const { settings } = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...settings, enabled: false } });
    });
    await context.route("https://www.instagram.com/**", route => route.fulfill({ contentType: "text/html", body:
      '<!doctype html><video style="width:320px;height:600px"></video>'
      + Array.from({ length: 100 }, (_, i) => `<script id="payload-${i}" type="application/json">{"items":[{"code":"reel${i}","like_count":900,"play_count":100000}]}</script>`).join("") }));
    const page = await context.newPage();
    await page.goto("https://www.instagram.com/reel/reel0/");
    await page.waitForTimeout(1700);
    await page.evaluate(() => {
      (window as any).scriptReads = 0;
      const descriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "textContent")
        ?? Object.getOwnPropertyDescriptor(Node.prototype, "textContent")!;
      Object.defineProperty(HTMLScriptElement.prototype, "textContent", { ...descriptor, get() {
        if (this instanceof HTMLScriptElement && this.id.startsWith("payload-")) (window as any).scriptReads++;
        return descriptor.get!.call(this);
      } });
      // Confirm this probe is in the same MAIN realm, then exclude the probe's own read.
      document.getElementById("payload-0")!.textContent;
      if ((window as any).scriptReads !== 1) throw new Error("MAIN script read probe is inactive");
      (window as any).scriptReads = 0;
    });
    const reads = () => page.evaluate(() => (window as any).scriptReads as number);
    const warm = await reads();
    expect(warm).toBe(0);
    await page.waitForTimeout(2500);
    expect(await reads(), "idle payloads should not be read repeatedly").toBe(warm);
    await page.evaluate(() => {
      document.getElementById("payload-0")!.firstChild!.nodeValue = '{"items":[{"code":"reel0","like_count":400,"play_count":100000}]}';
    });
    await expect.poll(reads).toBe(warm + 1);
    await page.evaluate(() => {
      const container = document.createElement("div");
      container.innerHTML = '<script id="payload-new" type="application/json">{"items":[{"code":"new","like_count":100,"play_count":20000}]}</script>';
      document.body.append(container);
    });
    await expect.poll(reads).toBe(warm + 2);
    const client = await context.newCDPSession(page);
    await worker.evaluate(async () => {
      const tab = (await chrome.tabs.query({})).find(tab => tab.url?.includes("instagram.com/reel/"))!;
      await chrome.tabs.create({ windowId: tab.windowId, url: "about:blank", active: true });
    });
    await expect.poll(() => page.evaluate(() => document.hidden)).toBe(true);
    await page.waitForTimeout(1200);
    await client.send("Performance.enable");
    const script = async () => (await client.send("Performance.getMetrics")).metrics.find(metric => metric.name === "ScriptDuration")?.value ?? 0;
    const before = await script(); await page.waitForTimeout(2500);
    const hiddenScriptSeconds = await script() - before;
    expect(hiddenScriptSeconds, "hidden, idle fixture has no recurring DOM work").toBeLessThan(0.025);
    await test.info().attach("idle-cost.json", { body: JSON.stringify({ scripts: 100, idleWindowMs: 2500,
      idleReads: 0, changedAndInsertedReads: await reads() - warm, hiddenWindowMs: 2500, hiddenScriptSeconds }, null, 2), contentType: "application/json" });
  } finally { await close(); }
});

// Grid filtering is off by default. An idle page must then not pay to list every
// link on it every 400ms: with 20,000 links that was about 8% of a core.
test("idle pages with grid filtering off do not rescan their links", async () => {
  const { context } = await launch();
  try {
    await context.route("https://www.youtube.com/**", (route) => route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><meta charset=utf-8><style>body{margin:0}a{display:block;width:160px;height:120px;float:left}</style>"
        + Array.from({ length: 20000 }, (_, index) => `<a href="/shorts/id${index}">Short ${index}</a>`).join(""),
    }));
    const page = await context.newPage();
    await page.goto("https://www.youtube.com/shorts/first");
    await page.waitForTimeout(2500);
    const client = await context.newCDPSession(page);
    await client.send("Performance.enable");
    const script = async () => (await client.send("Performance.getMetrics")).metrics.find((metric) => metric.name === "ScriptDuration")?.value ?? 0;
    const before = await script();
    await page.waitForTimeout(3000);
    expect(await script() - before).toBeLessThan(0.1);
  } finally {
    await context.close();
  }
});
