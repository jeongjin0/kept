import { expect, test as base } from "@playwright/test";
import { launch } from "./extension";

const test = base.extend<{ extension: Awaited<ReturnType<typeof launch>> }>({
  extension: [async ({}, use) => {
    const extension = await launch(undefined, undefined, true);
    try { await use(extension); }
    finally { await extension.close(); }
  }, { timeout: 30000 }],
});

interface Feed {
  likes: number[];
  // Press number (counting every press, including the test's own) that the site does not act on at all.
  ignorePress?: number;
  // From this press on, a move takes moveMs; before it, a move is instant.
  slowFrom?: number;
  moveMs?: number;
  // The player was muted by the person before any skip.
  userMuted?: boolean;
}

// A routed YouTube Shorts page with the site's own Next control. Like the real site it announces the start and the finish of
// every move, and it ignores a press made while a move is under way. It does not establish compatibility with the live site.
function page(feed: Feed): string {
  return '<!doctype html><meta charset="utf-8"><style>body{margin:0}video{width:320px;height:600px;display:block}button{height:40px}</style>'
    + '<ytd-reel-video-renderer id="reel-video-renderer"><video></video></ytd-reel-video-renderer>'
    + '<div id="navigation-button-down"><button aria-label="Next video">Next</button></div>'
    + '<script>const likes=' + JSON.stringify(feed.likes) + ',ignorePress=' + (feed.ignorePress ?? 0) + ',slowFrom=' + (feed.slowFrom ?? 0) + ',moveMs=' + (feed.moveMs ?? 0)
    + ';let index=0,moving=false;window.presses=[];window.fixtureMoves=0;window.userMuted=' + (feed.userMuted ? "true" : "false") + ';'
    // Like the site, set the player's volume again whenever a Short is loaded.
    + 'document.querySelector("video").muted=window.userMuted;'
    + 'function show(n){index=n;window.fixtureId="v"+n;history.replaceState({},"","/shorts/v"+n);'
    + 'document.querySelector("video").muted=window.userMuted;'
    + 'window.ytInitialPlayerResponse={videoDetails:{videoId:"v"+n,channelId:"UCfixture",viewCount:"100000"},likeCount:likes[n]};'
    + 'document.dispatchEvent(new Event("yt-navigate-finish"));}'
    + 'document.querySelector("#navigation-button-down button").onclick=()=>{window.presses.push(Math.round(performance.now()));const number=window.presses.length;'
    + 'if(number===ignorePress||moving||index+1>=likes.length)return;'
    + 'moving=true;window.fixtureMoves++;document.dispatchEvent(new Event("yt-navigate-start"));'
    + 'setTimeout(()=>{moving=false;show(index+1);},slowFrom&&number>=slowFrom?moveMs:0);};'
    + 'show(0);</script>';
}

type Tab = Awaited<ReturnType<Awaited<ReturnType<typeof launch>>["context"]["newPage"]>>;

async function open(extension: Awaited<ReturnType<typeof launch>>, feed: Feed): Promise<Tab> {
  await extension.context.route("https://www.youtube.com/**", (route) => route.fulfill({ contentType: "text/html", body: page(feed) }));
  const tab = await extension.context.newPage();
  await tab.goto("https://www.youtube.com/shorts/v0");
  return tab;
}

const id = (tab: Tab) => tab.evaluate(() => (window as unknown as { fixtureId: string }).fixtureId);
const presses = (tab: Tab) => tab.evaluate(() => (window as unknown as { presses: number[] }).presses);
const moves = (tab: Tab) => tab.evaluate(() => (window as unknown as { fixtureMoves: number }).fixtureMoves);

test("YouTube: hidden tabs do not skip, and resume on return", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 40000] });
  await tab.waitForTimeout(2200);
  const feedTabId = await extension.worker.evaluate(async () => {
    const tab = (await chrome.tabs.query({})).find(tab => tab.url?.includes("youtube.com/shorts/"))!;
    await chrome.tabs.create({ windowId: tab.windowId, url: "about:blank", active: true });
    return tab.id!;
  });
  await expect.poll(() => tab.evaluate(() => document.hidden)).toBe(true);
  await tab.evaluate(() => document.querySelector<HTMLElement>("#navigation-button-down button")!.click());
  await tab.waitForTimeout(2000);
  expect(await id(tab)).toBe("v1");
  expect(await presses(tab)).toHaveLength(1);
  await extension.worker.evaluate(id => chrome.tabs.update(id, { active: true }), feedTabId);
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe("v2");
  expect(await presses(tab)).toHaveLength(2);
});

