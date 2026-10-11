// Local QA on live TikTok For You: where the time goes when ScrollPlus skips a video, and how the site answers presses.
// Usage:
//   node scripts/tiktok-latency.mjs run <extension-dir> <output-dir> [duration-ms] [settings-json | @file]
//   node scripts/tiktok-latency.mjs probe <output-dir> [rounds]
//   node scripts/tiktok-latency.mjs mute <output-dir> <delay-ms> [videos]
//   node scripts/tiktok-latency.mjs report <output-dir> [<output-dir> ...]
// run drives a fresh signed-out Chromium profile with the built extension. After 2.2 s on a video the extension kept, a calm scroller
// presses the site's own Next control; it taps Keep going when the pause chip appears. A page-side recorder timestamps the video
// that is the active one, every scroll frame, the clicks on the site's Next control, the extension's page messages, the player's
// media events, the state of the Next control and the chip. settings-json (or @file with it) is merged over the stored settings, for
// example a stricter bar to provoke skips in a row:
//   '{"rule":{"likes":{"on":true,"min":100000},"comments":{"on":false,"min":100},"views":{"on":false,"min":100000}}}'
// probe uses no extension. It presses Next twice, the second press 30-600 ms after the first, and records what TikTok does with the
// second one. mute sets the muted property of every video from a script delay-ms after it became the active one, presses Next 350 ms
// later, and records whether the videos that follow start muted although the script has not touched them yet (the site kept the mute)
// and what the site stores about sound. report prints the figures for any of them.
// A signed-out profile is good for about 30 videos, then TikTok asks for a login and stops loading videos: use several short runs
// (60-75 s) in fresh output directories instead of one long one. The script needs network access to TikTok and a display.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [mode, ...args] = process.argv.slice(2);
if (mode === 'run' || mode === 'probe' || mode === 'mute') await record(mode, args);
else if (mode === 'report') report(args);
else throw new Error('Usage: node scripts/tiktok-latency.mjs run <extension-dir> <output-dir> [duration-ms] [settings] | probe <output-dir> [rounds] | mute <output-dir> <delay-ms> [videos] | report <output-dir>...');

