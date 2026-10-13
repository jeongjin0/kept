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
          github: document.querySelector("a.github")?.getAttribute("href"),
          text: document.body.innerText,
        };
      });
      expect(box).not.toBeNull();
      expect(box?.plain).toBeLessThanOrEqual(480);
      expect(box?.full).toBeLessThanOrEqual(480);
      expect(box?.fits).toBe(true);
      expect(box?.github).toBe("https://github.com/jeongjin0/scrollplus");
      expect(box?.text).toMatch(/ScrollPlus/);
      await page.close();
    }
  } finally {
    await context.close();
  }
});
}

test("a fresh install already skips under 500 likes and skips ads, and the popup changes both", async () => {
  const { context, id } = await launch();
  try {
    const page = await open(context, id, "popup.html");
    await expect(page.getByRole("radio", { name: /Balanced|기본/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: /Lenient|느슨/ })).toContainText(/100/);
    await expect(page.getByRole("radio", { name: /Balanced|기본/ })).toContainText(/500/);
    await expect(page.getByRole("radio", { name: /Strict|엄격/ })).toContainText(/1K|1천/);
    expect((await stored(page)).rule.likes).toEqual({ on: true, min: 500 });

    await page.getByRole("radio", { name: /Strict|엄격/ }).click();
    await expect.poll(async () => (await stored(page)).rule.likes.min).toBe(1000);
    await page.getByRole("radio", { name: /Lenient|느슨/ }).click();
    await expect.poll(async () => (await stored(page)).rule.likes.min).toBe(100);

    await page.getByRole("switch", { name: "TikTok" }).click();
    await expect.poll(async () => (await stored(page)).platforms.tiktok).toBe(false);

    // Ads are skipped out of the box, and the switch to turn that off is right there in the popup.
    expect((await stored(page)).skipAds).toBe(true);
    const ads = page.getByRole("switch", { name: /Skip ads|광고 건너뛰기/ });
    await expect(ads).toHaveAttribute("aria-checked", "true");
    await ads.click();
    await expect(ads).toHaveAttribute("aria-checked", "false");
    await expect.poll(async () => (await stored(page)).skipAds).toBe(false);

    await page.getByRole("button", { name: /ScrollPlus is on|ScrollPlus 켜짐/ }).click();
    await expect.poll(async () => (await stored(page)).enabled).toBe(false);
  } finally {
    await context.close();
  }
});