test("YouTube: a cancelled pointer gesture does not leave filtering blocked", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 40000] });
  await tab.waitForTimeout(2200);
  await tab.evaluate(() => {
    document.querySelector("video")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
    document.querySelector<HTMLElement>("#navigation-button-down button")!.click();
  });
  await tab.waitForTimeout(700);
  expect(await id(tab)).toBe("v1");
  await tab.evaluate(() => document.querySelector("video")!.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: 1 })));
  await expect.poll(() => id(tab), { timeout: 3000 }).toBe("v2");
});

test("YouTube: the next low video is skipped about 150 ms after the move, not after the old 450 ms wait", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 20, 30, 40000] });
  await tab.waitForTimeout(2200);
  // The person scrolls on to a first low video; every later skip follows an automatic one.
  await tab.evaluate(() => document.querySelector<HTMLElement>("#navigation-button-down button")!.click());
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe("v4");
  const times = await presses(tab);
  expect(times).toHaveLength(4);
  // Presses 3 and 4 are automatic skips that follow an automatic skip. The old wait alone was 450 ms.
  for (const gap of [times[2] - times[1], times[3] - times[2]]) {
    expect(gap).toBeGreaterThanOrEqual(150);
    expect(gap).toBeLessThan(440);
  }
  expect(await moves(tab)).toBe(4);
});

test("YouTube: a press the site never acts on is pressed again once, without a second move", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 40000], ignorePress: 2 });
  await tab.waitForTimeout(2200);
  await tab.evaluate(() => document.querySelector<HTMLElement>("#navigation-button-down button")!.click());
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe("v2");
  await tab.waitForTimeout(1500);
  const times = await presses(tab);
  // Press 1 is the person's, press 2 the extension's (ignored by the site), press 3 its second attempt.
  expect(times).toHaveLength(3);
  expect(times[2] - times[1]).toBeGreaterThanOrEqual(650);
  expect(times[2] - times[1]).toBeLessThan(1100);
  expect(await moves(tab)).toBe(2);
  expect(await id(tab)).toBe("v2");
});

test("YouTube: a move that has started is never pressed again, however long it takes", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 40000], slowFrom: 2, moveMs: 1300 });
  await tab.waitForTimeout(2200);
  await tab.evaluate(() => document.querySelector<HTMLElement>("#navigation-button-down button")!.click());
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe("v2");
  await tab.waitForTimeout(1500);
  expect(await presses(tab)).toHaveLength(2);
  expect(await moves(tab)).toBe(2);
});
const muted = (tab: Tab) => tab.evaluate(() => document.querySelector("video")!.muted);

test("YouTube: a Short is quiet while it is skipped, and the player is as it was afterwards", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 40000], slowFrom: 2, moveMs: 1000 });
  await tab.waitForTimeout(2200);
  expect(await muted(tab)).toBe(false);
  await tab.evaluate(() => document.querySelector<HTMLElement>("#navigation-button-down button")!.click());
  await expect.poll(async () => (await presses(tab)).length, { timeout: 8000 }).toBe(2);
  await tab.waitForTimeout(300);
  expect(await id(tab)).toBe("v1");
  expect(await muted(tab)).toBe(true);
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe("v2");
  await tab.waitForTimeout(300);
  expect(await muted(tab)).toBe(false);
});

test("YouTube: a player the person muted stays muted through a skip", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 40000], slowFrom: 2, moveMs: 600, userMuted: true });
  await tab.waitForTimeout(2200);
  await tab.evaluate(() => document.querySelector<HTMLElement>("#navigation-button-down button")!.click());
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe("v2");
  await tab.waitForTimeout(300);
  expect(await muted(tab)).toBe(true);
});

test("YouTube: a skip the site never carries out leaves the player as it was", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10], ignorePress: 2 });
  await tab.waitForTimeout(2200);
  await tab.evaluate(() => document.querySelector<HTMLElement>("#navigation-button-down button")!.click());
  // There is no Short after this one, so every press does nothing; the extension gives up and puts the sound back.
  await expect.poll(async () => (await presses(tab)).length, { timeout: 8000 }).toBeGreaterThanOrEqual(3);
  await expect.poll(() => muted(tab), { timeout: 8000 }).toBe(false);
});