async function record(kind, params) {
  const [first, second, third, fourth] = params;
  const extension = kind === 'run' ? path.resolve(first || '') : null;
  const outputArg = kind === 'run' ? second : first;
  const muteDelay = kind === 'mute' ? Number(second) : null;
  const count = Number(kind === 'run' ? third || 75000 : kind === 'mute' ? third || 12 : second || 2);
  const settingsArg = kind === 'run' ? fourth : null;
  if (!outputArg || (kind === 'run' && !first)) throw new Error('run needs <extension-dir> and <output-dir>');
  if (!Number.isFinite(count) || count < 1 || (kind === 'mute' && !Number.isFinite(muteDelay))) throw new Error('Invalid duration, rounds, videos or delay');
  const output = path.resolve(outputArg);
  const profile = path.join(output, 'profile');
  if (fs.existsSync(profile)) throw new Error('Use a new output directory; do not start a second run on an existing profile');
  fs.mkdirSync(output, { recursive: true });
  const launchArgs = ['--no-first-run'];
  if (extension) launchArgs.push('--disable-extensions-except=' + extension, '--load-extension=' + extension);
  const context = await chromium.launchPersistentContext(profile, { headless: false, viewport: { width: 1280, height: 800 }, args: launchArgs });
  let settings = null;
  let version = null;
  if (extension) {
    version = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8')).version;
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (settingsArg) {
      const patch = JSON.parse(settingsArg.startsWith('@') ? fs.readFileSync(settingsArg.slice(1), 'utf8') : settingsArg);
      await worker.evaluate(async (next) => {
        const { settings } = await chrome.storage.local.get('settings');
        await chrome.storage.local.set({ settings: { ...settings, ...next } });
      }, patch);
    }
    settings = await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
    console.log('version', version, 'settings', JSON.stringify(settings.rule));
  }
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error.message).slice(0, 160)));
  await page.addInitScript(recorder);
  await page.goto('https://www.tiktok.com/foryou', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const events = [];
  const frames = [];
  const external = [];
  const pull = async () => {
    const got = await page.evaluate(() => ({ log: window.__log.splice(0), frames: window.__frames.splice(0) })).catch(() => ({ log: [], frames: [] }));
    events.push(...got.log);
    frames.push(...got.frames);
    return got.log;
  };
  const started = Date.now();
  let lastDialogCheck = 0;
  let dialogOpen = false;
  const watchDialog = async () => {
    if (Date.now() - lastDialogCheck < 1000) return;
    lastDialogCheck = Date.now();
    const text = await page.evaluate(() => { const dialog = document.querySelector('[role="dialog"]'); return dialog ? (dialog.textContent || '').slice(0, 60) : null; }).catch(() => null);
    if (text && !dialogOpen) { dialogOpen = true; external.push({ at: Date.now(), type: 'dialog-open', text }); }
    if (!text && dialogOpen) { dialogOpen = false; external.push({ at: Date.now(), type: 'dialog-closed' }); }
    if (text) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.locator('[data-e2e="modal-close-inner-button"]').first().click({ timeout: 400 }).catch(() => {});
    }
  };
  const clickNext = () => page.evaluate(() => { const next = document.querySelector('[data-e2e="feed-navigation-next"]'); if (next && !next.disabled) { next.click(); return true; } return false; }).catch(() => false);
  const nextReady = async () => {
    for (let waited = 0; waited < 10000; waited += 100) {
      if (await page.evaluate(() => { const next = document.querySelector('[data-e2e="feed-navigation-next"]'); return !!next && !next.disabled; }).catch(() => false)) return true;
      await page.waitForTimeout(100);
    }
    return false;
  };
  const scrollTop = () => page.evaluate(() => document.getElementById('column-list-container')?.scrollTop ?? null).catch(() => null);
  // Waits until nothing has scrolled for quietMs.
  const settle = async (quietMs) => {
    let last = null;
    let changed = Date.now();
    for (let waited = 0; waited < 6000; waited += 40) {
      await page.waitForTimeout(40);
      await pull();
      const now = await scrollTop();
      if (now !== last) { last = now; changed = Date.now(); }
      if (Date.now() - changed >= quietMs) return;
    }
  };

  if (kind === 'run') {
    let activeId = null;
    let arrivedAt = 0;
    let pressedFor = null;
    let advancedFor = null;
    let lastTry = 0;
    while (Date.now() - started < count) {
      await page.waitForTimeout(40);
      const got = await pull();
      await watchDialog();
      for (const event of got) {
        if (event.type === 'active' && event.id) { activeId = event.id; arrivedAt = event.at; pressedFor = null; advancedFor = null; }
        if (event.type === 'msg-advance') advancedFor = activeId;
      }
      const tapped = await page.evaluate(() => { const button = document.querySelector('#scrollplus-chip-host')?.shadowRoot?.querySelector('.chip.stack button.primary'); if (button) { button.click(); return true; } return false; }).catch(() => false);
      if (tapped) external.push({ at: Date.now(), type: 'keep-going' });
      if (activeId && pressedFor !== activeId && advancedFor !== activeId && Date.now() - arrivedAt >= 2200 && Date.now() - lastTry >= 300) {
        lastTry = Date.now();
        if (await clickNext()) pressedFor = activeId;
      }
    }
  } else if (kind === 'probe') {
    const trials = [];
    const offsets = (process.env.OFFSETS || '30,80,130,160,200,240,300,400,600').split(',').map(Number);
    await page.waitForTimeout(7000);
    for (let round = 0; round < count; round += 1) {
      for (const offset of offsets) {
        await watchDialog();
        await settle(1200);
        await nextReady();
        const before = await scrollTop();
        // Both presses are made from the page so that the gap between them is not stretched by the round trip.
        const pair = await page.evaluate((gap) => new Promise((resolve) => {
          const now = () => performance.timeOrigin + performance.now();
          const press = () => { const next = document.querySelector('[data-e2e="feed-navigation-next"]'); const state = next ? (next.disabled ? 'disabled' : 'enabled') : 'none'; const at = now(); if (next && !next.disabled) next.click(); return { at, state }; };
          const firstPress = press();
          setTimeout(() => resolve({ first: firstPress, second: press() }), gap);
        }), offset).catch(() => null);
        await settle(1200);
        const after = await scrollTop();
        if (pair) trials.push({ offset, firstAt: pair.first.at, secondAt: pair.second.at, firstState: pair.first.state, secondState: pair.second.state, before, after });
        console.log('offset', offset, pair ? pair.first.state + '/' + pair.second.state : 'no page', 'scrollTop', before, '->', after);
      }
    }
    external.push({ type: 'trials', trials });
  } else {
    await page.waitForTimeout(7000);
    await page.evaluate((delay) => { window.__muteAfter = delay; }, muteDelay);
    const storage = () => page.evaluate(() => { const all = {}; for (let index = 0; index < localStorage.length; index += 1) { const key = localStorage.key(index); all[key] = String(localStorage.getItem(key)).slice(0, 100); } return all; }).catch(() => ({}));
    const before = await storage();
    let activeId = null;
    let arrivedAt = 0;
    let pressedFor = null;
    let lastTry = 0;
    let videos = 0;
    while (videos < count && Date.now() - started < 120000) {
      await page.waitForTimeout(40);
      const got = await pull();
      await watchDialog();
      for (const event of got) if (event.type === 'active' && event.id && event.id !== activeId) { activeId = event.id; arrivedAt = event.at; pressedFor = null; videos += 1; }
      if (activeId && pressedFor !== activeId && Date.now() - arrivedAt >= muteDelay + 350 && Date.now() - lastTry >= 250) {
        lastTry = Date.now();
        if (await clickNext()) pressedFor = activeId;
      }
    }
    const after = await storage();
    const changed = Object.keys(after).filter((key) => before[key] !== after[key]);
    external.push({ type: 'mute', delay: muteDelay, videos, storageKeysChanged: changed, soundKeys: Object.keys(after).filter((key) => /mute|volume|sound|audio/i.test(key)) });
    console.log('storage keys changed:', changed.join(', '));
    console.log('storage keys that mention sound:', Object.keys(after).filter((key) => /mute|volume|sound|audio/i.test(key)).join(', ') || 'none');
  }
  await pull();
  await context.close().catch(() => {});
  fs.writeFileSync(path.join(output, 'timeline.json'), JSON.stringify({ mode: kind, version, settings, startedAt: started, pageErrors, external, events, frames }, null, 1));
  console.log('done', events.length, 'events', frames.length, 'frames', pageErrors.length, 'page errors');
}

