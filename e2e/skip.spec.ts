declare global {
  interface Window {
    __scrollplus: { show: (item: { id: string; metrics: { views: number; likes: number; comments: number; shares: number; saves: null } | null }) => void };
  }
}
import { expect, test } from "@playwright/test";

const low = { views: 10000, likes: 10, comments: 0, shares: 0, saves: null };

test("fixture skips, pauses, undoes, and fails open without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/player.html");

  await page.evaluate(() => window.__scrollplus.show({ id: "quiet", metrics: null }));
  await page.waitForTimeout(800);
  await expect(page.locator("#advances")).toHaveText("0");

  await page.evaluate((metrics) => window.__scrollplus.show({ id: "low", metrics }), low);
  await expect(page.locator("#advances")).toHaveText("1");
  await expect(page.locator("#scrollplus-chip-host")).toContainText("Skipped · 10 likes");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("#retreats")).toHaveText("1");
  await page.evaluate((metrics) => window.__scrollplus.show({ id: "low", metrics }), low);
  await expect(page.locator("#advances")).toHaveText("1");

  for (let index = 1; index <= 6; index += 1) {
    await page.evaluate(({ metrics, index }) => window.__scrollplus.show({ id: "v" + index, metrics }), { metrics: low, index });
    await page.waitForTimeout(700);
  }
  await page.evaluate((metrics) => window.__scrollplus.show({ id: "v7", metrics }), low);
  await expect(page.locator("#advances")).toHaveText("7");
  await expect(page.locator("#scrollplus-chip-host")).toContainText("under your bar");
  expect(errors).toEqual([]);
});

test("the skip chip is centred on the video, high up by default, and Settings' position moves it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/player.html");
  const video = (await page.locator("#stage").boundingBox())!;
  const videoCentre = video.x + video.width / 2;
  let shown = 0;
  async function chipBox(position?: string) {
    shown += 1;
    // Each skip has its own count: a chip whose words do not change is left where it is.
    const likes = 9 + shown;
    await page.evaluate(({ position, id, metrics }) => {
      const app = (window as any).__scrollplus;
      if (position) app.settings.chipPosition = position;
      app.show({ id, metrics });
    }, { position, id: "weak" + shown, metrics: { ...low, likes } });
    // A skip that follows a skip changes the words of the chip that is already there, so wait for the move itself.
    await expect(page.locator("#advances")).toHaveText(String(shown));
    await expect(page.locator("#scrollplus-chip-host")).toContainText("Skipped · " + likes + " likes");
    await page.waitForTimeout(150);
    return (await page.locator("#scrollplus-chip-host").boundingBox())!;
  }

  // The default is the top: centred on the video, 18% of the window down (130 of 720 px).
  const top = await chipBox();
  expect(top.x + top.width / 2).toBeCloseTo(videoCentre, 0);
  expect(top.y).toBeCloseTo(130, 0);

  // The other two, in the window of a laptop. The chip of the first skip is still up, so this also checks that it moves when it is updated.
  const middle = await chipBox("middle");
  expect(middle.x + middle.width / 2).toBeCloseTo(videoCentre, 0);
  expect(middle.y + middle.height / 2).toBeCloseTo(360, 0);

  const lower = await chipBox("lower");
  expect(lower.x + lower.width / 2).toBeCloseTo(videoCentre, 0);
  // 28% of the window up from the bottom (202 of 720 px).
  expect(lower.y + lower.height).toBeCloseTo(720 - 202, 0);
});

test("the skip chip stays inside a narrow window, and is centred on the window when no video is on screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/player.html");
  await page.evaluate(() => (window as any).__scrollplus.show({ id: "narrow", metrics: { views: 10000, likes: 10, comments: 0, shares: 0, saves: null } }));
  await expect(page.locator("#scrollplus-chip-host")).toContainText("Skipped · 10 likes");
  const box = (await page.locator("#scrollplus-chip-host").boundingBox())!;
  // The video of this page sits at 420 px, outside a 360 px window.
  expect(box.x).toBeGreaterThanOrEqual(8);
  expect(box.x + box.width).toBeLessThanOrEqual(352);
  expect(box.x + box.width / 2).toBeCloseTo(180, 0);
});
