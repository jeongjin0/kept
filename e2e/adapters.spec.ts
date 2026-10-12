import { expect, test as base } from "@playwright/test";
import { launch, open, stored } from "./extension";

// Browser startup has a bounded fixture budget; adapter assertions keep the 30s test budget.
const test = base.extend<{ extension: Awaited<ReturnType<typeof launch>> }>({
  extension: [async ({}, use) => {
    const extension = await launch();
    try {
      await use(extension);
    } finally {
      await extension.context.close();
    }
  }, { timeout: 30000 }],
});

// Routed pages exercise the shipped MAIN/isolated scripts and their bridge together.
// They do not establish compatibility with a site's current signed-in DOM.
const platforms = [
  { name: "youtube", url: "https://www.youtube.com/shorts/first", ids: ["first", "second"], creator: "UCcreator" },
  { name: "tiktok", url: "https://www.tiktok.com/foryou", ids: ["111", "222"], creator: "creator" },
  { name: "tiktok", url: "https://www.tiktok.com/following", ids: ["111", "222"], creator: "creator" },
  { name: "tiktok", url: "https://www.tiktok.com/@creator/video/111", ids: ["111", "222"], creator: "creator" },
  { name: "instagram", url: "https://www.instagram.com/reel/first/", ids: ["first", "second"], creator: "creator" },
] as const;

function fixture(platform: typeof platforms[number]) {
  const items = platform.ids.map((id, index) => ({
    id, code: id, author: { uniqueId: platform.creator }, user: { username: platform.creator },
    stats: { diggCount: index ? 8000 : 10, playCount: 100000, commentCount: 100 },
    like_count: index ? 8000 : 10, play_count: 100000, comment_count: 100,
  }));
  return `<!doctype html><meta charset="utf-8"><title>ScrollPlus adapter fixture</title>
  <style>body{margin:0}video{width:320px;height:600px;display:block}button{height:40px}</style>
  <div id="xgwrapper-0-${platform.ids[0]}"><video muted></video><a href="/@${platform.creator}">Creator</a></div>
  <div id="navigation-button-down"><button data-e2e="feed-navigation-next" aria-label="Next video">Next</button></div>
  <div id="navigation-button-up"><button data-e2e="feed-navigation-prev" aria-label="Previous video">Previous</button></div>
  ${platform.name === "tiktok" ? "" : `<script type="application/json" id="__UNIVERSAL_DATA_FOR_REHYDRATION__">${JSON.stringify({ items })}</script>`}
  <script>
    const platform = ${JSON.stringify(platform)};
    const items = ${JSON.stringify(items)};
    let index = 0;
    if (platform.name === "tiktok") fetch("/api/item_list").then(response => response.json()).then(data => { window.fixtureResponse = data; });
    window.fixtureMoves = 0;
    function show(next) {
      index = Math.max(0, Math.min(next, 1));
      const item = items[index];
      window.fixtureId = item.id;
      if (platform.name === "youtube") {
        history.replaceState({}, "", "/shorts/" + item.id);
        window.ytInitialPlayerResponse = { videoDetails: { videoId: item.id, channelId: platform.creator, viewCount: "100000" }, likeCount: item.like_count };
        document.dispatchEvent(new Event("yt-navigate-finish"));
      } else if (platform.name === "tiktok") {
        document.querySelector("[id^='xgwrapper']").id = "xgwrapper-0-" + item.id;
        if (platform.url.includes("/video/")) history.replaceState({}, "", "/@" + platform.creator + "/video/" + item.id);
      } else {
        history.replaceState({}, "", "/reel/" + item.id + "/");
      }
    }
    document.querySelector("[aria-label='Next video']").onclick = () => { window.fixtureMoves++; show(index + 1); };
    document.querySelector("[aria-label='Previous video']").onclick = () => { window.fixtureMoves--; show(index - 1); };
    show(0);
  </script>`;
}

