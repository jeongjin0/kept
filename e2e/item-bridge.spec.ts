import { expect, test as base } from "@playwright/test";
import { launch } from "./extension";

const test = base.extend<{ extension: Awaited<ReturnType<typeof launch>> }>({
  extension: [async ({}, use) => {
    const extension = await launch(undefined, undefined, true);
    try { await use(extension); }
    finally { await extension.close(); }
  }, { timeout: 30000 }],
});

for (const platform of ["tiktok", "instagram"] as const) {
  test(`${platform}: idle feed history is not resent and changed embedded counts still filter`, async ({ extension }) => {
    test.setTimeout(45000);
    const { context, worker } = extension;
    await worker.evaluate(async () => {
      const { settings } = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...settings, enabled: false } });
    });
    const item = (index: number) => platform === "tiktok"
      ? { id: String(100000 + index), author: { uniqueId: "fixture" }, stats: { diggCount: index ? 8000 : 900, playCount: 100000, commentCount: 100 } }
      : { code: "reel" + index, user: { username: "fixture" }, like_count: index ? 8000 : 900, play_count: 100000, comment_count: 100 };
    const initial = JSON.stringify({ items: Array.from({ length: 5000 }, (_, i) => item(i)) });
    const more = JSON.stringify({ items: Array.from({ length: 500 }, (_, i) => item(5000 + i)) });
    const origin = `https://www.${platform}.com`;
    await context.route(origin + "/**", async route => {
      if (new URL(route.request().url()).pathname === "/api/item_list") {
        await route.fulfill({ contentType: "application/json", body: more });
        return;
      }
      await route.fulfill({ contentType: "text/html", body: `<!doctype html>
        <style>body{margin:0}video{width:320px;height:600px;display:block}</style>
        <div id="xgwrapper-0-100000"><video muted></video><a href="/@fixture">Creator</a></div>
        <button data-e2e="feed-navigation-next" aria-label="Next video">Next</button>
        <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${initial}</script>
        <script>
          window.fixtureMoves = 0;
          document.querySelector('button').onclick = () => {
            window.fixtureMoves++;
            if (${JSON.stringify(platform)} === 'tiktok') document.querySelector('[id^="xgwrapper"]').id = 'xgwrapper-0-100001';
            else history.replaceState({}, '', '/reel/reel1/');
          };
        </script>` });
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      const probe = { cacheItems: 0, cacheMessages: 0, playerMessages: 0, likes: null as number | null };
      (window as any).bridgeProbe = probe;
      window.addEventListener("message", event => {
        if (event.source !== window || event.data?.source !== "scrollplus") return;
        if (event.data.type === "cache") {
          probe.cacheMessages++;
          probe.cacheItems += event.data.items.length;
        } else if (event.data.type === "item") {
          probe.playerMessages++;
          probe.likes = event.data.item.metrics?.likes ?? null;
        }
      });
    });
    await page.goto(origin + (platform === "tiktok" ? "/foryou" : "/reel/reel0/"));
    await expect.poll(() => page.evaluate(() => (window as any).bridgeProbe.likes)).toBe(900);
    const warm = await page.evaluate(() => ({ ...(window as any).bridgeProbe }));
    await page.waitForTimeout(2500);
    const idle = await page.evaluate(() => ({ ...(window as any).bridgeProbe }));
    expect.soft(idle.cacheItems, "unchanged history must not be cloned across worlds again").toBe(warm.cacheItems);
    expect.soft(idle.playerMessages, "unchanged active counts must not be sent again").toBe(warm.playerMessages);

    await page.evaluate(() => fetch("/api/item_list").then(response => response.json()));
    await expect.poll(() => page.evaluate(() => (window as any).bridgeProbe.cacheItems)).toBeGreaterThanOrEqual(warm.cacheItems + 500);
    const appended = await page.evaluate(() => (window as any).bridgeProbe.cacheItems);
    expect.soft(appended, "new responses must send only their changed rows").toBe(warm.cacheItems + 500);
    const replacement = await page.evaluate(platform => {
      const node = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__")!;
      const old = node.textContent!;
      const payload = JSON.parse(old);
      if (platform === "tiktok") payload.items[0].stats.diggCount = 400;
      else payload.items[0].like_count = 400;
      const next = JSON.stringify(payload);
      node.textContent = next;
      return { sameLength: old.length === next.length, samePrefix: old.slice(0, 40) === next.slice(0, 40) };
    }, platform);
    expect(replacement).toEqual({ sameLength: true, samePrefix: true });
    await expect.poll(() => page.evaluate(() => (window as any).bridgeProbe.likes)).toBe(400);
    await expect.poll(() => page.evaluate(() => (window as any).bridgeProbe.cacheItems)).toBe(warm.cacheItems + 501);
    const feedTabId = await worker.evaluate(async () => {
      const tab = (await chrome.tabs.query({})).find(tab => tab.url?.includes("/foryou") || tab.url?.includes("/reel/reel0/"))!;
      await chrome.tabs.create({ windowId: tab.windowId, url: "about:blank", active: true });
      return tab.id!;
    });
    await expect.poll(() => page.evaluate(() => document.hidden)).toBe(true);
    await worker.evaluate(async () => {
      const { settings } = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...settings, enabled: true } });
    });
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as any).fixtureMoves), "hidden tabs must not advance after settings change").toBe(0);
    await worker.evaluate(id => chrome.tabs.update(id, { active: true }), feedTabId);
    await expect.poll(() => page.evaluate(() => (window as any).fixtureMoves)).toBe(1);
    await expect(page.locator("#scrollplus-chip-host")).toContainText(/400|4백/);
    expect(errors).toEqual([]);
  });
}
