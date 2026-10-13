import { expect, test as base } from "@playwright/test";
import { launch } from "./extension";

const test = base.extend<{ extension: Awaited<ReturnType<typeof launch>> }>({
  extension: [async ({}, use) => {
    const extension = await launch();
    try { await use(extension); }
    finally { await extension.context.close(); }
  }, { timeout: 30000 }],
});

interface Feed {
  likes: number[];
  // How long, by video number, the site keeps its Next control disabled after that video arrived. TikTok does this until it has
  // added the next video to the feed. A video number that is not listed has the control enabled at once.
  disabledFor?: Record<number, number>;
  // The control stays disabled for good from this video on.
  stuckAt?: number;
  // The time between a press and the arrival of the next video.
  moveMs?: number;
  // For this long in the middle of every move the page has no video on screen, as while TikTok scrolls.
  noPlayerMs?: number;
}

// A routed TikTok For You page: the site's own Next control, one player whose volume is set again for every video, a scroll event
// when a video has arrived, and a stats response that carries the like counts. It does not establish compatibility with the live site.
function page(feed: Feed): string {
  return '<!doctype html><meta charset="utf-8"><style>body{margin:0}video{width:320px;height:600px;display:block}</style>'
    + '<div id="xgwrapper-0-1000"><video></video><a href="/@creator">creator</a></div>'
    + '<button data-e2e="feed-navigation-next">Next</button>'
    + '<button data-e2e="feed-navigation-prev">Previous</button>'
    + '<script>const likes=' + JSON.stringify(feed.likes) + ',disabledFor=' + JSON.stringify(feed.disabledFor ?? {}) + ',stuckAt=' + (feed.stuckAt ?? -1)
    + ',moveMs=' + (feed.moveMs ?? 120) + ',noPlayerMs=' + (feed.noPlayerMs ?? 0) + ';'
    + 'let index=0,moving=false;window.presses=[];window.arrivals=[];window.enabledAt=[];'
    + 'const wrapper=document.querySelector("[id^=xgwrapper]"),video=document.querySelector("video"),next=document.querySelector("[data-e2e=feed-navigation-next]"),prev=document.querySelector("[data-e2e=feed-navigation-prev]");'
    + 'fetch("/api/item_list").then(r=>r.json());'
    + 'function arrive(n){index=n;wrapper.id="xgwrapper-0-"+(1000+n);window.fixtureId=1000+n;video.style.marginTop="0";'
    // The site sets the sound again whenever a video becomes the active one.
    + 'video.muted=false;window.arrivals.push(Math.round(performance.now()));'
    + 'const wait=disabledFor[n]||0;'
    + 'if(n===stuckAt||n+1>=likes.length)next.disabled=true;else if(wait){next.disabled=true;setTimeout(()=>{next.disabled=false;window.enabledAt.push(Math.round(performance.now()))},wait);}else next.disabled=false;'
    + 'document.dispatchEvent(new Event("scroll"));document.dispatchEvent(new Event("scrollend"));}'
    + 'window.arriveBy=arrive;'
    + 'prev.onclick=()=>{if(index>0)arrive(index-1);};'
    + 'next.onclick=()=>{window.presses.push({at:Math.round(performance.now()),index});if(moving)return;moving=true;'
    + 'setTimeout(()=>{if(noPlayerMs){video.style.marginTop="-3000px";document.dispatchEvent(new Event("scroll"));setTimeout(()=>{moving=false;arrive(index+1);},noPlayerMs);}else{moving=false;arrive(index+1);}},moveMs);};'
    + 'arrive(0);</script>';
}

type Tab = Awaited<ReturnType<Awaited<ReturnType<typeof launch>>["context"]["newPage"]>>;

async function open(extension: Awaited<ReturnType<typeof launch>>, feed: Feed): Promise<Tab> {
  await extension.context.route("https://www.tiktok.com/**", (route) => {
    if (new URL(route.request().url()).pathname === "/api/item_list") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ items: feed.likes.map((count, n) => ({ id: String(1000 + n), author: { uniqueId: "creator" }, stats: { diggCount: count, playCount: 100000, commentCount: 100 } })) }),
      });
    }
    return route.fulfill({ contentType: "text/html", body: page(feed) });
  });
  const tab = await extension.context.newPage();
  await tab.goto("https://www.tiktok.com/foryou");
  return tab;
}

interface FixtureState { presses: Array<{ at: number; index: number }>; arrivals: number[]; enabledAt: number[] }
const snapshot = (tab: Tab) => tab.evaluate(() => {
  const w = window as unknown as FixtureState;
  return { presses: w.presses, arrivals: w.arrivals, enabledAt: w.enabledAt };
});
const id = (tab: Tab) => tab.evaluate(() => (window as unknown as { fixtureId: number }).fixtureId);
const muted = (tab: Tab) => tab.evaluate(() => document.querySelector("video")!.muted);
const personPressesNext = (tab: Tab) => tab.evaluate(() => document.querySelector<HTMLElement>('[data-e2e="feed-navigation-next"]')!.click());

