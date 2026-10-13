import { expect, test } from '@playwright/test';
import { collectStallDiagnostics, FeedProgress, readDuringNavigation } from '../scripts/soak-helpers.mjs';

test('soak survives a real page reload but does not swallow other errors or a closed page', async ({ page }) => {
  await page.goto('/player.html');
  let navigations = 0;
  // The helper can return while the replacement document is still loading.
  // Observe that load before closing it, so Chromium does not race reload and close.
  const reloaded = page.waitForEvent('domcontentloaded');
  const [value] = await Promise.all([readDuringNavigation(page, () => page.evaluate(() => new Promise(resolve => {
    setTimeout(() => location.reload(), 50);
    setTimeout(() => resolve('stale document'), 500);
  })), () => navigations++), reloaded]);
  expect(value).toBeNull();
  expect(navigations).toBe(1);
  expect(await readDuringNavigation(page, () => page.title(), () => navigations++)).toBeTruthy();
  await expect(readDuringNavigation(page, () => { throw new Error('Unexpected QA failure'); }, () => navigations++)).rejects.toThrow('Unexpected QA failure');
  await page.close();
  await expect(readDuringNavigation(page, () => page.evaluate(() => 1), () => navigations++)).rejects.toThrow();
  expect(navigations).toBe(1);
});

test('soak counts actual movement and allows bounded recovery after two failed attempts', () => {
  const progress = new FeedProgress(0);
  progress.observe('first', 0);
  expect(progress.canAttempt(29999)).toBe(false);
  expect(progress.canAttempt(30000)).toBe(true);
  progress.attempted(30000);
  expect(progress.observe('first', 32500).failedAttempt).toBe(true);
  expect(progress.failures).toBe(1);
  progress.attempted(60000);
  expect(progress.observe('first', 62500).failedAttempt).toBe(true);
  expect(progress.failures).toBe(2);
  progress.recover(62500);
  expect(progress.recoveries).toBe(1);
  progress.observe('first', 63000);
  progress.attempted(93000);
  expect(progress.observe('second', 94000).manualMoved).toBe(true);
  expect(progress.failures).toBe(0);
  expect(() => progress.recover(100000)).toThrow('Feed did not recover');
  expect(progress.recoveries).toBe(1);
  for (let i = 1; i < 12; i++) progress.recover(62500 + i * 600000);
  expect(() => progress.recover(62500 + 12 * 600000)).toThrow('Feed did not recover');
});

test('stall diagnostics are bounded, never throw and describe a page with no feed', async ({ page }) => {
  await page.goto('/player.html');
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  const diagnostics = await collectStallDiagnostics(page, client);
  expect(diagnostics.evaluateRoundTripMs).toBeGreaterThanOrEqual(0);
  expect(diagnostics.page).toMatchObject({ path: '/player.html', visibility: 'visible', reelRenderers: 0, downControls: 0, downDisabled: null, videoAdvancedSeconds: null });
  expect(diagnostics.metrics.nodes).toBeGreaterThan(0);
  expect(diagnostics.network).toEqual([]);
  expect(diagnostics.shortsComponent).toBeNull();
  expect(diagnostics.ownControl).toEqual({ clicked: false, reason: 'no control' });
  await page.close();
  const closed = await collectStallDiagnostics(page, null);
  expect(closed.evaluateRoundTripMsError).toBeTruthy();
});
