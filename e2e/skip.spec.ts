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

test("the chip always stays left and lists the last three skips without a heading", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/player.html");
  const video = (await page.locator("#stage").boundingBox())!;
  for (let index = 1; index <= 4; index++) {
    await page.evaluate(({ index, metrics }) => {
      // Legacy overlay settings cannot bring back an over-video position.
      (window as any).__scrollplus.settings.chipPosition = "middle";
      window.__scrollplus.show({ id: "weak" + index, metrics });
    }, { index, metrics: { ...low, likes: 9 + index } });
    await expect(page.locator("#advances")).toHaveText(String(index));
    await page.waitForTimeout(150);
    const box = (await page.locator("#scrollplus-chip-host").boundingBox())!;
    expect(box.x + box.width).toBeCloseTo(video.x - 16, 0);
    expect(box.y + box.height / 2).toBeCloseTo(360, 0);
    expect(box.width).toBe(228);
  }
  const host = page.locator("#scrollplus-chip-host");
  await expect(host.locator(".r")).toHaveText(["Skipped · 13 likes", "Skipped · 12 likes", "Skipped · 11 likes"]);
  await expect(host.locator(".head")).toBeHidden();
});

test("with little room on the left the chip shrinks, and with none it waits for room without covering the video", async ({ page }) => {
  // A window of 560 px with the video at 140 to 440: a card fits on neither side (88 px on the left, 42 px on the right of the buttons),
  // a pill of 44 px fits on the left.
  await page.setViewportSize({ width: 560, height: 720 });
  await page.goto("/player.html");
  await page.evaluate(() => { (document.querySelector("#stage") as HTMLElement).style.left = "140px"; });
  const video = (await page.locator("#stage").boundingBox())!;
  const host = page.locator("#scrollplus-chip-host");
  await page.evaluate((metrics) => (window as any).__scrollplus.show({ id: "pill1", metrics }), low);
  await expect(page.locator("#advances")).toHaveText("1");
  await expect.poll(async () => (await host.boundingBox())?.width ?? 0).toBeCloseTo(44, 0);
  const pill = (await host.boundingBox())!;
  expect(pill.x + pill.width).toBeCloseTo(video.x - 8, 0);
  // Undo is still there, as the pill's button.
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();

  // With no room at all, do not cover the video or move the chip to the right.
  await page.setViewportSize({ width: 420, height: 720 });
  await page.evaluate(() => { (document.querySelector("#stage") as HTMLElement).style.left = "20px"; });
  await page.evaluate((metrics) => (window as any).__scrollplus.show({ id: "pill2", metrics }), { ...low, likes: 11 });
  await expect(page.locator("#advances")).toHaveText("2");
  await page.waitForTimeout(300);
  await expect(host).toBeHidden();
  // Recover without another skip when the video moves back into a column with left gutter space.
  await page.evaluate(() => { (document.querySelector("#stage") as HTMLElement).style.left = "100px"; });
  await expect(host).toBeVisible();
  const recovered = (await host.boundingBox())!;
  expect(recovered.x + recovered.width).toBeCloseTo(92, 0);
});

test("the default side chip is hidden when no video is on screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/player.html");
  await page.evaluate(() => (window as any).__scrollplus.show({ id: "narrow", metrics: { views: 10000, likes: 10, comments: 0, shares: 0, saves: null } }));
  await expect(page.locator("#scrollplus-chip-host")).toContainText("Skipped · 10 likes");
  // The video of this page sits at 420 px, outside a 360 px window.
  await expect(page.locator("#scrollplus-chip-host")).toBeHidden();
});
