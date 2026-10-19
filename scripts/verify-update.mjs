// Local upgrade QA with the actual prior ZIP, one disposable Chromium profile,
// and the candidate ZIP. This is not a Chrome Web Store delivery test.
// node scripts/verify-update.mjs <prior.zip> <candidate.zip> <new-output-dir>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
const [priorArg, candidateArg, outputArg] = process.argv.slice(2);
if (!priorArg || !candidateArg || !outputArg) throw new Error('Provide prior ZIP, candidate ZIP and a new output directory');
const output = path.resolve(outputArg);
if (fs.existsSync(output)) throw new Error('Output must be new; never reuse a QA profile');
fs.mkdirSync(output, { recursive: true });
const runtime = path.join(output, 'extension'), profile = path.join(output, 'profile');
function unpack(file) {
  const entries = execFileSync('unzip', ['-Z1', path.resolve(file)], { encoding: 'utf8' }).trim().split('\n');
  assert.ok(entries.every(entry => !entry.startsWith('/') && !entry.split('/').includes('..')));
  fs.mkdirSync(runtime, { recursive: true });
  execFileSync('unzip', ['-q', path.resolve(file), '-d', runtime]);
}
async function launch() {
  const context = await chromium.launchPersistentContext(profile, { headless: false, args: ['--disable-extensions-except=' + runtime, '--load-extension=' + runtime] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 10000 });
  await expect.poll(() => worker.evaluate(async () => (await chrome.storage.local.get('schema')).schema)).toBe(3);
  return { context, worker, id: new URL(worker.url()).host };
}
let browser;
const report = { scope: 'Actual ZIPs, same unpacked path and browser profile across restart; not Store auto-update delivery', prior: null, candidate: null };
try {
  unpack(priorArg); browser = await launch();
  const before = await browser.worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    const now = new Date(), day = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
    const expected = { schema: 3, settings: { ...settings, enabled: false, skipAds: false, keepFollowed: false, showSkipChip: false, filterGrids: true, platforms: { youtube: true, tiktok: false, instagram: true }, rule: { likes: { on: true, min: 875 }, comments: { on: true, min: 23 }, views: { on: false, min: 39000 } }, allowlist: [{ platform: 'youtube', id: 'qa-update-creator' }] }, dailySkips: { day, count: 17 }, totalSkips: { since: '2026-10-13', count: 41, onScreenMs: 12000 } };
    await chrome.storage.local.set(expected);
    return { version: chrome.runtime.getManifest().version, local: await chrome.storage.local.get(null) };
  });
  // A service worker cannot receive its own runtime message. Exercise the real
  // session broker from an extension page, just as the installed UI does.
  const app = await browser.context.newPage();
  await app.goto('chrome-extension://' + browser.id + '/options.html');
  before.session = await app.evaluate(async () => {
    const reply = await chrome.runtime.sendMessage({ type: 'scrollplus:session:keep', platform: 'instagram', id: 'qa-update-video' });
    if (!reply?.ok) throw new Error('Session broker did not accept the QA video');
    return await chrome.storage.session.get(null);
  });
  report.prior = { id: browser.id, ...before };
  assert.ok(before.session.undoKeeps.items.instagram.includes('qa-update-video'));
  await browser.context.close(); browser = null;
  // This path was created by this run and its browser is closed; retain profile.
  fs.rmSync(runtime, { recursive: true }); unpack(candidateArg);
  browser = await launch();
  const after = await browser.worker.evaluate(async () => ({ version: chrome.runtime.getManifest().version, local: await chrome.storage.local.get(null), session: await chrome.storage.session.get(null) }));
  report.candidate = { id: browser.id, ...after };
  assert.equal(report.prior.id, report.candidate.id);
  assert.equal(before.version, '0.7.3'); assert.equal(after.version, '0.7.4');
  assert.deepEqual(after.local, before.local);
  assert.equal(after.session.undoKeeps, undefined); // RAM choices clear on restart.
  report.passed = true;
} finally {
  await browser?.context.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: report.passed, prior: report.prior?.version, candidate: report.candidate?.version, settingsAndCountsPreserved: report.passed, report: path.join(output, 'report.json') }));
