import { expect, test as base } from "@playwright/test";
import { launch } from "./extension";

const test = base.extend<{ extension: Awaited<ReturnType<typeof launch>> }>({
  extension: [async ({}, use) => {
    const extension = await launch();
    try { await use(extension); }
    finally { await extension.context.close(); }
  }, { timeout: 30000 }],
});

const FEED = [
  { id: "7101", relation: 1, likes: 12 },
  { id: "7102", relation: 2, likes: 12 },
  { id: "7103", relation: 3, likes: 12 },
  { id: "7104", relation: 0, likes: 8000 },
];

function page(): string {
  return "<!doctype html><meta charset=\"utf-8\">"
    + "<style>body{margin:0}video{width:320px;height:600px;display:block}button{height:40px}</style>"
    + "<div id=\"xgwrapper-0-7101\"><video muted></video><a href=\"/@creator\">Creator</a></div>"
    + "<div id=\"navigation-button-down\"><button data-e2e=\"feed-navigation-next\" aria-label=\"Next video\">Next</button></div>"
    + "<div id=\"navigation-button-up\"><button data-e2e=\"feed-navigation-prev\" aria-label=\"Previous video\">Previous</button></div>"
    + "<script>const items = " + JSON.stringify(FEED) + "; let index = 0; window.fixtureMoves = 0;"
    + "fetch('/api/item_list').then(function (response) { return response.json(); }).then(function (data) { window.fixtureResponse = data; });"
    + "function show(next) { index = Math.max(0, Math.min(items.length - 1, next)); var item = items[index]; window.fixtureId = item.id; document.querySelector('[id^=xgwrapper]').id = 'xgwrapper-0-' + item.id; }"
    + "document.querySelector('[data-e2e=feed-navigation-next]').onclick = function () { window.fixtureMoves++; show(index + 1); };"
    + "document.querySelector('[data-e2e=feed-navigation-prev]').onclick = function () { window.fixtureMoves--; show(index - 1); };"
    + "show(0);</script>";
}

