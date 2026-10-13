import { expect, test, type Page } from "@playwright/test";

const skipped = { mode: "skipped", metric: "likes", value: 10 } as const;
const run = { ...skipped, run: [{ metric: "likes", value: 10 }, { metric: "likes", value: 20 }, { metric: "ad", value: 0 }] };

async function open(page: Page, model: unknown = skipped) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/player.html");
  await page.evaluate((model) => {
    const video = document.querySelector("video")!;
    Object.assign(video.style, { left: "565.875px", top: "64px", width: "452px", height: "804px" });
    const guide = document.createElement("nav");
    guide.id = "guide";
    Object.assign(guide.style, { position: "fixed", inset: "56px auto 0 0", width: "240px" });
    document.body.append(guide);
    (window as any).__scrollplus.renderChip(model);
  }, model);
  await expect(page.locator("#scrollplus-chip-host")).toBeVisible();
  // Let the initial settle finish, so it cannot mask a missing live layout update.
  await page.waitForTimeout(350);
}

async function move(page: Page, left: number) {
  await page.evaluate((left) => { document.querySelector("video")!.style.left = left + "px"; }, left);
}

test("comments opening and closing repositions the same notice and preserves Undo focus", async ({ page }) => {
  await open(page, run);
  const host = page.locator("#scrollplus-chip-host");
  const undo = page.getByRole("button", { name: "Undo" });
  await undo.focus();
  await page.evaluate(() => { (window as any).__undoNode = document.querySelector("#scrollplus-chip-host")!.shadowRoot!.querySelector("button"); });
  await move(page, 301.875);
  await expect.poll(async () => (await host.boundingBox())?.width).toBe(44);
  let box = (await host.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(240);
  expect(box.x + box.width).toBeCloseTo(293.875, 0);
  expect(box.y + box.height / 2).toBeCloseTo(450, 0);
  await expect(host.locator(".count")).toHaveText("3");
  await expect(host.locator(".dot")).toBeHidden();
  await expect(host.locator(".rows")).toBeHidden();
  await expect(undo).toBeFocused();
  await move(page, 565.875);
  await expect.poll(async () => (await host.boundingBox())?.width).toBe(228);
  box = (await host.boundingBox())!;
  expect(box.x + box.width).toBeCloseTo(549.875, 0);
  await expect(host.locator(".r")).toHaveCount(3);
  await expect(host.locator(".head")).toBeHidden();
  expect(await page.evaluate(() => (window as any).__undoNode === document.querySelector("#scrollplus-chip-host")!.shadowRoot!.querySelector("button"))).toBe(true);
  await expect(undo).toBeFocused();
});

test("a single skip shows 1 in the compact notice and Undo still works", async ({ page }) => {
  await open(page);
  await move(page, 301.875);
  const host = page.locator("#scrollplus-chip-host");
  await expect(host.locator(".count")).toHaveText("1");
  await expect(host.locator(".count")).toBeVisible();
  await expect(host.locator(".label")).toBeHidden();
  // Exercise a real engine skip rather than only the directly rendered layout model.
  await page.evaluate(() => window.__scrollplus.show({ id: "compact-undo", metrics: { views: 10000, likes: 10, comments: 0, shares: 0, saves: null } }));
  await expect(page.locator("#advances")).toHaveText("1");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("#retreats")).toHaveText("1");
});

test("a blocked left gutter never sends the notice to a free right gutter", async ({ page }) => {
  await open(page);
  await page.evaluate(() => { document.querySelector<HTMLElement>("#guide")!.style.width = "550px"; });
  await expect(page.locator("#scrollplus-chip-host")).toBeHidden();
  // No new model or resize: removing the obstacle alone must restore the left notice.
  await page.locator("#guide").evaluate((node: HTMLElement) => { node.hidden = true; });
  await expect(page.locator("#scrollplus-chip-host")).toBeVisible();
  const box = (await page.locator("#scrollplus-chip-host").boundingBox())!;
  expect(box.x + box.width).toBeLessThan(565.875);
});

