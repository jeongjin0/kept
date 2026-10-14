import { expect, test as base } from "@playwright/test";
import { launch, open, stored } from "./extension";

const test = base.extend<{ extension: Awaited<ReturnType<typeof launch>> }>({
  extension: [async ({}, use) => {
    const extension = await launch();
    try { await use(extension); }
    finally { await extension.context.close(); }
  }, { timeout: 30000 }],
});

interface Item { id: string; likes: number; ad?: boolean }
type Site = "youtube" | "tiktok" | "instagram";

const HOSTS: Record<Site, string> = { youtube: "youtube.com", tiktok: "tiktok.com", instagram: "instagram.com" };
const START: Record<Site, (id: string) => string> = {
  youtube: (id) => "https://www.youtube.com/shorts/" + id,
  tiktok: () => "https://www.tiktok.com/foryou",
  instagram: (id) => "https://www.instagram.com/reels/" + id + "/",
};

// An ad that has few likes (125) first, then ordinary videos and an ad that has many likes.
// Numeric ids, because TikTok's active item is read from a numeric id.
const FEED: Item[] = [
  { id: "9001", likes: 125, ad: true },
  { id: "9002", likes: 20000 },
  { id: "9003", likes: 90000, ad: true },
  { id: "9004", likes: 30000 },
];
const [AD1, NORMAL1, , NORMAL2] = FEED.map((item) => item.id);

// Routed pages that exercise the shipped scripts. They reproduce what was observed on the real sites
// (qa/ads.md) and do not establish compatibility with every current site layout.
function page(site: Site, items: Item[], flag: "data" | "label"): string {
  const common = '<style>body{margin:0}video{width:320px;height:600px;display:block;margin-left:280px}button{height:40px}#label{position:absolute;left:10px;top:560px;font:12px sans-serif}</style>';
  const script = (body: string) => '<script>const items=' + JSON.stringify(items) + ';let index=0;window.fixtureMoves=0;' + body + 'window.fixtureNext=()=>{window.fixtureMoves++;show(index+1);};show(0);</script>';
  if (site === "youtube") {
    return '<!doctype html><meta charset="utf-8">' + common
      + '<ytd-reel-video-renderer id="reel-video-renderer"><video muted></video></ytd-reel-video-renderer>'
      + '<div id="navigation-button-down"><button aria-label="Next video">Next</button></div><div id="navigation-button-up"><button aria-label="Previous video">Previous</button></div>'
      + script(
        'function show(n){index=Math.max(0,Math.min(items.length-1,n));const item=items[index];window.fixtureId=item.id;'
        + 'history.replaceState({},"","/shorts/"+item.id);'
        + 'window.ytInitialPlayerResponse={videoDetails:{videoId:item.id,channelId:"UCfixture",viewCount:"100000"},likeCount:item.likes};'
        + 'const reel=document.getElementById("reel-video-renderer");'
        // YouTube flips is-ads-overlay in the same moment as the URL, but leaves the ad slot behind for a few hundred ms.
        + 'if(item.ad){reel.setAttribute("is-ads-overlay","");if(!reel.querySelector("ytd-ad-slot-renderer"))reel.append(document.createElement("ytd-ad-slot-renderer"));}'
        + 'else{reel.removeAttribute("is-ads-overlay");setTimeout(()=>reel.querySelector("ytd-ad-slot-renderer")?.remove(),300);}'
        + 'document.dispatchEvent(new Event("yt-navigate-finish"));}'
        + 'document.querySelector("#navigation-button-down button").onclick=()=>{window.fixtureMoves++;show(index+1);};'
        + 'document.querySelector("#navigation-button-up button").onclick=()=>{window.fixtureMoves--;show(index-1);};')
      ;
  }
  if (site === "tiktok") {
    return '<!doctype html><meta charset="utf-8">' + common
      + '<div id="xgwrapper-0-' + items[0].id + '"><video muted></video><a href="/@creator">Creator</a></div>'
      + '<div id="navigation-button-down"><button data-e2e="feed-navigation-next" aria-label="Next video">Next</button></div><div id="navigation-button-up"><button data-e2e="feed-navigation-prev" aria-label="Previous video">Previous</button></div>'
      + '<script>fetch("/api/item_list").then(r=>r.json()).then(d=>{window.fixtureResponse=d;});</script>'
      + script(
        'function show(n){index=Math.max(0,Math.min(items.length-1,n));const item=items[index];window.fixtureId=item.id;document.querySelector("[id^=xgwrapper]").id="xgwrapper-0-"+item.id;}'
        + 'document.querySelector("[data-e2e=feed-navigation-next]").onclick=()=>{window.fixtureMoves++;show(index+1);};'
        + 'document.querySelector("[data-e2e=feed-navigation-prev]").onclick=()=>{window.fixtureMoves--;show(index-1);};');
  }
  const data = items.map((item) => ({ code: item.id, like_count: item.likes, is_ad: flag === "data" && item.ad ? true : undefined, user: { username: "fixtureCreator" } }));
  return '<!doctype html><meta charset="utf-8">' + common
    + '<section id="player" style="position:relative;width:800px;height:600px"><video muted style="margin-left:280px"></video><span dir="auto" id="label" hidden>Ad</span></section>'
    + '<button aria-label="Next reel">Next</button><button aria-label="Previous reel">Previous</button>'
    + '<script type="application/json">' + JSON.stringify({ items: data }) + '</script>'
    + script(
      'function show(n){index=Math.max(0,Math.min(items.length-1,n));const item=items[index];window.fixtureId=item.id;history.replaceState({},"","/reels/"+item.id+"/");'
      + 'document.getElementById("label").hidden=!(item.ad&&' + JSON.stringify(flag === "label") + ');}'
      + 'document.querySelector("[aria-label=\\"Next reel\\"]").onclick=()=>{window.fixtureMoves++;show(index+1);};'
      + 'document.querySelector("[aria-label=\\"Previous reel\\"]").onclick=()=>{window.fixtureMoves--;show(index-1);};');
}