test("Settings opens in a tab of its own, not in the small dialog of chrome://extensions", async () => {
  const { context, id } = await launch("en");
  try {
    const popup = await open(context, id, "popup.html");
    expect(await popup.evaluate(() => chrome.runtime.getManifest().options_ui)).toMatchObject({ open_in_tab: true, page: "options.html" });
    const [tab] = await Promise.all([context.waitForEvent("page"), popup.getByRole("button", { name: /Settings/ }).click()]);
    await tab.waitForLoadState();
    expect(tab.url()).toBe("chrome-extension://" + id + "/options.html");
    await expect(tab).toHaveTitle("ScrollPlus · Settings");
    await expect(tab.locator("a.github")).toHaveAttribute("href", "https://github.com/jeongjin0/scrollplus");
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
    await expect(likes).toHaveValue("500");
    expect((await stored(page)).rule.likes.min).toBe(500);
    await likes.click();
    await likes.fill("abc");
    await likes.press("Enter");
    await expect(likes).toHaveAttribute("aria-invalid", "true");
    expect((await stored(page)).rule.likes.min).toBe(500);
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
    await expect(options.locator("a.github")).toHaveAttribute("href", "https://github.com/jeongjin0/scrollplus");

    const likes = options.getByRole("textbox", { name: /Minimum Likes|좋아요 최소 개수/ });
    await likes.click();
    await likes.fill("1천");
    await likes.press("Enter");
    await expect.poll(async () => (await stored(options)).rule.likes.min).toBe(1000);
    await expect(options.getByRole("radio", { name: /Strict|엄격/ })).toHaveAttribute("aria-checked", "true");

    await likes.click();
    await likes.fill("700");
    await likes.press("Enter");
    await expect.poll(async () => (await stored(options)).rule.likes.min).toBe(700);
    // 700 is no preset, so none of the three is checked. (The chip position below has a checked choice of its own.)
    await expect(options.getByRole("radiogroup", { name: /Rules|기준/ }).getByRole("radio", { checked: true })).toHaveCount(0);

    await options.getByRole("switch", { name: /Comments|댓글/ }).click();
    await expect.poll(async () => (await stored(options)).rule.comments.on).toBe(true);

    const optionsAds = options.getByRole("switch", { name: /Skip ads|광고 건너뛰기/ });
    await expect(optionsAds).toHaveAttribute("aria-checked", "true");
    await optionsAds.click();
    await expect.poll(async () => (await stored(options)).skipAds).toBe(false);
    const keepFollowed = options.getByRole("switch", { name: /Keep accounts I follow|구독·팔로우 중인 계정은 유지/ });
    await expect(keepFollowed).toHaveAttribute("aria-checked", "true");
    await keepFollowed.click();
    await expect.poll(async () => (await stored(options)).keepFollowed).toBe(false);
    const popupWithoutAds = await open(context, id, "popup.html");
    await expect(popupWithoutAds.getByRole("switch", { name: /Skip ads|광고 건너뛰기/ })).toHaveAttribute("aria-checked", "false");
    await popupWithoutAds.close();

    const popup = await open(context, id, "popup.html");
    await expect(popup.locator(".badge")).toHaveText(/Custom|직접/);

    await options.getByRole("button", { name: /Reset to defaults|기본값으로 되돌리기/ }).click();
    await expect.poll(async () => (await stored(options)).rule).toEqual({
      likes: { on: true, min: 500 },
      comments: { on: false, min: 100 },
      views: { on: false, min: 100000 },
    });
    // Reset puts ads back to being skipped, which is the default.
    await expect.poll(async () => (await stored(options)).skipAds).toBe(true);
    await expect.poll(async () => (await stored(options)).keepFollowed).toBe(true);
  } finally {
    await context.close();
  }
});

// Seeds the counts the way the background worker keeps them: 1,482 skips whose videos were on screen for 622,440 ms in all, which
// saves 1,482 x 3 s less that, 3,823,560 ms.
const SEEDED = { since: "2026-10-05", count: 1482, onScreenMs: 622440 };

test("the popup and Settings show the time value without explanatory labels", async () => {
  const { context, id, worker } = await launch("en");
  try {
    await worker.evaluate(async (totals) => {
      const day = new Date();
      const today = [day.getFullYear(), String(day.getMonth() + 1).padStart(2, "0"), String(day.getDate()).padStart(2, "0")].join("-");
      await chrome.storage.local.set({ dailySkips: { day: today, count: 18 }, totalSkips: totals });
    }, SEEDED);
    const popup = await open(context, id, "popup.html");
    await expect(popup.locator(".hero")).toContainText("18");
    await expect(popup.locator(".hero-saved")).toHaveText("1h 3m");
    await expect(popup.locator(".hero-saved")).toHaveAttribute("aria-label", "Estimated time saved: 1h 3m");
    await expect(popup.locator(".hero-saved")).not.toHaveAttribute("title");
    const options = await open(context, id, "options.html");
    const stats = options.locator(".stats");
    await expect(stats).toContainText("1,482");
    await expect(stats.locator(".stat.saved")).toHaveText("1h 3m");
    await expect(stats.locator(".stat.saved")).toHaveAttribute("aria-label", "Estimated time saved: 1h 3m");
    await expect(options.locator(".stats-note")).not.toContainText(/estimate/i);
    await expect(options.locator(".stats-note")).toContainText("Oct 5");
    // A skip counted while the page is open moves the figures at once.
    await options.evaluate(() => chrome.runtime.sendMessage({ type: "scrollplus:skipped", onScreenMs: 500 }));
    await expect(stats).toContainText("1,483");
    await expect(popup.locator(".hero")).toContainText("19");
  } finally {
    await context.close();
  }
});

test("the time saved reads in Korean too", async () => {
  const { context, id, worker } = await launch("ko");
  try {
    await worker.evaluate(async (totals) => { await chrome.storage.local.set({ totalSkips: totals }); }, SEEDED);
    const popup = await open(context, id, "popup.html");
    await expect(popup.locator(".hero-saved")).toHaveText("1시간 3분");
    await expect(popup.locator(".hero-saved")).toHaveAttribute("aria-label", "예상 절약 시간 1시간 3분");
    await expect(popup.locator(".hero-saved")).not.toHaveAttribute("title");
  } finally {
    await context.close();
  }
});

