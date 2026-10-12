import { expect, test } from "@playwright/test";
import { launch, open, stored } from "./extension";

test("concurrent Undo choices remain in memory only and Reset keeps saved creators", async () => {
  const { context, id } = await launch();
  try {
    const app = await open(context, id, "options.html");
    const before = await app.evaluate(async () => {
      const replies = await Promise.all(Array.from({ length: 12 }, (_, i) => chrome.runtime.sendMessage({ type: "scrollplus:session:keep", platform: i % 2 ? "youtube" : "tiktok", id: "video-" + i })));
      return { ok: replies.every(reply => reply.ok), memory: (await chrome.storage.session.get("undoKeeps")).undoKeeps, local: await chrome.storage.local.get(null) };
    });
    expect(before.ok).toBe(true);
    expect(before.memory.items.youtube).toHaveLength(6);
    expect(before.memory.items.tiktok).toHaveLength(6);
    expect(before.memory.revision).toBe(12);
    expect(Object.keys(before.local).sort()).toEqual(["dailySkips", "schema", "settings", "totalSkips"]);
    await app.evaluate(async () => {
      const data = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...data.settings, allowlist: [{ platform: "youtube", id: "saved-creator" }], rule: { ...data.settings.rule, likes: { on: true, min: 20000 } } } });
    });
    await app.getByRole("button", { name: /Reset to defaults|기본값으로 되돌리기/ }).click();
    await expect.poll(async () => (await stored(app)).rule.likes.min).toBe(500);
    expect((await stored(app)).allowlist).toEqual([{ platform: "youtube", id: "saved-creator" }]);
    const after = await app.evaluate(async () => ({ memory: (await chrome.storage.session.get("undoKeeps")).undoKeeps, local: await chrome.storage.local.get(null) }));
    expect(after.memory.items).toEqual({});
    expect(after.memory.revision).toBe(13);
    expect(after.local.dailySkips).toEqual(before.local.dailySkips);
    expect(Object.keys(after.local).sort()).toEqual(["dailySkips", "schema", "settings", "totalSkips"]);
    // Reset is for settings. What the skips have added up to stays.
    expect(after.local.totalSkips).toEqual(before.local.totalSkips);
  } finally { await context.close(); }
});

test("Undo choices clear on a real browser restart while local settings and count survive", async () => {
  const original = await launch();
  let reopened: Awaited<ReturnType<typeof launch>> | undefined;
  try {
    const app = await open(original.context, original.id, "options.html");
    const saved = await app.evaluate(async () => {
      await chrome.runtime.sendMessage({ type: "scrollplus:session:keep", platform: "youtube", id: "temporary-video" });
      const data = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...data.settings, allowlist: [{ platform: "youtube", id: "saved-creator" }] } });
      await chrome.runtime.sendMessage({ type: "scrollplus:skipped" });
      return chrome.storage.local.get(null);
    });
    await original.context.close();
    reopened = await launch(undefined, original.profile);
    const next = await open(reopened.context, reopened.id, "options.html");
    const result = await next.evaluate(async () => ({ memory: await chrome.storage.session.get(null), local: await chrome.storage.local.get(null) }));
    expect(result.memory).toEqual({});
    expect(result.local).toEqual(saved);
  } finally { await original.context.close().catch(() => {}); await reopened?.context.close(); }
});