// Runs in the page before the site's own scripts.
function recorder() {
  const stamp = () => performance.timeOrigin + performance.now();
  const log = (window.__log = []);
  const frames = (window.__frames = []);
  const push = (type, data) => log.push(Object.assign({ at: stamp(), type }, data));
  const videoId = (element) => { const wrapper = element && element.closest && element.closest('[id^="xgwrapper-"]'); const match = wrapper && wrapper.id.match(/^xgwrapper-\d+-(\d+)$/); return match ? match[1] : null; };
  const known = new WeakMap();
  for (const type of ['play', 'playing', 'pause', 'volumechange']) {
    document.addEventListener(type, (event) => {
      const video = event.target;
      if (!(video instanceof HTMLVideoElement)) return;
      const id = videoId(video);
      if (id) known.set(video, id);
      push('media', { ev: type, id: id || known.get(video) || null, muted: video.muted });
    }, true);
  }
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-e2e="feed-navigation-next"],[data-e2e="feed-navigation-prev"]')) push('click-nav', {});
  }, true);
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (event.source !== window || !data || data.source !== 'scrollplus') return;
    if (data.type === 'item') push('msg-item', { id: data.item && data.item.id, likes: data.item && data.item.metrics ? data.item.metrics.likes : null });
    else if (data.type === 'cache' && Array.isArray(data.items)) push('msg-cache', { likes: data.items.map((item) => [item.id, item.metrics ? item.metrics.likes : null]) });
    else if (data.type === 'advance') push('msg-advance', { key: data.key });
  });
  // The video the extension would call the active one: the feed player that is at least 60% on screen.
  const activeId = () => {
    let best = null;
    let bestRatio = 0;
    for (const video of document.querySelectorAll('video')) {
      if (video.closest('[data-e2e="recommend-card"]')) continue;
      const rect = video.getBoundingClientRect();
      if (rect.height < 40) continue;
      const ratio = (Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0)) / rect.height;
      if (ratio > bestRatio) { bestRatio = ratio; best = video; }
    }
    return best && bestRatio >= 0.6 ? videoId(best) : null;
  };
  let lastScroll = null;
  let lastActive = '__none__';
  let lastNext = '';
  const frame = () => {
    const scroller = document.getElementById('column-list-container');
    const top = scroller ? Math.round(scroller.scrollTop * 10) / 10 : null;
    if (top !== lastScroll) {
      lastScroll = top;
      const videos = [];
      for (const video of document.querySelectorAll('video')) videos.push([videoId(video), Math.round(video.getBoundingClientRect().top), video.paused ? 1 : 0, video.muted ? 1 : 0]);
      frames.push([stamp(), top, videos]);
    }
    const active = activeId();
    if (active !== lastActive) {
      lastActive = active;
      push('active', { id: active });
      // mute mode: set the video's muted property from the page, window.__muteAfter ms after it became the active one.
      if (active && typeof window.__muteAfter === 'number') {
        setTimeout(() => {
          for (const video of document.querySelectorAll('video')) {
            if (videoId(video) !== active) continue;
            const rect = video.getBoundingClientRect();
            if (rect.height < 40 || rect.top > innerHeight || rect.bottom < 0) continue;
            push('script-mute', { id: active, wasMuted: video.muted });
            video.muted = true;
          }
        }, window.__muteAfter);
      }
    }
    const next = document.querySelector('[data-e2e="feed-navigation-next"]');
    const state = next ? (next.disabled ? 'disabled' : 'enabled') : 'none';
    if (state !== lastNext) { lastNext = state; push('next-state', { state }); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  let lastChip = '';
  setInterval(() => {
    const chip = document.querySelector('#scrollplus-chip-host')?.shadowRoot?.querySelector('.chip');
    const text = chip && !chip.classList.contains('leaving') ? (chip.querySelector('.label')?.textContent || '') : '';
    if (text !== lastChip) { lastChip = text; push('chip', { text }); }
  }, 20);
}

function quantile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))] : null;
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
  let attemptsTotal = 0;
  const audit = { skipped: 0, atOrAboveBar: 0, unknownCount: 0 };
  // TikTok keeps its Next control disabled while it has no next video. For the skipped videos that waited for it: how long the control
  // was disabled, and how long after it was offered the extension pressed it.
  const waits = { videos: 0, disabledFor: [], pressedAfter: [] };
  const free = [];
  let versions = new Set();
  const runs = [];
  for (const dir of dirs) {
    const data = JSON.parse(fs.readFileSync(path.join(path.resolve(dir), 'timeline.json'), 'utf8'));
    if (data.mode === 'probe') { reportProbe(dir, data); continue; }
    if (data.mode === 'mute') { reportMute(dir, data); continue; }
    runs.push(dir);
    versions.add(data.version);
    const events = data.events.slice().sort((a, b) => a.at - b.at);
    const frames = data.frames.slice().sort((a, b) => a[0] - b[0]);
    const height = 768;
    const viewport = 800;
    const visibleShare = (top) => (Math.min(top + height, viewport) - Math.max(top, 0)) / height;
    const arrivals = [];
    for (const event of events) if (event.type === 'active' && event.id && (!arrivals.length || arrivals[arrivals.length - 1].id !== event.id)) arrivals.push({ id: event.id, at: event.at });
    const advances = events.filter((event) => event.type === 'msg-advance');
    const clicks = events.filter((event) => event.type === 'click-nav');
    const media = events.filter((event) => event.type === 'media');
    const controlStates = events.filter((event) => event.type === 'next-state');
    // Like counts the extension was given, to check that it only ever moved on from a video under the bar.
    const likes = new Map();
    for (const event of events) {
      if (event.type === 'msg-item' && event.id && event.likes != null) likes.set(event.id, event.likes);
      if (event.type === 'msg-cache') for (const [id, count] of event.likes) if (count != null) likes.set(id, count);
    }
    const bar = data.settings && data.settings.rule && data.settings.rule.likes && data.settings.rule.likes.on ? data.settings.rule.likes.min : null;
    let previousAutomatic = false;
    for (let index = 0; index < arrivals.length - 1; index += 1) {
      const arrived = arrivals[index];
      const next = arrivals[index + 1];
      const mine = advances.filter((event) => event.at >= arrived.at - 30 && event.at <= next.at);
      if (!mine.length) { previousAutomatic = false; continue; }
      attemptsTotal += mine.length;
      audit.skipped += 1;
      if (!likes.has(arrived.id)) audit.unknownCount += 1;
      else if (bar != null && likes.get(arrived.id) >= bar) audit.atOrAboveBar += 1;
      const click = clicks.find((event) => event.at >= mine[0].at - 2 && event.at <= next.at);
      let stateAtArrival = 'enabled';
      for (const state of controlStates) if (state.at <= arrived.at) stateAtArrival = state.state;
      const disabledAt = stateAtArrival === 'disabled' ? arrived.at : (controlStates.find((state) => state.at > arrived.at && state.at <= next.at && state.state === 'disabled') || {}).at;
      if (disabledAt == null) free.push(next.at - arrived.at);
      else if (click) {
        const offered = controlStates.find((state) => state.at > disabledAt && state.state === 'enabled');
        if (offered && offered.at <= click.at + 5) { waits.videos += 1; waits.disabledFor.push(offered.at - disabledAt); waits.pressedAfter.push(click.at - offered.at); }
      }
      let firstSeen = null;
      let lastSeen = null;
      for (const frame of frames) {
        if (frame[0] < arrived.at - 1500) continue;
        if (frame[0] > next.at + 600) break;
        const hit = frame[2].find((video) => video[0] === arrived.id);
        if (hit && visibleShare(hit[1]) > 0.02) { if (firstSeen == null) firstSeen = frame[0]; lastSeen = frame[0]; }
      }
      const playing = media.find((event) => event.id === arrived.id && event.ev === 'playing' && event.at >= arrived.at - 1500 && event.at <= next.at);
      const silent = playing ? media.find((event) => event.id === arrived.id && event.at > playing.at && ((event.ev === 'volumechange' && event.muted) || event.ev === 'pause') && event.at <= next.at + 1500) : null;
      rows.push({
        continuation: previousAutomatic,
        decide: mine[0].at - arrived.at,
        attempts: mine.length,
        click: click ? click.at - arrived.at : null,
        clickToNext: click ? next.at - click.at : null,
        onScreen: next.at - arrived.at,
        visible: firstSeen != null && lastSeen != null ? lastSeen - firstSeen : null,
        audible: playing && !playing.muted ? Math.min(silent ? silent.at : next.at, next.at + 700) - playing.at : 0,
      });
      previousAutomatic = true;
    }
  }
  if (!runs.length) return;
  console.log('ScrollPlus', [...versions].join(', '), '| runs:', runs.length, '| skipped videos:', rows.length, '| automatic presses:', attemptsTotal);
  const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;
  const on = rows.map((row) => row.onScreen);
  const slow = rows.filter((row) => row.onScreen > 1000);
  console.log('all skipped videos: active video, arrival to the next arrival: mean=' + Math.round(mean(on)) + ' median=' + Math.round(quantile(on, 0.5)) + ' p90=' + Math.round(quantile(on, 0.9)) + ' p95=' + Math.round(quantile(on, 0.95)) +
    ' | over 1 s: ' + slow.length + ' (' + Math.round(100 * slow.length / Math.max(1, rows.length)) + '%), ' + Math.round(100 * slow.reduce((sum, row) => sum + row.onScreen, 0) / Math.max(1, on.reduce((sum, value) => sum + value, 0))) + '% of all on-screen time');
  console.log('heard per skipped video: mean=' + Math.round(mean(rows.map((row) => row.audible))) + ' ms, total ' + (rows.reduce((sum, row) => sum + row.audible, 0) / 1000).toFixed(1) + ' s | needed more than one press: ' + rows.filter((row) => row.attempts > 1).length);
  console.log('moved on from ' + audit.skipped + ' videos: ' + audit.atOrAboveBar + ' at or above the bar, ' + audit.unknownCount + ' whose like count was not seen by the recorder');
  console.log('Next control disabled while the video waited: ' + waits.videos + ' of ' + audit.skipped + ' | disabled for (ms): ' + describe(waits.disabledFor) + ' | pressed after it was offered (ms): ' + describe(waits.pressedAfter));
  console.log('skipped videos for which the control was never disabled, arrival to the next arrival (ms): ' + describe(free));
  for (const [label, set] of [['first skip of a row', rows.filter((row) => !row.continuation)], ['skip that follows a skip', rows.filter((row) => row.continuation)]]) {
    console.log('== ' + label + ' (n=' + set.length + ')');
    for (const [key, title] of [['decide', 'arrival to first press (ms)'], ['click', 'arrival to the click that worked'], ['clickToNext', 'click to next video active'], ['onScreen', 'active video, arrival to next arrival'], ['visible', 'any part of it on screen'], ['audible', 'heard']]) {
      console.log('  ' + title.padEnd(40) + describe(set.map((row) => row[key]).filter((value) => value != null)));
    }
  }
  // TikTok answers a press made soon after a video arrived more slowly than one made a little later (qa/skip-timing-tiktok.md).
  const pressed = rows.filter((row) => row.click != null && row.clickToNext != null && row.decide < 400);
  console.log('== click to next video active, by how long after the video arrived the press was made (presses made within 0.4 s)');
  for (const [low, high, title] of [[0, 160, 'under 160 ms'], [160, 200, '160 to 199 ms'], [200, 400, '200 ms or more']]) {
    const set = pressed.filter((row) => row.decide >= low && row.decide < high);
    console.log('  ' + title.padEnd(16) + describe(set.map((row) => row.clickToNext)) + ' | over 180 ms: ' + set.filter((row) => row.clickToNext > 180).length);
  }
}

