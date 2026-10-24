import { expect, test } from "@playwright/test";
import { launch, open, stored } from "./extension";

function feed(passingAfterFirst = false) {
  return `<!doctype html><meta charset="utf-8"><title>Popup recovery fixture</title>
  <style>body{margin:0}video{position:absolute;left:20px;top:64px;width:320px;height:600px;background:#222}button{height:40px}</style>
  <video muted></video><div id="navigation-button-down"><button aria-label="Next video">Next</button></div><div id="navigation-button-up"><button aria-label="Previous video">Previous</button></div>
  <script>window.fixtureIndex=0;window.fixtureBacks=0;
  function show(index){window.fixtureIndex=Math.max(0,Math.min(15,index));const i=window.fixtureIndex;
    history.replaceState({},'', '/shorts/recovery'+i);
    window.ytInitialPlayerResponse={videoDetails:{videoId:'recovery'+i,channelId:'UCfixture',viewCount:'100000'},likeCount:${passingAfterFirst}&&i>0?8000:10};
    document.dispatchEvent(new Event('yt-navigate-finish'));}
  document.querySelector('[aria-label="Next video"]').onclick=()=>show(window.fixtureIndex+1);
  document.querySelector('[aria-label="Previous video"]').onclick=()=>{if(window.blockRetreat)return;window.fixtureBacks++;show(window.fixtureIndex-1)};show(0);</script>`;
}

async function setup(language: "en" | "ko", passingAfterFirst = false, notifications = false) {
  const extension = await launch(language);
  const { context, worker, id } = extension;
  await worker.evaluate(async notifications => {
    const { settings } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, enabled: false, showSkipChip: notifications } });
  }, notifications);
  await context.route("https://www.youtube.com/**", route => route.fulfill({ contentType: "text/html", body: feed(passingAfterFirst) }));
  // An extension page stands in for the toolbar popup. Its active-tab query is
  // pinned to the routed feed; runtime messages still cross real extension worlds.
  await context.addInitScript(() => {
    if (!location.href.startsWith("chrome-extension://") || !location.pathname.endsWith("/popup.html")) return;
    const query = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = ((info: chrome.tabs.QueryInfo) => info.active && info.currentWindow ? query({ url: "https://www.youtube.com/*" }) : query(info)) as typeof chrome.tabs.query;
  });
  const tab = await context.newPage();
  await tab.goto("https://www.youtube.com/shorts/recovery0");
  await expect.poll(() => worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: "https://www.youtube.com/*" });
    try { return (await chrome.tabs.sendMessage(tab.id!, { type: "scrollplus:context" })).controls?.inFeed; } catch { return false; }
  })).toBe(true);
  await worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, enabled: true } });
  });
  return { ...extension, tab, popup: () => open(context, id, "popup.html") };
}

for (const language of ["en", "ko"] as const) {
  test(`${language}: hidden six-skip pause is recoverable from the popup and notice settings do not resume it`, async () => {
    const ext = await setup(language);
    try {
      await expect.poll(() => ext.tab.evaluate(() => (window as any).fixtureIndex)).toBe(6);
      const popup = await ext.popup();
      await expect(popup.getByText(language === "ko" ? "6회 연속 넘겨 잠시 멈췄습니다." : "Paused after six consecutive skips.")).toBeVisible();
      await popup.getByRole("switch", { name: language === "ko" ? "넘김 알림 표시" : "Skip notifications" }).click();
      await expect.poll(() => stored(popup).then(s => s.showSkipChip)).toBe(true);
      await expect(ext.tab.locator("#scrollplus-chip-host")).toBeHidden();
      expect(await ext.tab.evaluate(() => (window as any).fixtureIndex)).toBe(6);
      await popup.getByRole("button", { name: language === "ko" ? "이어서 보기" : "Keep going", exact: true }).click();
      await expect.poll(() => ext.tab.evaluate(() => (window as any).fixtureIndex)).toBe(12);
      await expect(popup.getByText(language === "ko" ? "6회 연속 넘겨 잠시 멈췄습니다." : "Paused after six consecutive skips.")).toBeVisible();
      await popup.getByRole("button", { name: language === "ko" ? "기준 낮추기" : "Lower the bar", exact: true }).click();
      await expect.poll(() => stored(popup).then(s => s.rule.likes.min)).toBe(200);
      await expect.poll(() => ext.tab.evaluate(() => (window as any).fixtureIndex)).toBeGreaterThan(12);
      const fit = await popup.evaluate(() => ({ height: document.querySelector(".popup")!.getBoundingClientRect().height, overflow: document.documentElement.scrollWidth > innerWidth, bodyBottom: document.querySelector(".body")!.lastElementChild!.getBoundingClientRect().bottom, footerTop: document.querySelector(".foot")!.getBoundingClientRect().top }));
      expect(fit.height).toBeLessThanOrEqual(480); expect(fit.overflow).toBe(false);
      expect(fit.bodyBottom).toBeLessThanOrEqual(fit.footerTop);
    } finally { await ext.context.close(); }
  });
}