for (const platform of platforms) {
  test(`${platform.name} ${new URL(platform.url).pathname}: built scripts apply settings, skip, undo, and keep a creator`, async ({ extension }) => {
    const { context, worker, id } = extension;
    await worker.evaluate(async () => {
      const data = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...data.settings, enabled: false } });
    });
    await context.route(`https://www.${platform.name === "youtube" ? "youtube.com" : platform.name === "tiktok" ? "tiktok.com" : "instagram.com"}/**`, async (route) => {
      if (platform.name === "tiktok" && new URL(route.request().url()).pathname === "/api/item_list") {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: platform.ids.map((id, index) => ({ id, author: { uniqueId: platform.creator }, stats: { diggCount: index ? 8000 : 10, playCount: 100000, commentCount: 100 } })) }) });
        return;
      }
      await route.fulfill({ contentType: "text/html", body: fixture(platform) });
    });
    const app = await open(context, id, "options.html");
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(platform.url);
    await page.waitForTimeout(2200);
    expect(await page.evaluate(() => (window as any).fixtureId)).toBe(platform.ids[0]);
    await page.evaluate(() => {
      const frame = document.createElement("iframe");
      document.body.append(frame);
      window.dispatchEvent(new MessageEvent("message", { source: frame.contentWindow, data: { source: "scrollplus", type: "advance", key: "ArrowDown" } }));
      window.postMessage({ source: "scrollplus", type: "advance", key: "Enter" }, "*");
    });
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as any).fixtureMoves)).toBe(0);
    const send = (type: string) => app.evaluate(async ({ url, type }) => {
      const [tab] = await chrome.tabs.query({ url });
      return chrome.tabs.sendMessage(tab.id!, { type });
    }, { url: platform.url.split("/", 3).join("/") + "/*", type });
    await expect.poll(async () => (await send("scrollplus:context")).creatorId).toBe(platform.creator);
    await worker.evaluate(async () => {
      const data = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...data.settings, enabled: true } });
    });
    await expect.poll(() => page.evaluate(() => (window as any).fixtureId)).toBe(platform.ids[1]);
    await expect(page.locator("#scrollplus-chip-host")).toContainText(/10/);
    await expect.poll(() => app.evaluate(async () => (await chrome.storage.local.get("dailySkips")).dailySkips.count)).toBe(1);
    await page.getByRole("button", { name: /Undo|되돌리기/ }).click();
    await expect.poll(() => page.evaluate(() => (window as any).fixtureId)).toBe(platform.ids[0]);
    await page.waitForTimeout(2200);
    expect(await page.evaluate(() => (window as any).fixtureId)).toBe(platform.ids[0]);
    expect((await stored(app)).allowlist).toEqual([]);
    await page.reload();
    await page.waitForTimeout(2200);
    expect(await page.evaluate(() => (window as any).fixtureId)).toBe(platform.ids[0]);
    expect(await app.evaluate(async () => (await chrome.storage.local.get("dailySkips")).dailySkips.count)).toBe(1);
    const revisit = await context.newPage();
    await revisit.goto(platform.url);
    await revisit.waitForTimeout(2200);
    expect(await revisit.evaluate(() => (window as any).fixtureId)).toBe(platform.ids[0]);
    await revisit.close();
    await app.getByRole("radio", { name: /Strict|엄격/ }).click();
    await expect.poll(async () => (await stored(app)).rule.likes.min).toBe(1000);
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => (window as any).fixtureId)).toBe(platform.ids[0]);
    // Observe the short-lived Undo while Reset is in flight, before action tracing returns.
    await Promise.all([
      app.getByRole("button", { name: /Reset to defaults|기본값으로 되돌리기/ }).click(),
      (async () => {
        await expect.poll(() => page.evaluate(() => (window as any).fixtureId)).toBe(platform.ids[1]);
        await expect.poll(() => app.evaluate(async () => (await chrome.storage.local.get("dailySkips")).dailySkips.count)).toBe(2);
        await page.getByRole("button", { name: /Undo|되돌리기/ }).click();
      })(),
    ]);
    await expect.poll(() => page.evaluate(() => (window as any).fixtureId)).toBe(platform.ids[0]);
    expect(await send("scrollplus:allow")).toEqual({ ok: true });
    await expect.poll(async () => (await stored(app)).allowlist).toEqual([{ platform: platform.name, id: platform.creator }]);
    await app.getByRole("button", { name: /Reset to defaults|기본값으로 되돌리기/ }).click();
    await expect.poll(async () => (await stored(app)).allowlist).toEqual([{ platform: platform.name, id: platform.creator }]);
    await page.reload();
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => (window as any).fixtureId)).toBe(platform.ids[0]);
    expect(errors).toEqual([]);
  });
}
