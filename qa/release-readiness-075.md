# ScrollPlus 0.7.5 release readiness

Prepared 2026-10-25 after the owner authorized the Store update following [PR #56](https://github.com/jeongjin0/scrollplus/pull/56). Candidate runtime is that merged change plus the manifest version bump; no additional runtime behavior changed here.

## Package identity

- ZIP: `.output/scrollplus-0.7.5-chrome.zip`, 157193 bytes.
- SHA-256: `85305ecd42b43a5c5f9110de107b140e84f721274affd686f149cd0866ad4d49`.
- MV3, Chrome 120 minimum, `storage` only, same three HTTPS `www` host permissions, no external-connectable entry. Package validation passes. Defaults: 500 likes, ads/follow exceptions on, notifications on/Compact. Storage schema remains 3.
- English/Korean Store images were rendered from the candidate. Recovery screenshots use a controlled feed and illustrative counters, not private site content. Compact notice scale stays close to its real size.

## Current checks

- `npm ci`, `npm run compile`, 133 unit tests, production ZIP and package check pass.
- Local current-Chromium suite: 93/94 initially pass. The YouTube ad case timed out waiting for the 2.5-second notice's Undo while browser captures were also running. Failure trace/context preserved at `qa/tmp/release-075-first-failure/`; rerunning that exact failed case unchanged passes (9.6 s). This does not alone establish the cause. Exact release-head CI subsequently passes all 94 cases on both current Chromium and Chrome 120, in both push and PR workflows; see the update checkpoint.
- Actual prior 0.7.4 ZIP (`48c71bcf667d9de1920cafdceb6401c7914e840e5f005d0cbf1f765b2f413269`) → candidate using the same disposable Chromium profile/path across restart passes. Custom thresholds/site switches, notification-off choice, saved creator and daily/total counters remain byte-for-byte equal. Missing legacy notice style renders Compact without rewriting saved settings. Session RAM clears across restart as specified. Evidence: `qa/tmp/upgrade-074-075/report.json`. This is a local unpacked upgrade, not Store delivery.
- Real signed-out YouTube Shorts on Chromium 153.0.8010.12, 2026-10-25 21:47:53–21:48:03 KST: feed/defaults available, zero default-bar skips in the bounded sample. A temporary 100,000,000-like bar produces six skips and a pause; real popup Undo moves back. No extension page error collected; 500 restored and browser closed. Evidence: `qa/tmp/notice-review/live-smoke.json` and PNGs. This does not prove a new default-bar low-like sample or new signed-in TikTok/Reels compatibility.
- The source change's exact-head Chrome 120/current-browser checks and English/Korean 320×480 fit evidence remain in [notice recovery QA](notice-popup-recovery-20261025.md). New release CI is recorded in the update checkpoint; the downloaded CI ZIP is byte-identical to the submitted package.

## Limits and delivery

No new all-day-use, live followed-positive TikTok, broad ad-variant or signed-in Reels claim. Existing version-scoped evidence remains in [0.7.4 readiness](release-readiness-074.md). Reels stays experimental. Existing privacy/data declarations remain applicable: no new permissions, server, analytics, persistent video IDs or data category.

[Store update checkpoint](../store/update-075.md) records actual upload, review and publication state. Preparing/submitting an update does not establish approval or public delivery.