test("compact pause keeps both safety actions accessible on the left", async ({ page }) => {
  await open(page, { mode: "paused", canLower: true });
  await move(page, 301.875);
  const host = page.locator("#scrollplus-chip-host");
  await expect.poll(async () => (await host.boundingBox())?.width).toBe(44);
  await expect(page.getByRole("button", { name: "Keep going" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lower the bar" })).toBeVisible();
  for (const button of await host.getByRole("button").all()) {
    const box = (await button.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(40);
    expect(box.height).toBeGreaterThanOrEqual(40);
    await button.focus();
    await expect(button).toBeFocused();
  }
});

test("a replacement player is followed without changing the notice model", async ({ page }) => {
  await open(page);
  await page.locator("video").evaluate((node: HTMLVideoElement) => {
    const next = node.cloneNode() as HTMLVideoElement;
    next.style.left = "301.875px";
    node.replaceWith(next);
  });
  const host = page.locator("#scrollplus-chip-host");
  await expect.poll(async () => (await host.boundingBox())?.width).toBe(44);
  expect((await host.boundingBox())!.x + 44).toBeCloseTo(293.875, 0);
});

test("a kept photo preserves the preceding video's left notice and Undo", async ({ page }) => {
  await open(page);
  await page.locator("video").evaluate((node: HTMLVideoElement) => {
    const image = document.createElement("img");
    image.style.cssText = node.style.cssText;
    image.style.left = "301.875px";
    image.alt = "Kept photo";
    node.replaceWith(image);
  });
  const host = page.locator("#scrollplus-chip-host");
  await expect.poll(async () => (await host.boundingBox())?.width).toBe(44);
  await expect(host).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  expect((await host.boundingBox())!.x + 44).toBeCloseTo(293.875, 0);
});

test("a reparented player keeps following its new container's layout", async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const wrapper = document.createElement("div");
    wrapper.id = "new-player";
    Object.assign(wrapper.style, { position: "absolute", inset: "0", transform: "translateX(-264px)" });
    document.body.append(wrapper);
    wrapper.append(document.querySelector("video")!);
  });
  const host = page.locator("#scrollplus-chip-host");
  await expect.poll(async () => (await host.boundingBox())?.width).toBe(44);
  await page.locator("#new-player").evaluate((node: HTMLElement) => { node.style.transform = "none"; });
  await expect.poll(async () => (await host.boundingBox())?.width).toBe(228);
  expect((await host.boundingBox())!.x + 228).toBeCloseTo(549.875, 0);
});

test("animated column changes keep the notice left throughout the motion", async ({ page }) => {
  await open(page);
  await page.locator("video").evaluate((node: HTMLVideoElement) => { node.style.transition = "left 400ms linear"; });
  await move(page, 301.875);
  const observations = await page.evaluate(async () => {
    const values: { right: number; videoLeft: number; visible: boolean }[] = [];
    for (let index = 0; index < 24; index++) {
      await new Promise(requestAnimationFrame);
      const host = document.querySelector<HTMLElement>("#scrollplus-chip-host")!;
      values.push({ right: host.getBoundingClientRect().right, videoLeft: document.querySelector("video")!.getBoundingClientRect().left, visible: getComputedStyle(host).visibility === "visible" });
    }
    return values;
  });
  // Allow one frame of website motion before the matching placement callback runs.
  expect(observations.filter(value => value.visible).every(value => value.right <= value.videoLeft + 1)).toBe(true);
  await expect.poll(async () => (await page.locator("#scrollplus-chip-host").boundingBox())?.width).toBe(44);
});

test("placement has no idle polling and stops after the notice is dismissed", async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const original = document.elementsFromPoint.bind(document);
    (window as any).__hitTests = 0;
    document.elementsFromPoint = (...args) => { (window as any).__hitTests++; return original(...args); };
  });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__hitTests)).toBe(0);
  await page.evaluate(() => (window as any).__scrollplus.renderChip(null));
  await move(page, 301.875);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).__hitTests)).toBe(0);
  await expect(page.locator("#scrollplus-chip-host").locator(".chip")).toHaveCount(0);
});