test("popup Undo works after notification expiry and keeps the same video across reload", async () => {
  const ext = await setup("en", true, true);
  try {
    await expect.poll(() => ext.tab.evaluate(() => (window as any).fixtureIndex)).toBe(1);
    await ext.tab.waitForTimeout(2800);
    await expect(ext.tab.locator("#scrollplus-chip-host .chip")).toHaveCount(0);
    const popup = await ext.popup();
    await popup.getByRole("button", { name: "Undo", exact: true }).click();
    await expect.poll(() => ext.tab.evaluate(() => (window as any).fixtureIndex)).toBe(0);
    expect(await ext.tab.evaluate(() => (window as any).fixtureBacks)).toBe(1);
    await expect(popup.getByRole("button", { name: "Undo", exact: true })).toHaveCount(0);
    await ext.tab.reload();
    await ext.tab.waitForTimeout(1000);
    expect(await ext.tab.evaluate(() => (window as any).fixtureIndex)).toBe(0);
    const local = await ext.worker.evaluate(() => chrome.storage.local.get(null));
    expect(Object.keys(local).sort()).toEqual(["dailySkips", "schema", "settings", "totalSkips"]);
  } finally { await ext.context.close(); }
});

test("old document and navigated-away popup actions cannot move another video", async () => {
  const ext = await setup("en", true);
  try {
    await expect.poll(() => ext.tab.evaluate(() => (window as any).fixtureIndex)).toBe(1);
    const client = await open(ext.context, ext.id, "options.html");
    const getContext = () => client.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: "https://www.youtube.com/*" });
      return chrome.tabs.sendMessage(tab.id!, { type: "scrollplus:context" });
    });
    const state = await getContext();
    expect(state.controls.canUndo).toBe(true);
    await ext.tab.getByRole("button", { name: "Next video", exact: true }).click();
    const sendOld = () => client.evaluate(async state => {
      const [tab] = await chrome.tabs.query({ url: "https://www.youtube.com/*" });
      return chrome.tabs.sendMessage(tab.id!, { type: "scrollplus:control", action: "undo", documentKey: state.documentKey, revision: state.controls.revision });
    }, state);
    expect((await sendOld()).ok).toBe(false);
    expect(await ext.tab.evaluate(() => (window as any).fixtureBacks)).toBe(0);
    expect((await getContext()).controls.canUndo).toBe(false);
    await ext.tab.reload();
    await expect.poll(() => getContext().then(c => c.documentKey)).not.toBe(state.documentKey);
    expect((await sendOld()).ok).toBe(false);
    expect(await ext.tab.evaluate(() => (window as any).fixtureBacks)).toBe(0);
  } finally { await ext.context.close(); }
});

test("a failed popup Undo reports an error and can be retried on the same adjacent video", async () => {
  const ext = await setup("en", true);
  try {
    await expect.poll(() => ext.tab.evaluate(() => (window as any).fixtureIndex)).toBe(1);
    await ext.tab.evaluate(() => { (window as any).blockRetreat = true; });
    const popup = await ext.popup();
    await popup.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(popup.getByRole("alert")).toContainText("Try again");
    expect(await ext.tab.evaluate(() => (window as any).fixtureIndex)).toBe(1);
    await ext.tab.evaluate(() => { (window as any).blockRetreat = false; });
    await popup.getByRole("button", { name: "Undo", exact: true }).click();
    await expect.poll(() => ext.tab.evaluate(() => (window as any).fixtureIndex)).toBe(0);
    expect(await ext.tab.evaluate(() => (window as any).fixtureBacks)).toBe(1);
    await expect(popup.getByRole("alert")).toHaveCount(0);
  } finally { await ext.context.close(); }
});
