// Local QA on live YouTube Shorts: where the time goes when ScrollPlus skips a Short.
// Usage:
//   node scripts/skip-latency.mjs run <extension-dir> <output-dir> [duration-ms] [settings-json]
//   node scripts/skip-latency.mjs report <output-dir> [<output-dir> ...]
// run drives a fresh signed-out Chromium profile with the built extension. After each Short the extension kept it presses the
// page's own Next control 2.2 s later. Page-side timestamps record the site's navigation events, the clicks, the extension's page
// messages and the feed requests. settings-json is merged over the stored settings, for example a stricter bar to provoke chains:
//   '{"rule":{"likes":{"on":true,"min":20000},"comments":{"on":false,"min":100},"views":{"on":false,"min":100000}}}'
// report prints, for every skip the extension made: how long it took to decide, how long the site took to move, and how long the
// skipped Short was the active one. A skip is a "chain start" when the move onto the skipped Short was a person's, and a "chain
// continuation" when the move onto it was an automatic skip. Clicks the site never acted on are listed with the queue state.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [mode, ...args] = process.argv.slice(2);
if (mode === 'run') await run(args);
else if (mode === 'report') report(args);
else throw new Error('Usage: node scripts/skip-latency.mjs run <extension-dir> <output-dir> [duration-ms] [settings-json] | report <output-dir>...');

