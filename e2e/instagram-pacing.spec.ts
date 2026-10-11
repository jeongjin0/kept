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
  // The time between a press and the arrival of the next reel (at least 60% of it on screen). On the live site: about 0.15 s.
  moveMs?: number;
  // The address changes this long before the next reel is on screen enough to count. On the live site it changes a few
  // hundredths of a second before, and now and then after.
  addressLeadMs?: number;
}

// A routed Instagram Reels page: the site's own Next control, one player whose sound is set again for every reel, the address of the
// reel, a scroll event when a reel has arrived, and the like counts in a data block. It does not establish compatibility with the live site.
function page(feed: Feed): string {
  const data = feed.likes.map((count, n) => ({ code: "reel" + n, like_count: count, comment_count: 100, user: { username: "creator" } }));
  return '<!doctype html><meta charset="utf-8"><style>body{margin:0}video{width:320px;height:600px;display:block}</style>'
    + '<section id="player"><video></video></section>'
    + '<button aria-label="Next reel">Next</button><button aria-label="Previous reel">Previous</button>'
    + '<script type="application/json">' + JSON.stringify({ items: data }) + '</script>'
    + '<script>const count=' + feed.likes.length + ',moveMs=' + (feed.moveMs ?? 150) + ',lead=' + (feed.addressLeadMs ?? 0) + ';'
    + 'let index=0,moving=false;window.presses=[];window.arrivals=[];window.volumeEvents=[];'
    + 'const video=document.querySelector("video"),next=document.querySelector("[aria-label=\\"Next reel\\"]"),prev=document.querySelector("[aria-label=\\"Previous reel\\"]");'
    + 'video.addEventListener("volumechange",()=>window.volumeEvents.push(video.muted+"/"+video.volume));'
    + 'function address(n){index=n;window.fixtureId=n;history.replaceState({},"","/reels/reel"+n+"/");}'
    + 'function arrive(){video.style.marginTop="0";video.muted=false;video.volume=1;window.arrivals.push(Math.round(performance.now()));document.dispatchEvent(new Event("scroll"));document.dispatchEvent(new Event("scrollend"));}'
    + 'prev.onclick=()=>{if(index>0){address(index-1);arrive();}};'
    // Reels takes a press while it is still scrolling, so a second move is not refused.
    + 'next.onclick=()=>{window.presses.push({at:Math.round(performance.now()),index});if(index+1>=count)return;const target=index+1;'
    + 'setTimeout(()=>{if(lead){video.style.marginTop="-3000px";document.dispatchEvent(new Event("scroll"));}address(target);setTimeout(arrive,lead);},Math.max(0,moveMs-lead));};'
    + 'address(0);arrive();</script>';
}

type Tab = Awaited<ReturnType<Awaited<ReturnType<typeof launch>>["context"]["newPage"]>>;

async function open(extension: Awaited<ReturnType<typeof launch>>, feed: Feed): Promise<Tab> {
  await extension.context.route("https://www.instagram.com/**", (route) => route.fulfill({ contentType: "text/html", body: page(feed) }));
  const tab = await extension.context.newPage();
  await tab.goto("https://www.instagram.com/reels/reel0/");
  return tab;
}

interface FixtureState { presses: Array<{ at: number; index: number }>; arrivals: number[]; volumeEvents: string[] }
const snapshot = (tab: Tab) => tab.evaluate(() => {
  const w = window as unknown as FixtureState;
  return { presses: w.presses, arrivals: w.arrivals, volumeEvents: w.volumeEvents };
});
const id = (tab: Tab) => tab.evaluate(() => (window as unknown as { fixtureId: number }).fixtureId);
const personPressesNext = (tab: Tab) => tab.evaluate(() => document.querySelector<HTMLElement>('[aria-label="Next reel"]')!.click());

test("Instagram: skips in a row follow a fraction of a second after each reel arrived", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 20, 30, 40000], moveMs: 150 });
  await tab.waitForTimeout(2200);
  await personPressesNext(tab);
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe(4);
  const { presses } = await snapshot(tab);
  expect(presses).toHaveLength(4);
  // A skip that follows a skip: the move (150 ms), the move being confirmed at the next 50 ms look, and the 100 ms after it. The old
  // wait alone was 450 ms after the confirmation.
  for (const gap of [presses[2].at - presses[1].at, presses[3].at - presses[2].at]) {
    expect(gap).toBeGreaterThanOrEqual(230);
    expect(gap).toBeLessThan(450);
  }
});

test("Instagram: the first skip of a row follows the arrival of the reel within a fraction of a second", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 40000, 10, 40000, 10, 40000, 10, 40000], moveMs: 150 });
  await tab.waitForTimeout(2200);
  // Four skips, each after a reel the person moved on from at a different moment of the 400 ms look at the page.
  for (const reel of [0, 2, 4, 6]) {
    await personPressesNext(tab);
    await expect.poll(() => id(tab), { timeout: 8000 }).toBe(reel + 2);
    await tab.waitForTimeout(130 + reel * 37);
  }
  const { presses, arrivals } = await snapshot(tab);
  expect(presses).toHaveLength(8);
  // The 400 ms look at the page is not waited for: the feed announced each arrival with a scroll event.
  for (const reel of [1, 3, 5, 7]) {
    expect(presses[reel].at - arrivals[reel]).toBeGreaterThanOrEqual(0);
    expect(presses[reel].at - arrivals[reel]).toBeLessThan(250);
  }
});

test("Instagram: a reel whose address came first is moved on from as soon as it is on screen enough", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 40000], moveMs: 200, addressLeadMs: 120 });
  await tab.waitForTimeout(2200);
  await personPressesNext(tab);
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe(2);
  const { presses, arrivals } = await snapshot(tab);
  // The address named the reel 120 ms before it could be moved on from. A press then does nothing, and the 400 ms wait for a
  // retry was longer than the reel needs.
  expect(presses).toHaveLength(2);
  expect(presses[1].at - arrivals[1]).toBeGreaterThanOrEqual(0);
  expect(presses[1].at - arrivals[1]).toBeLessThan(250);
});

test("Instagram: the sound is left alone", async ({ extension }) => {
  const tab = await open(extension, { likes: [40000, 10, 20, 40000, 40000], moveMs: 150 });
  await tab.waitForTimeout(2200);
  const before = (await snapshot(tab)).volumeEvents.length;
  await personPressesNext(tab);
  await expect.poll(() => id(tab), { timeout: 8000 }).toBe(3);
  await tab.waitForTimeout(500);
  // The site sets the sound for every reel. The extension adds nothing of its own: the player is never muted for the length of a skip.
  expect((await snapshot(tab)).volumeEvents.length).toBe(before);
  expect(await tab.evaluate(() => document.querySelector("video")!.muted)).toBe(false);
});
