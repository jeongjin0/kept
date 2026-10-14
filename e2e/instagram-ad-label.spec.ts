import { expect, test as base } from "@playwright/test";
import { launch } from "./extension";

const test = base.extend<{ extension: Awaited<ReturnType<typeof launch>> }>({
  extension: [async ({}, use) => {
    const extension = await launch("en");
    try { await use(extension); }
    finally { await extension.close(); }
  }, { timeout: 30000 }],
});

function disclosedReel(labelStyle = ""): string {
  // Native desktop Reels: a 273 px block span containing 15 px of Ad text,
  // in the caption to the left of a bounded, overflowing player container.
  return `<!doctype html><meta charset="utf-8">
    <style>body{margin:0}#player{position:relative;margin-left:476px;width:488px;height:620px}
      video{width:488px;height:620px}#caption{position:absolute;left:-305px;bottom:16px;width:273px}
      #label{display:block;font:12px sans-serif;${labelStyle}}#label[hidden]{display:none}</style>
    <section id="player"><video muted></video><div id="caption"><span dir="auto" id="label">Ad</span></div></section>
    <button aria-label="Next reel">Next</button><button aria-label="Previous reel">Previous</button>
    <script type="application/json">{"items":[{"code":"blockAd","like_count":99021,"user":{"username":"advertiser"}},{"code":"ordinary","like_count":900000,"user":{"username":"creator"}}]}</script>
    <script>window.fixtureMoves=0;window.fixtureId='blockAd';history.replaceState({},'','/reels/blockAd/');
      function show(id){window.fixtureId=id;document.getElementById('label').hidden=id!=='blockAd';history.replaceState({},'','/reels/'+id+'/');}
      document.querySelector('[aria-label="Next reel"]').onclick=()=>{window.fixtureMoves++;show('ordinary');};
      document.querySelector('[aria-label="Previous reel"]').onclick=()=>show('blockAd');</script>`;
}

test("Reels recognises a wide disclosure span: ads off keeps it, on skips it, Undo survives reload", async ({ extension }) => {
  await extension.worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, skipAds: false, rule: { ...settings.rule, likes: { on: true, min: 100000 } } } });
  });
  await extension.context.route("https://www.instagram.com/**", route => route.fulfill({ contentType: "text/html", body: disclosedReel() }));
  const tab = await extension.context.newPage();
  await tab.goto("https://www.instagram.com/reels/blockAd/");
  await tab.waitForTimeout(2400);
  expect(await tab.evaluate(() => (window as any).fixtureId), "an ad below the count rule stays when ads are off").toBe("blockAd");
  expect(await tab.evaluate(() => (window as any).fixtureMoves)).toBe(0);
  await extension.worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, skipAds: true } });
  });
  await expect.poll(() => tab.evaluate(() => (window as any).fixtureId)).toBe("ordinary");
  await expect(tab.locator("#scrollplus-chip-host")).toContainText(/Skipped · ad|넘김 · 광고/);
  await tab.getByRole("button", { name: /Undo|되돌리기/ }).click();
  await expect.poll(() => tab.evaluate(() => (window as any).fixtureId)).toBe("blockAd");
  await tab.reload();
  await tab.waitForTimeout(2400);
  expect(await tab.evaluate(() => (window as any).fixtureId)).toBe("blockAd");
  expect((await extension.worker.evaluate(() => chrome.storage.local.get("dailySkips"))).dailySkips.count).toBe(1);
});

for (const style of ["visibility:hidden", "transform:translateX(-2000px)"]) {
  test(`Reels ignores an invisible disclosure (${style})`, async ({ extension }) => {
    await extension.worker.evaluate(async () => {
      const { settings } = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...settings, skipAds: false, rule: { ...settings.rule, likes: { on: true, min: 100000 } } } });
    });
    await extension.context.route("https://www.instagram.com/**", route => route.fulfill({ contentType: "text/html", body: disclosedReel(style) }));
    const tab = await extension.context.newPage();
    await tab.goto("https://www.instagram.com/reels/blockAd/");
    await expect.poll(() => tab.evaluate(() => (window as any).fixtureId)).toBe("ordinary");
    await expect(tab.locator("#scrollplus-chip-host")).toContainText(/99[,.]?021|99(?:\.0)?K|9\.9만/);
  });
}
