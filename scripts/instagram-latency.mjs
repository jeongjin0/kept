// Local QA on live, signed-in Instagram Reels: how long a skipped reel stays on screen, and how the site answers presses.
//
//   node scripts/instagram-latency.mjs build <extension dir> <out.js> [run ms] [settings JSON or @file]
//   node scripts/instagram-latency.mjs report <recording.json>...
//
// build writes a script for the Aside REPL (aside repl, a Playwright-like tab API with openTab, sleep, fs and closeTab) that opens
// /reels/ in a browser that is signed in to Instagram, runs the two Instagram content scripts of the built extension in the page's main
// world behind a stand-in for chrome.storage and chrome.runtime, and records what the page does. The extension itself cannot be loaded
// into that browser without a file dialog, so the stand-in replaces what the browser would provide: the scripts and their numbers are
// those of the build, and timers, messages and the page are the same as in an installed extension. The script presses nothing but the
// site's own Next control: it does not like, follow, comment on, or change the sound of anything.
//
// A calm scroller is simulated: 2.2 s after a reel that the extension did not skip, it presses the site's own Next control, and it taps
// Keep going when the pause chip appears. The recording is written to artifacts/<name> of the REPL session; fetch it and run report.
import fs from 'node:fs';

// Runs in the page. Installs the stand-in and the recorder, and starts the simulated scroller when window.__simOn is set.
function recorder(settings) {
  if (window.__spRec) return { already: true };
  window.__spRec = true;
  const T = () => performance.timeOrigin + performance.now();
  const log = (window.__log = []);
  const frames = (window.__frames = []);
  const push = (type, data) => log.push(Object.assign({ at: T(), type }, data));
  const idOf = () => (location.pathname.match(/\/reels?\/([A-Za-z0-9_-]+)/) || [])[1] || null;
  let counter = 0;
  const nums = new WeakMap();
  const num = (video) => { if (!nums.has(video)) nums.set(video, ++counter); return nums.get(video); };
  for (const type of ['play', 'playing', 'pause', 'volumechange', 'waiting', 'ended']) {
    document.addEventListener(type, (event) => {
      const video = event.target;
      if (video instanceof HTMLVideoElement) push('media', { ev: type, v: num(video), muted: video.muted, vol: Math.round(video.volume * 100) / 100 });
    }, true);
  }
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const node = target.closest('[role="button"],button');
    const label = node && node.getAttribute('aria-label');
    if (label && /다음|이전|next|prev/i.test(label)) push('click-nav', { which: /다음|next/i.test(label) ? 'next' : 'prev', who: window.__simPress ? 'user' : 'engine' });
  }, true);
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (event.source !== window || !data || data.source !== 'scrollplus') return;
    if (data.type === 'advance') push('advance-msg', { key: data.key, ad: data.ad === true });
    else if (data.type === 'item' && data.item) { const m = data.item.metrics || {}; push('item', { id: data.item.id, kind: data.item.kind, likes: m.likes, comments: m.comments, views: m.views }); }
    else if (data.type === 'cache' && Array.isArray(data.items)) push('cache', { n: data.items.length, likes: data.items.map((item) => [item.id, item.metrics ? item.metrics.likes : null]) });
  }, true);
  // The stand-in for what the browser gives an installed extension.
  const store = { settings };
  const kept = [];
  const runtime = {
    id: 'scrollplus-emulation',
    getURL: (path) => path,
    sendMessage: async (message) => {
      push('send', { t: message && message.type });
      if (message && message.type === 'scrollplus:session:get') return { ok: true, view: { platform: message.platform, revision: 0, ids: kept.slice() } };
      if (message && message.type === 'scrollplus:session:keep') { kept.push(message.id); return { ok: true, view: { platform: message.platform, revision: kept.length, ids: kept.slice() } }; }
      if (message && message.type === 'scrollplus:reset') return { ok: true, settings };
      return { ok: true };
    },
    onMessage: { addListener() {}, removeListener() {}, hasListener() { return false; } },
  };
  const pick = (keys) => {
    const out = {};
    for (const key of typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys || {})) if (key in store) out[key] = store[key];
    return out;
  };
  const storage = {
    local: { get: async (keys) => pick(keys), set: async (values) => { Object.assign(store, values); } },
    session: { get: async () => ({}) },
    onChanged: { addListener() {}, removeListener() {} },
  };
  const chrome = window.chrome && typeof window.chrome === 'object' ? window.chrome : {};
  try { chrome.runtime = runtime; chrome.storage = storage; } catch (error) { /* replaced below */ }
  if (!chrome.runtime || chrome.runtime.id !== 'scrollplus-emulation') Object.defineProperty(window, 'chrome', { value: { runtime, storage }, configurable: true });
  // The simulated scroller.
  const sim = { id: null, arrival: 0, pressedFor: null, lastUser: 0, lastEngine: 0, tapped: 0 };
  window.addEventListener('message', (event) => { if (event.source === window && event.data && event.data.source === 'scrollplus' && event.data.type === 'advance') sim.lastEngine = T(); }, true);
  setInterval(() => {
    if (!window.__simOn) return;
    const now = T();
    const id = idOf();
    if (id !== sim.id) { sim.id = id; sim.arrival = now; sim.pressedFor = null; }
    const host = document.getElementById('scrollplus-chip-host');
    const keep = host && host.shadowRoot ? host.shadowRoot.querySelector('button.primary') : null;
    if (keep && now - sim.tapped > 800) { sim.tapped = now; push('keep-going', {}); keep.click(); return; }
    // Like the extension, the scroller presses only while a reel is on screen: a press made while the page is still loading the
    // next reels is taken by the page and moves it past a reel.
    if (!id || now - sim.arrival < 2200 || now - sim.lastEngine < 700 || !activeVideo()) return;
    if (sim.pressedFor === id && now - sim.lastUser < 1500) return;
    for (const node of document.querySelectorAll("button, [role='button']")) {
      if (/next|다음/i.test(node.getAttribute('aria-label') || '') && node instanceof HTMLElement) {
        sim.pressedFor = id; sim.lastUser = now; push('user-press', { id });
        window.__simPress = true;
        try { node.click(); } finally { window.__simPress = false; }
        return;
      }
    }
  }, 100);
  // The recorder: scroll position and video positions per frame, the address, the active video (at least 60% on screen), the chip.
  const findScroller = () => {
    const first = document.querySelector('video');
    for (let node = first; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 4) return node;
    }
    return null;
  };
  let scroller = findScroller();
  let lastTop = null; let lastId = '__none__'; let lastActive = '__none__'; let lastChip = '__none__';
  const activeVideo = () => {
    let best = null; let bestRatio = 0;
    for (const video of document.querySelectorAll('video')) {
      const rect = video.getBoundingClientRect();
      if (rect.height < 40) continue;
      const ratio = (Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0)) / rect.height;
      if (ratio > bestRatio) { bestRatio = ratio; best = video; }
    }
    return bestRatio >= 0.6 ? best : null;
  };
  const frame = () => {
    if (!scroller || !scroller.isConnected) scroller = findScroller();
    const top = scroller ? Math.round(scroller.scrollTop * 10) / 10 : null;
    if (top !== lastTop) {
      lastTop = top;
      frames.push([T(), top, Array.from(document.querySelectorAll('video'), (video) => [num(video), Math.round(video.getBoundingClientRect().top), video.paused ? 1 : 0, video.muted ? 1 : 0])]);
    }
    const id = idOf();
    if (id !== lastId) { lastId = id; push('url-id', { id }); }
    const active = activeVideo();
    const number = active ? num(active) : null;
    if (number !== lastActive) { lastActive = number; push('active-video', { v: number, id: idOf(), muted: active ? active.muted : null }); }
    const host = document.getElementById('scrollplus-chip-host');
    const label = host && host.shadowRoot ? host.shadowRoot.querySelector('.label') : null;
    const chip = label ? label.textContent : null;
    if (chip !== lastChip) { lastChip = chip; push('chip', { text: chip }); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return { installed: true, url: location.href, signedOut: location.pathname.startsWith('/accounts/login') || !!document.querySelector('input[name="username"]'), videos: document.querySelectorAll('video').length, scroller: !!scroller };
}

// The body of the REPL script (the Aside REPL provides openTab, sleep, fs, pwd and closeTab).
const REPL_BODY = String.raw`
const tab = await openTab('https://www.instagram.com/reels/');
await sleep(5000);
const prep = await tab.evaluate(RECORDER, SETTINGS);
console.log('prepared', JSON.stringify(prep));
if (!prep || prep.signedOut || !prep.videos) {
  console.log('stop: this is not a signed-in Reels page');
  await closeTab(tab);
} else {
  let main = null; let isolated = null;
  try { main = await tab.evaluate(MAIN_SRC); } catch (error) { main = 'ERR ' + String((error && error.message) || error).slice(0, 200); }
  try { isolated = await tab.evaluate(ISO_SRC); } catch (error) { isolated = 'ERR ' + String((error && error.message) || error).slice(0, 200); }
  console.log('loaded main', JSON.stringify(main === undefined ? null : main), 'isolated', JSON.stringify(isolated === undefined ? null : isolated));
  await tab.evaluate(() => { window.__simOn = true; return true; });
  const started = Date.now();
  while (Date.now() - started < RUN_MS) {
    await sleep(5000);
    const now = await tab.evaluate(() => ({
      url: location.pathname,
      skips: window.__log.filter((e) => e.type === 'send' && e.t === 'scrollplus:skipped').length,
      automatic: window.__log.filter((e) => e.type === 'click-nav' && e.who === 'engine').length,
      scroller: window.__log.filter((e) => e.type === 'user-press').length,
    }));
    console.log('t+' + Math.round((Date.now() - started) / 1000) + 's', JSON.stringify(now));
  }
  const data = await tab.evaluate(() => ({ log: window.__log, frames: window.__frames }));
  await fs.mkdir('./artifacts', { recursive: true });
  await fs.writeFile('./artifacts/' + OUT, JSON.stringify(data));
  console.log('saved', pwd + '/artifacts/' + OUT, 'events', data.log.length, 'frames', data.frames.length);
  await closeTab(tab);
}
`;

function build(args) {
  const [extension, outFile, runMs = '80000', settingsArg] = args;
  if (!extension || !outFile) throw new Error('usage: build <extension dir> <out.js> [run ms] [settings JSON or @file]');
  const defaults = { enabled: true, rule: { likes: { on: true, min: 20000 }, comments: { on: false, min: 100 }, views: { on: false, min: 100000 } }, platforms: { youtube: true, tiktok: true, instagram: true }, filterGrids: false, showSkipChip: true, skipAds: false, allowlist: [] };
  const settings = settingsArg ? JSON.parse(settingsArg.startsWith('@') ? fs.readFileSync(settingsArg.slice(1), 'utf8') : settingsArg) : defaults;
  const main = fs.readFileSync(extension + '/content-scripts/instagram-main.js', 'utf8');
  const isolated = fs.readFileSync(extension + '/content-scripts/instagram.js', 'utf8');
  const name = outFile.replace(/^.*\//, '').replace(/\.js$/, '') + '.json';
  fs.writeFileSync(outFile, [
    '// Generated by scripts/instagram-latency.mjs build. Run it with: aside repl --host <host> "$(cat ' + outFile + ')"',
    'const RUN_MS = ' + Number(runMs) + ';',
    'const SETTINGS = ' + JSON.stringify(settings) + ';',
    'const MAIN_SRC = ' + JSON.stringify(main) + ';',
    'const ISO_SRC = ' + JSON.stringify(isolated) + ';',
    'const OUT = ' + JSON.stringify(name) + ';',
    'const RECORDER = ' + recorder.toString() + ';',
    REPL_BODY,
  ].join('\n'));
  console.log('wrote', outFile, '(the recording will be artifacts/' + name + ' in the REPL session)');
}

const quantile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const at = (sorted.length - 1) * p;
  const low = Math.floor(at);
  return sorted[low] + (sorted[Math.ceil(at)] - sorted[low]) * (at - low);
};
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN);
const describe = (values) => (values.length ? 'n=' + values.length + ' mean=' + Math.round(mean(values)) + ' median=' + Math.round(quantile(values, 0.5)) + ' p90=' + Math.round(quantile(values, 0.9)) + ' max=' + Math.round(Math.max(...values)) : 'n=0');