test("TikTok: a skip waits for the next control to be offered and presses within a moment of it", async ({ extension }) => {
  // The 10-like video arrives while TikTok has no next video yet, so its Next control is disabled for 1.2 s.
  const tab = await open(extension, { likes: [40000, 10, 40000], disabledFor: { 1: 1200 } });
  await tab.waitForTimeout(2200);
  await personPressesNext(tab);
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe(1002);
  const { presses, arrivals, enabledAt } = await snapshot(tab);
  // Press 1 is the person's, press 2 the extension's. The old blind wait for a move that cannot start ended 2.2 s after the video.
  expect(presses).toHaveLength(2);
  expect(presses[1].at - enabledAt[0]).toBeGreaterThanOrEqual(0);
  expect(presses[1].at - enabledAt[0]).toBeLessThan(300);
  expect(presses[1].at - arrivals[1]).toBeLessThan(1800);
});

test("TikTok: skips in a row follow a fraction of a second after each video arrived", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 20, 30, 40000], moveMs: 120 });
  await tab.waitForTimeout(2200);
  await personPressesNext(tab);
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe(1004);
  const { presses } = await snapshot(tab);
  expect(presses).toHaveLength(4);
  // A skip that follows a skip: the move (120 ms) plus the settle time after the arrival. The old wait alone was 450 ms.
  for (const gap of [presses[2].at - presses[1].at, presses[3].at - presses[2].at]) {
    expect(gap).toBeGreaterThanOrEqual(220);
    expect(gap).toBeLessThan(450);
  }
});

test("TikTok: the sound is left alone, because TikTok keeps a mute made by a script for every later video", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 20, 40000, 40000], moveMs: 200, disabledFor: { 2: 800 } });
  await tab.evaluate(() => {
    const w = window as unknown as { volumeEvents: string[] };
    const video = document.querySelector("video")!;
    w.volumeEvents = [];
    video.addEventListener("volumechange", () => w.volumeEvents.push(video.muted + "/" + video.volume));
  });
  await tab.waitForTimeout(2200);
  await personPressesNext(tab);
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe(1003);
  await tab.waitForTimeout(500);
  // On the live site every video after a muted one started muted, and kept videos played without sound for the rest of the session.
  expect(await tab.evaluate(() => (window as unknown as { volumeEvents: string[] }).volumeEvents)).toEqual([]);
  expect(await muted(tab)).toBe(false);
});

test("TikTok: a skip the site never offers a move for is given up after 5 s without pressing again", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 40000], stuckAt: 1 });
  await tab.waitForTimeout(2200);
  await personPressesNext(tab);
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe(1001);
  await tab.waitForTimeout(6500);
  expect((await snapshot(tab)).presses).toHaveLength(1);
  expect(await id(tab)).toBe(1001);
});

test("TikTok: a skip that follows a skip changes the words of the chip instead of showing a new one", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 20, 30, 40000], moveMs: 200 });
  await tab.waitForTimeout(2200);
  await personPressesNext(tab);
  await tab.waitForFunction(() => document.querySelector("#scrollplus-chip-host")?.shadowRoot?.querySelector(".chip"));
  const chip = await tab.evaluateHandle(() => document.querySelector("#scrollplus-chip-host")!.shadowRoot!.querySelector(".chip")!);
  await expect(tab.locator("#scrollplus-chip-host")).toContainText(/30/, { timeout: 8000 });
  // The same chip, still shown, now lists the row of skips: the newest first, and the head says how many.
  expect(await chip.evaluate((node) => ({ shown: node.isConnected && !node.classList.contains("leaving"), rows: Array.from(node.querySelectorAll(".r")).map((row) => row.textContent), head: node.querySelector(".label")!.textContent }))).toEqual({
    shown: true,
    rows: [expect.stringMatching(/30/), expect.stringMatching(/20/), expect.stringMatching(/10/)],
    head: expect.stringMatching(/3 skipped in a row|연속 3개/),
  });
});

test("TikTok: Undo still works while the next skip waits for the site", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 20, 40000], disabledFor: { 2: 4000 } });
  await tab.waitForTimeout(2200);
  // The person scrolls to the 10-like video; the extension skips it, and the 20-like video that follows has to wait for TikTok.
  await personPressesNext(tab);
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe(1002);
  await tab.getByRole("button", { name: /Undo|되돌리기/ }).click();
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe(1001);
  await tab.waitForTimeout(5000);
  expect((await snapshot(tab)).presses).toHaveLength(2);
  expect(await id(tab)).toBe(1001);
});

test("TikTok: a person who scrolls on while the skip waits is not pressed past", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 40000, 40000], disabledFor: { 1: 1500 } });
  await tab.waitForTimeout(2200);
  await personPressesNext(tab);
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe(1001);
  await tab.waitForTimeout(500);
  await tab.evaluate(() => (window as unknown as { arriveBy: (n: number) => void }).arriveBy(2));
  await tab.waitForTimeout(2500);
  expect(await id(tab)).toBe(1002);
  expect((await snapshot(tab)).presses).toHaveLength(1);
  expect(await muted(tab)).toBe(false);
});

test("TikTok: six skips in a row still pause the extension when the player is missing for a moment between videos", async ({ extension }) => {
  const tab = await open(extension, { likes: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10], moveMs: 100, noPlayerMs: 120 });
  await expect(tab.locator("#scrollplus-chip-host")).toContainText(/under your bar|기준 아래/, { timeout: 15000 });
  await tab.waitForTimeout(1500);
  expect(await id(tab)).toBe(1006);
  expect((await snapshot(tab)).presses).toHaveLength(6);
});
