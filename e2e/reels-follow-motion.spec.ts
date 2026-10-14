import { expect, test as base } from "@playwright/test";
import { launch } from "./extension";

const test = base.extend<{ extension: Awaited<ReturnType<typeof launch>> }>({
  extension: [async ({}, use) => {
    const extension = await launch();
    try { await use(extension); }
    finally { await extension.close(); }
  }, { timeout: 30000 }],
});

function deepReel(following: boolean, hiddenNeighbour = false): string {
  // Current signed-in Reels puts the creator button 13 ancestors above its video.
  // No friendship flag in the payload: this exercises the visible-button fallback.
  const video = '<div>'.repeat(13) + '<video></video>' + '</div>'.repeat(13);
  const neighbour = hiddenNeighbour ? '<section style="position:absolute;top:-900px"><video></video><button>Following</button></section>' : '';
  return '<!doctype html><meta charset="utf-8"><style>body{margin:0}section{position:relative;width:360px;height:620px;margin-left:500px}video{display:block;width:320px;height:600px}</style>'
    + neighbour + '<section>' + video + '<button id="follow">' + (following ? 'Following' : 'Follow') + '</button></section>'
    + '<button aria-label="Next reel">Next</button><button aria-label="Previous reel">Previous</button>'
    + '<script type="application/json">{"items":[{"code":"deep0","like_count":12,"user":{"username":"creator"}},{"code":"deep1","like_count":8000,"user":{"username":"next"}}]}</script>'
    + '<script>window.fixtureId="deep0";window.fixtureMoves=0;history.replaceState({},"","/reels/deep0/");'
    + 'document.querySelector("[aria-label=\\"Next reel\\"]").onclick=()=>{window.fixtureId="deep1";window.fixtureMoves++;document.getElementById("follow").textContent="Follow";history.replaceState({},"","/reels/deep1/");};</script>';
}

test("Reels keeps the followed creator with a deeply nested player and no JSON relation", async ({ extension }) => {
  await extension.context.route("https://www.instagram.com/**", route => route.fulfill({ contentType: "text/html", body: deepReel(true) }));
  const tab = await extension.context.newPage();
  await tab.goto("https://www.instagram.com/reels/deep0/");
  await tab.waitForTimeout(1800);
  expect(await tab.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("deep0");
  await extension.worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, keepFollowed: false } });
  });
  await expect.poll(() => tab.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("deep1");
  expect(await tab.evaluate(() => (window as { fixtureMoves?: number }).fixtureMoves)).toBe(1);
});

test("Reels ignores a followed button in an offscreen neighbour", async ({ extension }) => {
  await extension.context.route("https://www.instagram.com/**", route => route.fulfill({ contentType: "text/html", body: deepReel(false, true) }));
  const tab = await extension.context.newPage();
  await tab.goto("https://www.instagram.com/reels/deep0/");
  await expect.poll(() => tab.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("deep1");
  expect(await tab.evaluate(() => (window as { fixtureMoves?: number }).fixtureMoves)).toBe(1);
});

function scrollingReels(): string {
  const items = [12, 18, 42, 8000].map((likes, i) => ({ code: 'motion' + i, like_count: likes, user: { username: 'creator' } }));
  return '<!doctype html><meta charset="utf-8"><style>body{margin:0}section{margin-left:500px;width:360px;height:620px}video{width:320px;height:600px}p{position:fixed;left:270px;width:150px;top:700px}</style>'
    + '<section><video></video><button>Follow</button><p id="caption">Creator caption crosses the gutter</p></section>'
    + '<button aria-label="Next reel">Next</button><button aria-label="Previous reel">Previous</button>'
    + '<script type="application/json">' + JSON.stringify({ items }) + '</script>'
    + '<script>let index=0,timer=null;window.fixtureId="motion0";window.visibleFrames=[];window.lastScroll=0;window.lastMove=0;'
    + 'history.replaceState({},"","/reels/motion0/");'
    + 'document.querySelector("[aria-label=\\"Next reel\\"]").onclick=()=>{if(index>=3)return;index++;window.lastMove=performance.now();window.fixtureId="motion"+index;history.replaceState({},"","/reels/"+window.fixtureId+"/");'
    + 'clearInterval(timer);let step=0;const caption=document.getElementById("caption");caption.style.top="340px";'
    + 'timer=setInterval(()=>{caption.style.top=(340+(++step)*70)+"px";window.lastScroll=performance.now();document.dispatchEvent(new Event("scroll"));if(step===5){clearInterval(timer);document.dispatchEvent(new Event("scrollend"));}},30);};'
    + 'function record(){const host=document.getElementById("scrollplus-chip-host");if(host&&host.shadowRoot.querySelector(".chip")&&getComputedStyle(host).visibility==="visible")window.visibleFrames.push({at:performance.now(),lastScroll:window.lastScroll,id:window.fixtureId});requestAnimationFrame(record);}requestAnimationFrame(record);</script>';
}

test("Reels shows one settled notice after a scrolling skip burst, with no interim width jumps", async ({ extension }) => {
  await extension.context.route("https://www.instagram.com/**", route => route.fulfill({ contentType: "text/html", body: scrollingReels() }));
  const tab = await extension.context.newPage();
  await tab.goto("https://www.instagram.com/reels/motion0/");
  await expect.poll(() => tab.evaluate(() => (window as any).fixtureId)).toBe("motion3");
  await expect(tab.locator("#scrollplus-chip-host")).toBeVisible();
  const frames = await tab.evaluate(() => (window as any).visibleFrames as Array<{ at: number; lastScroll: number; id: string }>);
  expect(frames.length).toBeGreaterThan(0);
  expect(frames.every(frame => frame.id === "motion3" && frame.at - frame.lastScroll >= 180)).toBe(true);
  await expect(tab.locator("#scrollplus-chip-host .r")).toHaveCount(3);
  await expect(tab.getByRole("button", { name: /Undo|되돌리기/ })).toBeVisible();
  const before = await extension.worker.evaluate(async () => (await chrome.storage.local.get("dailySkips")).dailySkips.count);
  expect(before).toBe(3);
  const undo = tab.getByRole("button", { name: /Undo|되돌리기/ });
  await undo.focus();
  await tab.evaluate(() => document.dispatchEvent(new Event("scroll")));
  await expect(tab.locator("#scrollplus-chip-host")).toBeHidden();
  await expect(tab.locator("#scrollplus-chip-host")).toBeVisible();
  await expect(undo).toBeFocused();
});