test("tiktok keeps a followed creator under the like bar, and skips them when the switch is off", async ({ extension }) => {
  const { context, worker } = extension;
  await context.route("https://www.tiktok.com/**", async (route) => {
    if (new URL(route.request().url()).pathname === "/api/item_list") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          itemList: FEED.map((item) => ({
            id: item.id,
            author: { uniqueId: "creator", relation: item.relation },
            stats: { diggCount: item.likes, playCount: 100000, commentCount: 20 },
          })),
        }),
      });
      return;
    }
    await route.fulfill({ contentType: "text/html", body: page() });
  });
  const host = await context.newPage();
  const errors: string[] = [];
  host.on("pageerror", (error) => errors.push(error.message));
  await host.goto("https://www.tiktok.com/foryou");
  await expect.poll(() => host.evaluate(() => (window as { fixtureResponse?: { itemList?: unknown[] } }).fixtureResponse?.itemList?.length)).toBe(4);
  await host.waitForTimeout(1600);
  expect(await host.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("7101");
  await host.getByRole("button", { name: "Next video" }).click();
  await expect.poll(() => host.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("7103");
  await host.waitForTimeout(1200);
  expect(await host.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("7103");
  await worker.evaluate(async () => {
    const data = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...data.settings, keepFollowed: false } });
  });
  await host.reload();
  await expect.poll(() => host.evaluate(() => (window as { fixtureId?: string }).fixtureId), { timeout: 15000 }).toBe("7104");
  expect(errors).toEqual([]);
});
test("youtube keeps a subscribed channel under the like bar", async ({ extension }) => {
  const { context } = extension;
  await context.route("https://www.youtube.com/**", async (route) => {
    await route.fulfill({ contentType: "text/html", body: youtubePage() });
  });
  const host = await context.newPage();
  const errors: string[] = [];
  host.on("pageerror", (error) => errors.push(error.message));
  await host.goto("https://www.youtube.com/shorts/8101");
  await host.waitForTimeout(1600);
  expect(await host.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("8101");
  await host.getByRole("button", { name: "Next video" }).click();
  await expect.poll(() => host.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("8103");
  await host.waitForTimeout(1000);
  expect(await host.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("8103");
  expect(errors).toEqual([]);
});

test("instagram keeps a followed creator under the like bar", async ({ extension }) => {
  const { context } = extension;
  await context.route("https://www.instagram.com/**", async (route) => {
    await route.fulfill({ contentType: "text/html", body: instagramPage() });
  });
  const host = await context.newPage();
  const errors: string[] = [];
  host.on("pageerror", (error) => errors.push(error.message));
  await host.goto("https://www.instagram.com/reel/8101/");
  await host.waitForTimeout(1800);
  expect(await host.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("8101");
  await host.getByRole("button", { name: "Next reel" }).click();
  await expect.poll(() => host.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("8103");
  await host.waitForTimeout(1000);
  expect(await host.evaluate(() => (window as { fixtureId?: string }).fixtureId)).toBe("8103");
  expect(errors).toEqual([]);
});

function youtubePage(): string {
  return '<!doctype html><meta charset="utf-8"><style>body{margin:0}video{width:320px;height:600px;display:block}button{height:40px}</style>'
    + '<ytd-reel-video-renderer id="reel"><video muted></video><button aria-label="구독중">구독중</button></ytd-reel-video-renderer>'
    + '<div id="navigation-button-down"><button aria-label="Next video">Next</button></div>'
    + '<div id="navigation-button-up"><button aria-label="Previous video">Previous</button></div>'
    + "<script>const items=[{id:'8101',subscribed:true,likes:12},{id:'8102',subscribed:false,likes:12},{id:'8103',subscribed:false,likes:8000}];"
    + 'let index=0;window.fixtureMoves=0;'
    + 'function show(next){index=Math.max(0,Math.min(items.length-1,next));const item=items[index];window.fixtureId=item.id;'
    + "history.replaceState({},'','/shorts/'+item.id);"
    + 'window.ytInitialPlayerResponse={videoDetails:{videoId:item.id,channelId:\'UCfixture\',viewCount:\'100000\'},likeCount:item.likes,'
    + 'frameworkUpdates:{entityBatchUpdate:{mutations:[{entityKey:\'sub\',payload:{subscriptionStateEntity:{key:\'sub\',subscribed:item.subscribed}}}]}}};'
    + "document.querySelector('#reel button').setAttribute('aria-label', item.subscribed ? '구독중' : '구독');"
    + "document.querySelector('#reel button').textContent=item.subscribed ? '구독중' : '구독';"
    + "document.dispatchEvent(new Event('yt-navigate-finish'));}"
    + "document.querySelector('#navigation-button-down button').onclick=function(){window.fixtureMoves++;show(index+1);};"
    + "document.querySelector('#navigation-button-up button').onclick=function(){window.fixtureMoves--;show(index-1);};"
    + 'show(0);</script>';
}

function instagramPage(): string {
  return '<!doctype html><meta charset="utf-8"><style>body{margin:0}video{width:320px;height:600px;display:block}button{height:40px}</style>'
    + '<section id="player" style="position:relative;width:400px;height:700px"><video muted></video><button id="follow">팔로잉</button></section>'
    + '<button aria-label="Next reel">Next</button><button aria-label="Previous reel">Previous</button>'
    + '<script id="payload" type="application/json"></script>'
    + "<script>const items=[{id:'8101',following:true,likes:12},{id:'8102',following:false,likes:12},{id:'8103',following:false,likes:8000}];"
    + 'let index=0;window.fixtureMoves=0;'
    + 'function show(next){index=Math.max(0,Math.min(items.length-1,next));const item=items[index];window.fixtureId=item.id;'
    + "history.replaceState({},'','/reel/'+item.id+'/');"
    + "document.getElementById('payload').textContent=JSON.stringify({items:[{code:item.id,like_count:item.likes,user:{username:'creator',friendship_status:{following:item.following}}}]});"
    + "document.getElementById('follow').textContent=item.following ? '팔로잉' : '팔로우';}"
    + "document.querySelector('[aria-label=\"Next reel\"]').onclick=function(){window.fixtureMoves++;show(index+1);};"
    + "document.querySelector('[aria-label=\"Previous reel\"]').onclick=function(){window.fixtureMoves--;show(index-1);};"
    + 'show(0);</script>';
}