async function run([extensionArg, outputArg, durationArg = '300000', settingsArg]) {
  if (!extensionArg || !outputArg) throw new Error('run needs <extension-dir> and <output-dir>');
  const extension = path.resolve(extensionArg);
  const output = path.resolve(outputArg);
  const duration = Number(durationArg);
  if (!Number.isFinite(duration) || duration < 1000) throw new Error('Invalid duration');
  const profile = path.join(output, 'profile');
  if (fs.existsSync(profile)) throw new Error('Use a new output directory; do not start a second run on an existing profile');
  fs.mkdirSync(output, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
  const context = await chromium.launchPersistentContext(profile, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension, '--no-first-run'],
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (settingsArg) {
    await worker.evaluate(async (patch) => {
      const { settings } = await chrome.storage.local.get('settings');
      await chrome.storage.local.set({ settings: { ...settings, ...patch } });
    }, JSON.parse(settingsArg));
  }
  const settings = await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
  console.log('version', manifest.version, 'settings', JSON.stringify(settings));
  const page = await context.newPage();
  const pageErrors = [];
  const net = [];
  page.on('pageerror', (error) => pageErrors.push(String(error.message).slice(0, 200)));
  const feedName = (url) => {
    const match = url.match(/\/youtubei\/v1\/((?:reel\/)?[a-z_]+)/);
    return match && /^(player$|reel\/)/.test(match[1]) ? match[1] : null;
  };
  page.on('request', (request) => { const name = feedName(request.url()); if (name) net.push({ at: Date.now(), type: 'req', name }); });
  page.on('response', (response) => { const name = feedName(response.url()); if (name) net.push({ at: Date.now(), type: 'resp', name, status: response.status() }); });
  await page.addInitScript(() => {
    const now = () => performance.timeOrigin + performance.now();
    window.__skipLog = [];
    const push = (type, data) => window.__skipLog.push({ at: now(), type, ...data });
    // The queue the site keeps for upcoming Shorts, read only to explain a click the site ignored.
    const queue = () => {
      try {
        const data = document.querySelector('ytd-shorts')?.__data;
        return data ? { idx: data.currentPlayerIndex, seq: data.shortsProcessedSequence?.length, down: data.isDownArrowHidden } : {};
      } catch { return {}; }
    };
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('#navigation-button-down')) push('click-next', { path: location.pathname, ...queue() });
    }, true);
    for (const name of ['yt-navigate-start', 'yt-navigate-finish']) document.addEventListener(name, () => push(name, { path: location.pathname, ...queue() }));
    // A second after a Short became the active one, is it playing with sound? Only a Short that is still the active one counts.
    document.addEventListener('yt-navigate-finish', () => {
      const arrived = location.pathname;
      setTimeout(() => {
        const video = document.querySelector('ytd-reel-video-renderer video') || document.querySelector('video');
        push('settled', { path: arrived, still: location.pathname === arrived, muted: video ? video.muted : null, paused: video ? video.paused : null, ct: video ? Math.round(video.currentTime * 100) / 100 : null });
      }, 1000);
    });
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (event.source !== window || !data || data.source !== 'scrollplus') return;
      if (data.type === 'item') push('msg-item', { id: data.item?.id, likes: data.item?.metrics?.likes ?? null });
      else if (data.type === 'advance') push('msg-advance', { key: data.key, path: location.pathname });
    });
    let lastChip = '';
    setInterval(() => {
      const chip = document.querySelector('#scrollplus-chip-host')?.shadowRoot?.querySelector('.chip');
      const text = chip && !chip.classList.contains('leaving') ? (chip.querySelector('.label')?.textContent || '') : '';
      if (text !== lastChip) { lastChip = text; push('chip', { text, path: location.pathname }); }
    }, 20);
  });
  await page.goto('https://www.youtube.com/shorts/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  for (const name of ['Reject all', '모두 거부', 'Decline optional cookies']) {
    const button = page.getByRole('button', { name, exact: true });
    if (await button.count()) await button.first().click({ timeout: 1500 }).catch(() => {});
  }
  const started = Date.now();
  const events = [];
  let lastPath = null;
  let arrivedAt = 0;
  let pressed = false;
  while (Date.now() - started < duration) {
    await page.waitForTimeout(60);
    for (const event of await page.evaluate(() => window.__skipLog.splice(0)).catch(() => [])) {
      events.push(event);
      if (event.type === 'yt-navigate-finish' && event.path !== lastPath) { lastPath = event.path; arrivedAt = event.at; pressed = false; }
    }
    // A calm scroller: stay about 2.2 s on a Short the extension kept, then press the site's own Next control.
    if (lastPath && !pressed && Date.now() - arrivedAt >= 2200) {
      pressed = true;
      await page.evaluate(() => document.querySelector('#navigation-button-down button')?.click()).catch(() => {});
    }
  }
  await context.close();
  fs.writeFileSync(path.join(output, 'latency.json'), JSON.stringify({ version: manifest.version, settings, startedAt: started, pageErrors, net, events }, null, 1));
  console.log('done', events.length, 'events', pageErrors.length, 'page errors');
}

function quantile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
}

function describe(values) {
  if (!values.length) return 'n=0';
  const round = (value) => Math.round(value);
  return 'n=' + values.length + ' min=' + round(Math.min(...values)) + ' p25=' + round(quantile(values, 0.25)) + ' median=' + round(quantile(values, 0.5)) +
    ' p75=' + round(quantile(values, 0.75)) + ' p95=' + round(quantile(values, 0.95)) + ' max=' + round(Math.max(...values));
}

