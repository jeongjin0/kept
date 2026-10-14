import { expect, test as base } from "@playwright/test";
import { launch } from "./extension";

const test = base.extend<{ extension: Awaited<ReturnType<typeof launch>> }>({
  extension: [async ({}, use) => {
    const extension = await launch(undefined, undefined, true);
    try { await use(extension); }
    finally { await extension.close(); }
  }, { timeout: 30000 }],
});

// Isolated site responses exercise the installed bridge and engine. They do
// not establish that a live TikTok account can retain a follow.
for (const relation of [1, 3]) {
  test(`TikTok: a fresh relation ${relation} cancels a waiting skip; an acknowledgement alone does not grant the exception`, async ({ extension }) => {
    const { context, worker } = extension;
    let currentRelation = 0;
    await context.route("https://www.tiktok.com/**", async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/api/item_list/") {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ itemList: [{
          id: "7201", author: { uniqueId: "creator", relation: currentRelation },
          stats: { diggCount: 12, playCount: 100000, commentCount: 20 },
        }] }) });
      } else if (pathname === "/api/commit/follow/user/") {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status_code: 0, status_msg: "", follow_status: 1 }) });
      } else {
        await route.fulfill({ contentType: "text/html", body: `<!doctype html><meta charset="utf-8">
          <style>body{margin:0}video{width:320px;height:600px;display:block}</style>
          <div id="xgwrapper-0-7201"><video muted></video><a href="/@creator">Creator</a></div>
          <button data-e2e="feed-navigation-next" disabled>Next video</button>
          <button id="follow">Follow</button><button id="refresh">Refresh item</button>
          <script>
            window.fixtureMoves=0;
            function refresh(){return fetch('/api/item_list/').then(r=>r.json());}
            refresh();
            document.querySelector('[data-e2e=feed-navigation-next]').onclick=()=>{
              window.fixtureMoves++;
              document.querySelector('[id^=xgwrapper]').id='xgwrapper-0-7202';
            };
            document.getElementById('follow').onclick=()=>fetch('/api/commit/follow/user/?type=1',{method:'POST'}).then(r=>r.json()).then(d=>window.fixtureAck=d);
            document.getElementById('refresh').onclick=refresh;
          </script>` });
      }
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      (window as any).fixtureBridge = [];
      window.addEventListener("message", event => {
        if (event.source === window && event.data?.source === "scrollplus" && event.data.type === "item") {
          (window as any).fixtureBridge.push({ id: event.data.item.id, followed: event.data.item.followed, likes: event.data.item.metrics?.likes });
        }
      });
    });
    await page.goto("https://www.tiktok.com/foryou");
    await page.bringToFront();
    await expect.poll(() => page.evaluate(() => document.hidden)).toBe(false);
    const lastItem = () => page.evaluate(() => (window as any).fixtureBridge.filter((item: any) => item.id === "7201").at(-1));
    await expect.poll(lastItem).toEqual({ id: "7201", followed: false, likes: 12 });
    await page.getByRole("button", { name: "Follow", exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).fixtureAck)).toEqual({ status_code: 0, status_msg: "", follow_status: 1 });
    await page.waitForTimeout(1000);
    expect(await lastItem()).toEqual({ id: "7201", followed: false, likes: 12 });
    expect(await page.evaluate(() => (window as any).fixtureMoves)).toBe(0);

    currentRelation = relation;
    await page.getByRole("button", { name: "Refresh item", exact: true }).click();
    await expect.poll(lastItem).toEqual({ id: "7201", followed: true, likes: 12 });
    await page.evaluate(() => { document.querySelector<HTMLButtonElement>('[data-e2e="feed-navigation-next"]')!.disabled = false; });
    await page.waitForTimeout(1600);
    expect(await page.evaluate(() => (window as any).fixtureMoves)).toBe(0);
    await worker.evaluate(async () => {
      const { settings } = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...settings, keepFollowed: false } });
    });
    await expect.poll(() => page.evaluate(() => (window as any).fixtureMoves)).toBe(1);
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => (window as any).fixtureMoves)).toBe(1);
    expect(await worker.evaluate(async () => (await chrome.storage.local.get("totalSkips")).totalSkips.count)).toBe(1);
    expect(errors).toEqual([]);
  });
}
