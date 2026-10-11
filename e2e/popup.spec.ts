import { expect, test } from "@playwright/test";
import { launch, open, stored } from "./extension";

for (const language of ["en", "ko"] as const) {
test(`popup fits in ${language} at 1x and 2x, even with the optional rows`, async () => {
  const { context, id } = await launch(language);
  try {
    for (const scale of [1, 2]) {
      const page = await open(context, id, "popup.html", scale);
      const box = await page.evaluate(() => {
        const popup = document.querySelector(".popup");
        const scrolling = document.scrollingElement;
        if (!(popup instanceof HTMLElement) || !(scrolling instanceof HTMLElement)) return null;
        const plain = popup.getBoundingClientRect().height;
        const body = popup.querySelector(".body");
        const extra = document.createElement("button");
        extra.className = "action";
        extra.textContent = chrome.i18n.getMessage("keepCreator");
        body?.append(extra);
        const note = document.createElement("p");
        note.className = "note";
        note.textContent = chrome.i18n.getMessage("signedOut");
        body?.append(note);
        return {
          plain,
          full: popup.getBoundingClientRect().height,
          fits: scrolling.scrollHeight <= scrolling.clientHeight + 1,
          star: document.querySelector("a.star")?.getAttribute("href"),
          text: document.body.innerText,
        };
      });
      expect(box).not.toBeNull();
      expect(box?.plain).toBeLessThanOrEqual(480);
      expect(box?.full).toBeLessThanOrEqual(480);
      expect(box?.fits).toBe(true);
      expect(box?.star).toBe("https://github.com/jeongjin0/scrollplus");
      expect(box?.text).toMatch(/ScrollPlus/);
      await page.close();
    }
  } finally {
    await context.close();
  }
});
}

test("a fresh install already skips under 5K likes, and the popup changes the rule", async () => {
  const { context, id } = await launch();
  try {
    const page = await open(context, id, "popup.html");
    await expect(page.getByRole("radio", { name: /Balanced|기본/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: /Balanced|기본/ })).toContainText(/5K|5천/);
    await expect(page.getByRole("radio", { name: /Strict|엄격/ })).toContainText(/20K|2만/);
    expect((await stored(page)).rule.likes).toEqual({ on: true, min: 5000 });

    await page.getByRole("radio", { name: /Strict|엄격/ }).click();
    await expect.poll(async () => (await stored(page)).rule.likes.min).toBe(20000);

    await page.getByRole("switch", { name: "TikTok" }).click();
    await expect.poll(async () => (await stored(page)).platforms.tiktok).toBe(false);

    // Ads stay unless the user asks otherwise, and the switch is right there in the popup.
    expect((await stored(page)).skipAds).toBe(false);
    const ads = page.getByRole("switch", { name: /Skip ads|광고 건너뛰기/ });
    await expect(ads).toHaveAttribute("aria-checked", "false");
    await ads.click();
    await expect(ads).toHaveAttribute("aria-checked", "true");
    await expect.poll(async () => (await stored(page)).skipAds).toBe(true);

    await page.getByRole("button", { name: /ScrollPlus is on|ScrollPlus 켜짐/ }).click();
    await expect.poll(async () => (await stored(page)).enabled).toBe(false);
  } finally {
    await context.close();
  }
});

test("Escape cancels a number edit and invalid input leaves the previous value", async () => {
  const { context, id } = await launch("en");
  try {
    const page = await open(context, id, "options.html");
    const likes = page.getByRole("textbox", { name: "Minimum Likes", exact: true });
    await likes.click();
    await likes.fill("1234");
    await likes.press("Escape");
    await expect(likes).toHaveValue("5K");
    expect((await stored(page)).rule.likes.min).toBe(5000);
    await likes.click();
    await likes.fill("abc");
    await likes.press("Enter");
    await expect(likes).toHaveAttribute("aria-invalid", "true");
    expect((await stored(page)).rule.likes.min).toBe(5000);
    await likes.fill("7k");
    await likes.press("Enter");
    await expect.poll(async () => (await stored(page)).rule.likes.min).toBe(7000);
    await expect(likes).not.toHaveAttribute("aria-invalid", "true");
  } finally {
    await context.close();
  }
});

test("settings accept typed numbers and mark the popup as custom", async () => {
  const { context, id } = await launch();
  try {
    const options = await open(context, id, "options.html");
    await expect(options.locator("body")).toContainText(/Rules|기준/);
    await expect(options.locator("body")).toContainText(/Nothing is collected or sent|수집하거나 전송하지 않습니다/);
    await expect(options.locator("a.star")).toHaveAttribute("href", "https://github.com/jeongjin0/scrollplus");

    const likes = options.getByRole("textbox", { name: /Minimum Likes|좋아요 최소 개수/ });
    await likes.click();
    await likes.fill("2만");
    await likes.press("Enter");
    await expect.poll(async () => (await stored(options)).rule.likes.min).toBe(20000);
    await expect(options.getByRole("radio", { name: /Strict|엄격/ })).toHaveAttribute("aria-checked", "true");

    await likes.click();
    await likes.fill("700");
    await likes.press("Enter");
    await expect.poll(async () => (await stored(options)).rule.likes.min).toBe(700);
    await expect(options.getByRole("radio", { checked: true })).toHaveCount(0);

    await options.getByRole("switch", { name: /Comments|댓글/ }).click();
    await expect.poll(async () => (await stored(options)).rule.comments.on).toBe(true);

    const optionsAds = options.getByRole("switch", { name: /Skip ads|광고 건너뛰기/ });
    await expect(optionsAds).toHaveAttribute("aria-checked", "false");
    await optionsAds.click();
    await expect.poll(async () => (await stored(options)).skipAds).toBe(true);
    const popupWithAds = await open(context, id, "popup.html");
    await expect(popupWithAds.getByRole("switch", { name: /Skip ads|광고 건너뛰기/ })).toHaveAttribute("aria-checked", "true");
    await popupWithAds.close();

    const popup = await open(context, id, "popup.html");
    await expect(popup.locator(".badge")).toHaveText(/Custom|직접/);

    await options.getByRole("button", { name: /Reset to defaults|기본값으로 되돌리기/ }).click();
    await expect.poll(async () => (await stored(options)).rule).toEqual({
      likes: { on: true, min: 5000 },
      comments: { on: false, min: 100 },
      views: { on: false, min: 100000 },
    });
    // Reset puts ads back to being kept.
    await expect.poll(async () => (await stored(options)).skipAds).toBe(false);
  } finally {
    await context.close();
  }
});