// ads: the Skip ads value to start from. Without it the page starts from the default, which is on.
async function start(extension: Awaited<ReturnType<typeof launch>>, site: Site, flag: "data" | "label", ads?: boolean) {
  const { context, worker } = extension;
  await worker.evaluate(async (skipAds) => {
    const { settings } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, enabled: false, ...(skipAds === undefined ? {} : { skipAds }) } });
  }, ads);
  await context.route("https://www." + HOSTS[site] + "/**", async (route) => {
    if (site === "tiktok" && new URL(route.request().url()).pathname === "/api/item_list") {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: FEED.map((item) => ({ id: item.id, isAd: item.ad ? true : undefined, author: { uniqueId: "creator" }, stats: { diggCount: item.likes, playCount: 100000, commentCount: 100 } })) }) });
      return;
    }
    await route.fulfill({ contentType: "text/html", body: page(site, FEED, flag) });
  });
  const tab = await context.newPage();
  const errors: string[] = [];
  tab.on("pageerror", (error) => errors.push(error.message));
  await tab.goto(START[site](FEED[0].id));
  await tab.waitForTimeout(2200);
  await worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, enabled: true } });
  });
  return { tab, errors };
}

const fixtureId = (tab: Awaited<ReturnType<typeof start>>["tab"]) => tab.evaluate(() => (window as unknown as { fixtureId: string }).fixtureId);
const count = (extension: Awaited<ReturnType<typeof launch>>) => extension.worker.evaluate(async () => (await chrome.storage.local.get("dailySkips")).dailySkips?.count ?? 0);