function reportProbe(dir, data) {
  const trials = data.external.find((entry) => entry.type === 'trials').trials;
  const events = data.events.slice().sort((a, b) => a.at - b.at);
  console.log('== probe ' + path.basename(dir) + ': two presses without the extension; arrival times are relative to the first press (ms)');
  console.log('offset  second press  controls     items moved  B arrives  C arrives  B active for');
  for (const trial of trials) {
    const base = trial.firstAt;
    const window = events.filter((event) => event.type === 'active' && event.id && event.at >= base - 5 && event.at <= base + 2500);
    const arrivals = [];
    for (const event of window) if (!arrivals.length || arrivals[arrivals.length - 1].id !== event.id) arrivals.push(event);
    const moved = Math.round((trial.after - trial.before) / 800);
    const rel = (event) => event ? String(Math.round(event.at - base)).padStart(6) : '     -';
    const held = arrivals.length > 1 ? Math.round(arrivals[1].at - arrivals[0].at) : null;
    console.log(String(trial.offset).padStart(5) + String(Math.round(trial.secondAt - base)).padStart(10) + '    ' + (trial.firstState + '/' + trial.secondState).padEnd(18) + String(moved).padStart(3) + '      ' + rel(arrivals[0]) + '   ' + rel(arrivals[1]) + '   ' + (held == null ? '-' : String(held).padStart(5)));
  }
  const gone = events.filter((event) => event.type === 'next-state' && event.state === 'enabled');
  const off = events.filter((event) => event.type === 'next-state' && event.state === 'disabled');
  let waits = [];
  for (const down of off) { const up = gone.find((event) => event.at > down.at); if (up) waits.push(up.at - down.at); }
  console.log('The Next control was disabled ' + off.length + ' times; until it was enabled again (ms): ' + describe(waits));
}