test("the skip chip sits beside the video by default, and Settings moves it", async () => {
  const { context, id } = await launch("en");
  try {
    const options = await open(context, id, "options.html");
    const group = options.getByRole("radiogroup", { name: "Skip chip position" });
    await expect(group.getByRole("radio", { name: "Beside" })).toHaveAttribute("aria-checked", "true");
    expect((await stored(options)).chipPosition).toBe("side");
    await group.getByRole("radio", { name: "Lower" }).click();
    await expect.poll(async () => (await stored(options)).chipPosition).toBe("lower");
    await expect(group.getByRole("radio", { name: "Lower" })).toHaveAttribute("aria-checked", "true");
    await group.getByRole("radio", { name: "Middle" }).click();
    await expect.poll(async () => (await stored(options)).chipPosition).toBe("middle");
    // With the chip off there is nothing to place.
    await options.getByRole("switch", { name: "Show the skip chip" }).click();
    await expect.poll(async () => (await stored(options)).showSkipChip).toBe(false);
    await expect(group.getByRole("radio", { name: "Beside" })).toBeDisabled();
    await options.getByRole("button", { name: /Reset to defaults/ }).click();
    await expect.poll(async () => (await stored(options)).chipPosition).toBe("side");
    await expect.poll(async () => (await stored(options)).showSkipChip).toBe(true);
  } finally {
    await context.close();
  }
});

test("an update moves 0.4.4 settings to the new scale once, and a restart leaves the person's own choices alone", async () => {
  const first = await launch("en");
  let second: Awaited<ReturnType<typeof launch>> | undefined;
  let third: Awaited<ReturnType<typeof launch>> | undefined;
  try {
    // What a 0.4.4 profile holds: Lenient was 1,000 likes, Skip ads was off, and there is no schema marker.
    await first.worker.evaluate(async () => {
      const { settings } = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...settings, skipAds: false, chipPosition: "top", rule: { likes: { on: true, min: 1000 }, comments: { on: false, min: 100 }, views: { on: false, min: 100000 } }, allowlist: [{ platform: "youtube", id: "kept-creator" }] } });
      await chrome.storage.local.remove(["schema", "totalSkips"]);
    });
    await first.context.close();
    second = await launch("en", first.profile);
    // Lenient is Lenient still, which is 100 likes now, and Skip ads is on.
    await expect.poll(() => second!.worker.evaluate(async () => (await chrome.storage.local.get("settings")).settings.rule.likes.min)).toBe(100);
    const moved = await second.worker.evaluate(async () => chrome.storage.local.get(null));
    expect(moved.settings.skipAds).toBe(true);
    expect(moved.settings.allowlist).toEqual([{ platform: "youtube", id: "kept-creator" }]);
    // The chip was at the top, which covered the video, and is beside it now.
    expect(moved.settings.chipPosition).toBe("side");
    expect(moved.schema).toBe(3);
    expect(moved.totalSkips).toMatchObject({ count: 0, onScreenMs: 0 });
    const popup = await open(second.context, second.id, "popup.html");
    await expect(popup.getByRole("radio", { name: /Lenient/ })).toHaveAttribute("aria-checked", "true");
    // The person picks Strict, which is 1,000 likes now and was Lenient's number on the old scale, and turns Skip ads off.
    await popup.getByRole("radio", { name: /Strict/ }).click();
    await popup.getByRole("switch", { name: /Skip ads/ }).click();
    await expect.poll(() => second!.worker.evaluate(async () => (await chrome.storage.local.get("settings")).settings.skipAds)).toBe(false);
    await second.context.close();
    third = await launch("en", first.profile);
    const kept = await third.worker.evaluate(async () => (await chrome.storage.local.get("settings")).settings);
    expect(kept.rule.likes.min).toBe(1000);
    expect(kept.skipAds).toBe(false);
  } finally {
    await first.context.close().catch(() => {});
    await second?.context.close().catch(() => {});
    await third?.context.close().catch(() => {});
  }
});
