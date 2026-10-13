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

test("the skip chip sits beside the video by default, lists a row of skips, and Settings can put it over the video", async ({ page }) => {
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
    // A skip that follows a skip adds a line to the chip that is already there, so wait for the move itself.
    await expect(page.locator("#advances")).toHaveText(String(shown));
    await expect(page.locator("#scrollplus-chip-host")).toContainText("Skipped · " + likes + " likes");
    await page.waitForTimeout(150);
    return (await page.locator("#scrollplus-chip-host").boundingBox())!;
  }

  // The default is beside the video: its right edge 16 px from the video's left edge, and the middle of the visible video (40 to 580 px,
  // so 310) less 20 px. None of the video is covered.
  const side = await chipBox();
  expect(side.x + side.width).toBeCloseTo(video.x - 16, 0);
  expect(side.y + side.height / 2).toBeCloseTo(290, 0);
  expect(side.width).toBeCloseTo(228, 0);
  expect(side.x + side.width).toBeLessThanOrEqual(video.x);

  // The other three put it over the video, centred on its column. Top: 18% of the window down (130 of 720 px). This is the second skip in a
  // row: it adds a line to the same chip. The head says how many, and each reason is listed, newest first.
  const top = await chipBox("top");
  expect(top.x + top.width / 2).toBeCloseTo(videoCentre, 0);
  expect(top.y).toBeCloseTo(130, 0);
  await expect(page.locator("#scrollplus-chip-host")).toContainText("2 skipped in a row");
  const rows = await page.locator("#scrollplus-chip-host").evaluate((host) => Array.from(host.shadowRoot!.querySelectorAll(".r")).map((node) => node.textContent));
  expect(rows).toEqual(["Skipped · 11 likes", "Skipped · 10 likes"]);

  const middle = await chipBox("middle");
  expect(middle.x + middle.width / 2).toBeCloseTo(videoCentre, 0);
  expect(middle.y + middle.height / 2).toBeCloseTo(360, 0);

  const lower = await chipBox("lower");
  expect(lower.x + lower.width / 2).toBeCloseTo(videoCentre, 0);
  // 28% of the window up from the bottom (202 of 720 px).
  expect(lower.y + lower.height).toBeCloseTo(720 - 202, 0);
});

test("with little room beside the video the chip shrinks to a pill, and with none it goes over the video", async ({ page }) => {
  // A window of 560 px with the video at 140 to 440: a card fits on neither side (88 px on the left, 42 px on the right of the buttons),
  // a pill of 52 px fits on the left.
  await page.setViewportSize({ width: 560, height: 720 });
  await page.goto("/player.html");
  await page.evaluate(() => { (document.querySelector("#stage") as HTMLElement).style.left = "140px"; });
  const video = (await page.locator("#stage").boundingBox())!;
  const host = page.locator("#scrollplus-chip-host");
  await page.evaluate((metrics) => (window as any).__scrollplus.show({ id: "pill1", metrics }), low);
  await expect(page.locator("#advances")).toHaveText("1");
  await expect.poll(async () => (await host.boundingBox())?.width ?? 0).toBeCloseTo(52, 0);
  const pill = (await host.boundingBox())!;
  expect(pill.x + pill.width).toBeCloseTo(video.x - 16, 0);
  // Undo is still there, as the pill's button.
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();

  // With no room at all (a window of 420 px, the video at 20 to 320) the chip goes over the video as before: centred on its column.
  await page.setViewportSize({ width: 420, height: 720 });
  await page.evaluate(() => { (document.querySelector("#stage") as HTMLElement).style.left = "20px"; });
  await page.evaluate((metrics) => (window as any).__scrollplus.show({ id: "pill2", metrics }), { ...low, likes: 11 });
  await expect(page.locator("#advances")).toHaveText("2");
  await page.waitForTimeout(300);
  const over = (await host.boundingBox())!;
  const moved = (await page.locator("#stage").boundingBox())!;
  expect(over.x + over.width / 2).toBeCloseTo(moved.x + moved.width / 2, 0);
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