function reportMute(dir, data) {
  const entry = data.external.find((item) => item.type === 'mute');
  const events = data.events.slice().sort((a, b) => a.at - b.at);
  const arrivals = [];
  for (const event of events) if (event.type === 'active' && event.id && (!arrivals.length || arrivals[arrivals.length - 1].id !== event.id)) arrivals.push(event);
  let started = 0;
  let heldFor = 0;
  const line = [];
  for (let index = 0; index < arrivals.length; index += 1) {
    const arrived = arrivals[index];
    const next = arrivals[index + 1];
    const touched = events.find((event) => event.type === 'script-mute' && event.id === arrived.id);
    const playing = events.find((event) => event.type === 'media' && event.ev === 'playing' && event.id === arrived.id && event.at >= arrived.at - 300 && (!next || event.at <= next.at));
    if (!touched || !playing) continue;
    heldFor += 1;
    // The script mutes a video delay ms after it became the active one. A video that is already muted at that moment, or that
    // started to play muted, was muted by the site itself because of an earlier mute.
    if (touched.wasMuted || playing.muted) started += 1;
    line.push(touched.wasMuted || playing.muted ? 'M' : 'a');
  }
  console.log('== mute probe ' + path.basename(dir) + ': the script muted every video ' + entry.delay + ' ms after it became active');
  console.log('videos that started muted before the script touched them (a = audible start, M = muted start): ' + line.join(' '));
  console.log('muted at the start: ' + started + ' of ' + heldFor + ' (the first video is always audible)');
  console.log('storage keys changed: ' + entry.storageKeysChanged.join(', '));
  console.log('storage keys that mention sound: ' + (entry.soundKeys.join(', ') || 'none'));
}
