import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const extension = path.resolve('.output/chrome-mv3');
const output = path.resolve(process.argv[2] || `qa/tmp/live-${Date.now()}`);
const duration = Number(process.argv[3] || 60000);
fs.mkdirSync(output, { recursive: true });
const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(output, 'profile-')), {
  headless: false, viewport: { width: 1280, height: 800 },
  recordVideo: { dir: path.join(output, 'video'), size: { width: 1280, height: 800 } },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-first-run'],
});
const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
await expect.poll(() => worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings?.enabled)).toBe(true);
const settings = await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
expect(settings.rule).toEqual({ likes: { on: true, min: 500 }, comments: { on: false, min: 100 }, views: { on: false, min: 100000 } });
const report = { at: new Date().toISOString(), version: JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'))).version, settings, runs: [] };
try {
  for (const [platform, url] of [['youtube', 'https://www.youtube.com/shorts'], ['tiktok', 'https://www.tiktok.com/foryou']]) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push({ message: error.message.slice(0, 200), stack: error.stack?.slice(0, 1400) }));
    await page.addInitScript(() => {
      window.__scrollplusQA = [];
      window.__scrollplusQACache = {};
      window.addEventListener('message', event => {
        const data = event.data;
        if (event.source !== window || data?.source !== 'scrollplus') return;
        if (data.type === 'cache' && Array.isArray(data.items)) {
          for (const item of data.items) window.__scrollplusQACache[item.id] = item.metrics;
        }
        if (data.type !== 'item' || !data.item) return;
        window.__scrollplusQA.push({ id: data.item.id, metrics: data.item.metrics, at: Date.now() });
        if (window.__scrollplusQA.length > 500) window.__scrollplusQA.shift();
      });
    });
    const run = { platform, samples: [], moves: [], errors, screenshots: [] };
    report.runs.push(run);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      for (const label of ['Reject all', '모두 거부', 'Decline optional cookies']) {
        const button = page.getByRole('button', { name: label, exact: true });
        if (await button.count()) await button.first().click({ timeout: 1500 }).catch(() => {});
      }
      const start = Date.now();
      let current = null, changedAt = start, lastManual = null, previousChip = '', lastPausedAt = 0;
      const records = new Map();
      while (Date.now() - start < duration) {
        const snap = await page.evaluate(previous => {
          let id = location.pathname.match(/\/shorts\/([^/?#]+)/)?.[1] || location.pathname.match(/\/video\/(\d+)/)?.[1] || null;
          if (!id && location.hostname.includes('tiktok')) {
            let ratio = 0, video = null;
            for (const node of document.querySelectorAll('video')) {
              const box = node.getBoundingClientRect();
              const visible = (Math.min(box.bottom, innerHeight) - Math.max(box.top, 0)) / box.height;
              if (box.height >= 40 && visible > ratio) { ratio = visible; video = node; }
            }
            if (video && ratio >= 0.6) id = video.closest('[id^="xgwrapper-"]')?.id.match(/^xgwrapper-\d+-(\d+)$/)?.[1] || null;
          }
          const events = window.__scrollplusQA.splice(0);
          const host = document.querySelector('#scrollplus-chip-host');
          const chip = host?.shadowRoot?.querySelector('.chip');
          return { id, events, activeMetrics: window.__scrollplusQACache[id], previousMetrics: window.__scrollplusQACache[previous], chip: chip && !chip.classList.contains('leaving') ? chip.textContent.replace(/\s+/g, ' ').trim() : '', paused: chip?.dataset.mode === 'paused' || chip?.classList.contains('stack') || false };
        }, current);
        for (const [id, metrics] of [[snap.id, snap.activeMetrics], [current, snap.previousMetrics]]) {
          if (!id || !metrics) continue;
          snap.events.push({ id, metrics, at: Date.now() });
        }
        for (const event of snap.events) {
          if (!records.has(event.id)) { const row = { id: event.id, firstAt: event.at - start, metrics: null }; records.set(event.id, row); run.samples.push(row); }
          const row = records.get(event.id);
          if (event.metrics) { row.metrics = event.metrics; row.metricsAt ??= event.at - start; }
        }
        if (snap.id && snap.id !== current) {
          if (current) run.moves.push({ from: current, to: snap.id, automatic: lastManual !== current, chip: snap.chip, at: Date.now() - start });
          current = snap.id; changedAt = Date.now(); lastManual = null;
        }
        if (snap.chip && snap.chip !== previousChip && run.screenshots.length < 6) {
          const file = `${platform}-chip-${run.screenshots.length}.png`;
          await page.screenshot({ path: path.join(output, file) });
          run.screenshots.push({ file, chip: snap.chip });
        }
        previousChip = snap.chip;
        if (platform === 'tiktok') {
          const close = page.getByRole('button', { name: /^(Close|닫기)$/ });
          if (await close.count()) await close.first().click({ timeout: 1000 }).catch(() => {});
        }
        if (snap.paused && Date.now() - lastPausedAt > 3000) {
          const button = page.locator('#scrollplus-chip-host').getByRole('button', { name: /Keep going|이어서 보기/ });
          if (await button.count()) { await button.click(); lastPausedAt = Date.now(); }
        } else if (!snap.chip && current && Date.now() - changedAt > 6500) {
          lastManual = current;
          await page.keyboard.press('ArrowDown');
          changedAt = Date.now();
        }
        await page.waitForTimeout(150);
      }
      const last = `${platform}-end.png`;
      await page.screenshot({ path: path.join(output, last) });
      run.finalScreenshot = last;
      const video = page.video();
      await page.close();
      if (video) run.video = path.relative(output, await video.path());
    } catch (error) { run.error = String(error); await page.close(); }
    run.summary = { samples: run.samples.length, knownLikes: run.samples.filter(row => typeof row.metrics?.likes === 'number').length, lowLikeSamples: run.samples.filter(row => row.metrics?.likes != null && row.metrics.likes < settings.rule.likes.min).length, automaticMoves: run.moves.filter(row => row.automatic).length, capturedChips: run.screenshots.length, errors: run.errors.length };
    console.log(JSON.stringify({ platform, ...run.summary, error: run.error }));
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  }
  const ig = await context.newPage();
  await ig.goto('https://www.instagram.com/reels/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  report.instagram = { path: new URL(ig.url()).pathname, signedInVerified: false };
  await ig.screenshot({ path: path.join(output, 'instagram-state.png') });
  await ig.close();
} finally {
  await context.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ output, summaries: report.runs.map(run => ({ platform: run.platform, ...run.summary })) }));
