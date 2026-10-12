import { expect, test as base } from "@playwright/test";
import { launch } from "./extension";

const test = base.extend<{ extension: Awaited<ReturnType<typeof launch>> }>({
  extension: [async ({}, use) => {
    const extension = await launch();
    try { await use(extension); }
    finally { await extension.context.close(); }
  }, { timeout: 30000 }],
});

// Reproduces the observed wide caption and compact overlay layouts, with counts
// that lack an is_ad flag. Fixtures do not establish every current site variant.
for (const layout of ["wide", "compact", "letterbox"] as const) {
  test(`Instagram ${layout}: visible low-like advertisement stays, adjacent ordinary reel still skips`, async ({ extension }) => {
    const { context, worker } = extension;
    await worker.evaluate(async () => {
      const { settings } = await chrome.storage.local.get("settings");
      // Skip ads is on by default. These pages are about an advertisement that stays, so it is switched off here.
      await chrome.storage.local.set({ settings: { ...settings, enabled: false, skipAds: false } });
    });
    await context.route("https://www.instagram.com/**", route => route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta charset="utf-8">
        <style>
          body{margin:0}#player{position:relative;width:800px;height:600px}
          video,#image{position:absolute;left:280px;width:320px;height:${layout === "letterbox" ? 320 : 600}px;top:${layout === "letterbox" ? 140 : 0}px}
          #label{position:absolute;left:${layout === "compact" ? 290 : 10}px;bottom:12px;font:12px sans-serif}
          #outside{position:absolute;top:1200px}button{height:40px}
        </style>
        <section id="player"><video muted></video><span dir="auto" id="label">${layout === "compact" ? "광고" : "Ad"}</span></section>
        <section id="outside"><span dir="auto">Sponsored</span></section>
        <button aria-label="Next reel">Next</button><button aria-label="Previous reel">Previous</button>
        <script type="application/json">${JSON.stringify({ items: [
          { code: "advert", like_count: 2, user: { username: "fixtureAd" } },
          { code: "ordinary", like_count: 10, user: { username: "fixtureCreator" } },
          { code: "staticAd", like_count: 0, user: { username: "fixtureAd" } },
          { code: "kept", like_count: 8000, user: { username: "fixtureCreator" } },
        ] })}</script>
        <script>
          let index=0;const ids=['advert','ordinary','staticAd','kept'];window.fixtureMoves=0;
          function show(n){index=Math.max(0,Math.min(3,n));history.replaceState({},'','/reels/'+ids[index]+'/');window.fixtureId=ids[index];document.getElementById('label').hidden=index===1||index===3;const media=document.querySelector('video,#image');if(index===2&&media.tagName==='VIDEO'){media.replaceWith(Object.assign(document.createElement('img'),{id:'image',alt:'Fixture advertisement'}));}else if(index!==2&&media.tagName==='IMG'){media.replaceWith(document.createElement('video'));}}
          document.querySelector('[aria-label="Next reel"]').onclick=()=>{window.fixtureMoves++;show(index+1);};
          document.querySelector('[aria-label="Previous reel"]').onclick=()=>{window.fixtureMoves--;show(index-1);};
          show(0);
        </script>`,
    }));
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("https://www.instagram.com/reels/advert/");
    await page.waitForTimeout(1600);
    await worker.evaluate(async () => {
      const { settings } = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...settings, enabled: true } });
    });
    await page.waitForTimeout(3200);
    expect(await page.evaluate(() => (window as any).fixtureId), "advertisement must stay below the default 500 minimum while Skip ads is off").toBe("advert");
    expect(await page.evaluate(() => (window as any).fixtureMoves)).toBe(0);
    expect((await worker.evaluate(() => chrome.storage.local.get("dailySkips"))).dailySkips?.count ?? 0).toBe(0);
    await page.getByRole("button", { name: "Next reel", exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).fixtureId)).toBe("staticAd");
    await expect(page.locator("#scrollplus-chip-host")).toContainText(/10/);
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => (window as any).fixtureId), "the image advertisement must stay while the preceding Undo remains usable").toBe("staticAd");
    await expect(page.locator("#scrollplus-chip-host")).toContainText(/10/);
    expect((await worker.evaluate(() => chrome.storage.local.get("dailySkips"))).dailySkips.count).toBe(1);
    await page.getByRole("button", { name: /Undo|되돌리기/ }).click();
    await expect.poll(() => page.evaluate(() => (window as any).fixtureId)).toBe("ordinary");
    await page.waitForTimeout(2200);
    expect(await page.evaluate(() => (window as any).fixtureId)).toBe("ordinary");
    expect(errors).toEqual([]);
  });
}