function report(dirs) {
  if (!dirs.length) throw new Error('report needs at least one <output-dir>');
  const rows = [];
  const ignored = [];
  const settled = [];
  let clicks = 0;
  let versions = new Set();
  for (const dir of dirs) {
    const run = JSON.parse(fs.readFileSync(path.join(path.resolve(dir), 'latency.json'), 'utf8'));
    versions.add(run.version);
    // Runs recorded while this script was being written stored the timeline under "ev".
    const events = (run.events || run.ev).slice().sort((a, b) => a.at - b.at);
    // Only a Short the extension never tried to move on from counts as kept.
    for (const event of events) {
      if (event.type !== 'settled' || !event.still) continue;
      const arrived = [...events].reverse().find((other) => other.type === 'yt-navigate-finish' && other.path === event.path && other.at <= event.at);
      const tried = arrived && events.some((other) => other.type === 'msg-advance' && other.at >= arrived.at - 20 && other.at <= event.at);
      if (!tried) settled.push(event);
    }
    const finishes = events.filter((event) => event.type === 'yt-navigate-finish');
    const advances = events.filter((event) => event.type === 'msg-advance');
    const logEnd = events.length ? events[events.length - 1].at : 0;
    clicks += advances.length;
    for (const advance of advances) {
      // A click in the last second of the log has no room to be answered, so it says nothing about the site.
      if (logEnd - advance.at < 1000) continue;
      const start = events.find((event) => event.type === 'yt-navigate-start' && event.at >= advance.at);
      if (start && start.at - advance.at <= 1000) continue;
      const click = events.find((event) => event.type === 'click-next' && event.at >= advance.at);
      const previous = [...finishes].reverse().find((event) => event.at <= advance.at + 3);
      ignored.push({ afterFinishMs: previous ? Math.round(advance.at - previous.at) : null, idx: click?.idx, seq: click?.seq, down: click?.down });
    }
    let previousWasAutomatic = false;
    for (let index = 0; index < finishes.length - 1; index += 1) {
      const arrived = finishes[index];
      const next = finishes[index + 1];
      if (arrived.path === next.path) continue;
      const advance = events.find((event) => event.type === 'msg-advance' && event.at >= arrived.at - 20 && event.at <= next.at - 40);
      if (advance) {
        const click = events.find((event) => event.type === 'click-next' && event.at >= advance.at && event.at <= next.at);
        const start = events.find((event) => event.type === 'yt-navigate-start' && click && event.at >= click.at && event.at <= next.at + 5);
        rows.push({
          continuation: previousWasAutomatic,
          decide: advance.at - arrived.at,
          startAfterClick: start && click ? start.at - click.at : null,
          finishAfterClick: click ? next.at - click.at : null,
          onScreen: next.at - arrived.at,
        });
      }
      previousWasAutomatic = !!advance;
    }
  }
  console.log('ScrollPlus', [...versions].join(', '), '| runs:', dirs.length, '| skips:', rows.length, '| automatic clicks:', clicks, '| not acted on within 1 s:', ignored.length);
  if (settled.length) {
    console.log('Shorts kept on screen for 1 s: ' + settled.length + ' | muted: ' + settled.filter((item) => item.muted).length + ' | paused: ' + settled.filter((item) => item.paused).length +
      ' | not yet playing (under 0.3 s in): ' + settled.filter((item) => item.ct != null && item.ct < 0.3).length);
  }
  const all = rows.map((row) => row.onScreen);
  if (all.length) {
    const mean = all.reduce((sum, value) => sum + value, 0) / all.length;
    console.log('all skips: active Short, arrival to next arrival: mean=' + Math.round(mean) + ' median=' + Math.round(quantile(all, 0.5)) + ' p95=' + Math.round(quantile(all, 0.95)) +
      ' | over 1 s: ' + all.filter((value) => value > 1000).length + ' | under 300 ms: ' + all.filter((value) => value < 300).length);
  }
  for (const [label, set] of [['chain start', rows.filter((row) => !row.continuation)], ['chain continuation', rows.filter((row) => row.continuation)]]) {
    console.log('== ' + label + ' (n=' + set.length + ')');
    for (const [key, title] of [['decide', 'arrival to click (ms)'], ['startAfterClick', 'click to site move start'], ['finishAfterClick', 'click to site move finish'], ['onScreen', 'active Short, arrival to next arrival']]) {
      console.log('  ' + title.padEnd(40) + describe(set.map((row) => row[key]).filter((value) => value != null)));
    }
  }
  for (const item of ignored) console.log('not acted on: click ' + item.afterFinishMs + ' ms after the move finished; queue index ' + item.idx + ' of ' + item.seq + ', next-arrow hidden ' + item.down);
}