for (const site of ["youtube", "tiktok", "instagram"] as const) {
  test(site + ": an ad is skipped by default, Undo brings it back, and the popup switch turns it off", async ({ extension }) => {
    const { context, id } = extension;
    const { tab, errors } = await start(extension, site, "data");

    // Default: Skip ads is on. The ad with 125 likes is skipped as soon as it is known to be one, and the chip says why.
    await expect.poll(() => fixtureId(tab)).toBe(NORMAL1);
    await expect(tab.locator("#scrollplus-chip-host")).toContainText(/Skipped · ad|넘김 · 광고/);
    await expect.poll(() => count(extension)).toBe(1);

    const popup = await open(context, id, "popup.html");
    const adsSwitch = popup.getByRole("switch", { name: /Skip ads|광고 건너뛰기/ });
    await expect(adsSwitch).toHaveAttribute("aria-checked", "true");
    expect((await stored(popup)).skipAds).toBe(true);

    // The ordinary video after the ad stays, even though the ad's leftovers are still on the page
    // for a moment. Undo is still on offer for 2.5 seconds, so use it after watching for a while.
    await tab.waitForTimeout(1200);
    expect(await fixtureId(tab)).toBe(NORMAL1);
    expect(await count(extension)).toBe(1);

    // Undo returns to the ad and keeps it for the session.
    await tab.getByRole("button", { name: /Undo|되돌리기/ }).click();
    await expect.poll(() => fixtureId(tab)).toBe(AD1);
    await tab.waitForTimeout(2600);
    expect(await fixtureId(tab)).toBe(AD1);
    expect(await count(extension)).toBe(1);

    // Moving on by hand lands on the ordinary video, which stays.
    await tab.evaluate(() => (window as unknown as { fixtureNext: () => void }).fixtureNext());
    await tab.waitForTimeout(2600);
    expect(await fixtureId(tab)).toBe(NORMAL1);

    // An ad with 90,000 likes is skipped too: the ad rule does not look at counts.
    await tab.evaluate(() => (window as unknown as { fixtureNext: () => void }).fixtureNext());
    await expect.poll(() => fixtureId(tab)).toBe(NORMAL2);
    await expect.poll(() => count(extension)).toBe(2);

    // The real popup switch turns it off.
    await adsSwitch.click();
    await expect(adsSwitch).toHaveAttribute("aria-checked", "false");
    await expect.poll(async () => (await stored(popup)).skipAds).toBe(false);
    expect(errors).toEqual([]);
  });

  test(site + ": an ad stays while Skip ads is switched off, and the popup switch applies to the ad on screen", async ({ extension }) => {
    const { context, id } = extension;
    const { tab, errors } = await start(extension, site, "data", false);

    // Off: the ad with 125 likes sits under the 500 minimum and still stays.
    await tab.waitForTimeout(3000);
    expect(await fixtureId(tab), "ads stay while the switch is off").toBe(AD1);
    expect(await count(extension)).toBe(0);

    const popup = await open(context, id, "popup.html");
    const adsSwitch = popup.getByRole("switch", { name: /Skip ads|광고 건너뛰기/ });
    await expect(adsSwitch).toHaveAttribute("aria-checked", "false");
    await adsSwitch.click();
    await expect.poll(async () => (await stored(popup)).skipAds).toBe(true);
    await expect.poll(() => fixtureId(tab)).toBe(NORMAL1);
    await expect(tab.locator("#scrollplus-chip-host")).toContainText(/Skipped · ad|넘김 · 광고/);
    expect(await count(extension)).toBe(1);
    expect(errors).toEqual([]);
  });
}

test("instagram: an ad known only by its visible disclosure is skipped when Skip ads is on, and kept when it is off", async ({ extension }) => {
  const { worker } = extension;
  const { tab, errors } = await start(extension, "instagram", "label", false);
  await tab.waitForTimeout(3000);
  expect(await fixtureId(tab), "ads stay while the switch is off").toBe(AD1);
  await worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, skipAds: true } });
  });
  await expect.poll(() => fixtureId(tab)).toBe(NORMAL1);
  await expect(tab.locator("#scrollplus-chip-host")).toContainText(/Skipped · ad|넘김 · 광고/);
  expect(errors).toEqual([]);
});

test("a site that is switched off keeps its ads even with Skip ads on", async ({ extension }) => {
  const { worker } = extension;
  await worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, skipAds: true, platforms: { ...settings.platforms, youtube: false } } });
  });
  const { tab } = await start(extension, "youtube", "data");
  await tab.waitForTimeout(3500);
  expect(await fixtureId(tab)).toBe(AD1);
  expect(await count(extension)).toBe(0);
});
