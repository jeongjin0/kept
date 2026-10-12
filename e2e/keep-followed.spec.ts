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