function report(files) {
  if (!files.length) throw new Error('report needs at least one recording');
  const bar = Number(process.env.BAR || 20000);
  const rows = []; const presses = []; const orderGaps = [];
  const audit = { runs: 0, automatic: 0, skipped: 0, scroller: 0, items: 0, aboveBar: 0, unknown: 0, volumeChanges: 0, unmuted: 0, steps: 0 };
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const log = data.log; const frames = data.frames; const start = log[0].at;
    audit.runs += 1;
    const active = log.filter((e) => e.type === 'active-video' && e.v != null);
    const engine = log.filter((e) => e.type === 'click-nav' && e.who === 'engine');
    const user = log.filter((e) => e.type === 'user-press');
    audit.automatic += engine.length; audit.scroller += user.length;
    audit.skipped += log.filter((e) => e.type === 'send' && e.t === 'scrollplus:skipped').length;
    audit.items += log.filter((e) => e.type === 'item').length;
    audit.volumeChanges += log.filter((e) => e.type === 'media' && e.ev === 'volumechange').length;
    audit.unmuted += active.filter((e) => e.muted === false).length;
    // Only presses from reels under the bar are allowed: look every press up by the address and the like counts the page gave.
    const likes = new Map();
    for (const e of log) {
      if (e.type === 'item' && e.likes != null && !likes.has(e.id)) likes.set(e.id, e.likes);
      if (e.type === 'cache' && e.likes) for (const [id, count] of e.likes) if (count != null && !likes.has(id)) likes.set(id, count);
    }
    const urls = log.filter((e) => e.type === 'url-id');
    for (const click of engine) {
      // The recorder sees the address once per frame, so allow one frame for a change the extension had already seen.
      let id = null;
      for (const u of urls) { if (u.at <= click.at + 25) id = u.id; else break; }
      if (!likes.has(id)) audit.unknown += 1; else if (likes.get(id) >= bar) audit.aboveBar += 1;
    }
    // The order the page lists the reels in against the order they were on screen: a step other than +1 is a reel moved past unseen.
    // The page sends the reels of the stream 13 at a time. Single items between those batches are not part of the stream (none of
    // them was ever on screen), so only the batches of ten or more count.
    const feed = new Map();
    for (const e of log) if (e.type === 'cache' && e.likes && e.likes.length >= 10) for (const [id] of e.likes) if (!feed.has(id)) feed.set(id, feed.size);
    const seen = [];
    for (const e of urls) if (e.id && (!seen.length || seen[seen.length - 1].id !== e.id)) seen.push(e);
    for (let i = 1; i < seen.length; i += 1) {
      const from = feed.get(seen[i - 1].id); const to = feed.get(seen[i].id);
      if (from == null || to == null) continue;
      audit.steps += 1;
      if (to - from !== 1) orderGaps.push(file + ' at ' + Math.round(seen[i].at - start) + ' ms: step ' + (to - from));
    }
    // Presses: how long the page takes to start scrolling, to change the address and to put the next reel on screen.
    for (const click of log.filter((e) => e.type === 'click-nav')) {
      const before = frames.filter((f) => f[0] <= click.at).pop();
      const after = frames.filter((f) => f[0] > click.at && (!before || f[1] !== before[1]));
      const url = urls.find((e) => e.at > click.at);
      const next = log.find((e) => e.type === 'active-video' && e.v != null && e.at > click.at);
      presses.push({ who: click.who, scroll: after.length ? after[0][0] - click.at : null, url: url ? url.at - click.at : null, active: next ? next.at - click.at : null, file, at: Math.round(click.at - start) });
    }
    // One row per skipped reel: from the moment it was the active one to the moment the next one was.
    const byVideo = new Map();
    for (const click of engine) {
      let arrival = null;
      for (const e of active) { if (e.at <= click.at) arrival = e; else break; }
      if (!arrival) continue;
      const entry = byVideo.get(arrival.v) || { arrival, clicks: [] };
      entry.clicks.push(click.at); byVideo.set(arrival.v, entry);
    }
    for (const [v, entry] of byVideo) {
      const first = entry.clicks[0];
      const next = active.slice(active.indexOf(entry.arrival) + 1).find((e) => e.v !== v);
      if (!next) continue;
      const earlier = [...engine, ...user.map((e) => ({ at: e.at, user: true }))].filter((c) => c.at < entry.arrival.at).sort((a, b) => b.at - a.at)[0];
      // A skip follows a skip when the move that brought the reel was the extension's.
      const continuation = !!earlier && !earlier.user && entry.arrival.at - earlier.at < 2500;
      // Until no part of the reel is on screen any more (a reel is as high as the window).
      const share = (top) => (Math.min(top + 1000, 1000) - Math.max(top, 0)) / 1000;
      let gone = NaN;
      for (const f of frames) {
        if (f[0] <= first) continue;
        if (f[0] > next.at + 4000) break;
        const hit = f[2].find((x) => x[0] === v);
        if (!hit || share(hit[1]) <= 0.02) { gone = f[0] - entry.arrival.at; break; }
      }
      rows.push({ continuation, presses: entry.clicks.length, decide: first - entry.arrival.at, response: next.at - first, onScreen: next.at - entry.arrival.at, outOfSight: gone });
    }
  }
  console.log('runs ' + audit.runs + ' | skipped ' + audit.skipped + ' | automatic presses ' + audit.automatic + ' | scroller presses ' + audit.scroller + ' | items seen ' + audit.items + ' | volumechange events ' + audit.volumeChanges + ' | active videos not muted ' + audit.unmuted);
  console.log('automatic presses from a reel at or above ' + bar + ' likes: ' + audit.aboveBar + ' | from a reel whose like count the recorder did not see: ' + audit.unknown);
  console.log('reels in feed order: ' + audit.steps + ' steps compared, steps other than +1 (a reel moved past unseen): ' + (orderGaps.length ? orderGaps.join('; ') : 'none'));
  const show = (title, set) => {
    console.log('== ' + title + ': ' + set.length + ' skipped reels');
    console.log('  on screen (arrival of the reel to arrival of the next, ms): ' + describe(set.map((r) => r.onScreen)) + ' | over 1 s: ' + set.filter((r) => r.onScreen > 1000).length);
    console.log('  arrival to first press: ' + describe(set.map((r) => r.decide)));
    console.log('  first press to next arrival: ' + describe(set.map((r) => r.response)));
    console.log('  until out of sight: ' + describe(set.map((r) => r.outOfSight).filter((x) => Number.isFinite(x))));
    console.log('  waited for the site after the reel had gone (more than 1 s): ' + set.filter((r) => r.onScreen - r.outOfSight > 1000).length + ' | needed more than one press: ' + set.filter((r) => r.presses > 1).length);
  };
  show('all', rows); show('first skip of a row', rows.filter((r) => !r.continuation)); show('skip that follows a skip', rows.filter((r) => r.continuation));
  console.log('== press to next arrival, by how long after the reel arrived the press was made (one press, answered within 0.6 s)');
  for (const [low, high] of [[0, 40], [40, 80], [80, 120], [120, 160], [160, 200], [200, 300], [300, 700]]) {
    const set = rows.filter((r) => r.presses === 1 && r.response < 600 && r.decide >= low && r.decide < high);
    if (set.length) console.log('  ' + String(low).padStart(3) + ' to ' + String(high).padEnd(3) + ' ms: ' + describe(set.map((r) => r.response)) + ' | on screen median ' + Math.round(quantile(set.map((r) => r.onScreen), 0.5)));
  }
  console.log('== what the page does after a press (ms)');
  for (const who of ['engine', 'user']) {
    const set = presses.filter((p) => p.who === who);
    const of = (key) => describe(set.map((p) => p[key]).filter((x) => x != null));
    console.log('  ' + who + ' presses ' + set.length + ': to the first scroll frame ' + of('scroll') + ' | to a new address ' + of('url') + ' | to the next reel on screen ' + of('active'));
  }
  const slow = presses.filter((p) => p.who === 'engine' && (p.active == null || p.active > 500));
  console.log('  automatic presses with no next reel within 0.5 s: ' + slow.length + ' ' + slow.map((p) => (p.active == null ? 'never' : Math.round(p.active))).join(', ') + ' ms (a scroll had started within ' + Math.round(Math.max(...slow.map((p) => p.scroll ?? 0), 0)) + ' ms in each: the page had no next reel to show yet)');
}

const [command, ...rest] = process.argv.slice(2);
if (command === 'build') build(rest);
else if (command === 'report') report(rest);
else { console.error('usage: node scripts/instagram-latency.mjs build <extension dir> <out.js> [run ms] [settings]\n       node scripts/instagram-latency.mjs report <recording.json>...'); process.exit(2); }
