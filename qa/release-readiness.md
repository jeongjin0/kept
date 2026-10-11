# Release readiness · 0.4.0

Checked on 2026-10-11 KST, macOS ARM64. This candidate adds a Skip ads switch (popup and Settings, off by default) and recognises YouTube Shorts ads, which fixes ads being skipped by the like rule on YouTube. Rules, presets and every other default are unchanged; there is no new permission or dependency. Chrome Web Store submission has not occurred; SPEC.md says not to submit it.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | npm run compile |
| Unit tests | 61 passed | npm test; adds ad decisions, defaults and old settings, and eleven engine tests for the ad skip, its Undo, the six-skip pause and stale decisions |
| Built-script browser tests | 35 passed, no skips or flaky results | npm run test:e2e; adds five Skip ads tests (YouTube, TikTok and Instagram routed pages, an Instagram disclosure-only ad, a site that is off) and popup/options/Reset coverage |
| Skip ads regression | Fails on published 0.3.7, passes now | On 0.3.7 the YouTube test fails at "an ad stays by default": the ad that showed 125 likes was skipped by the like rule. See [skip ads](ads.md) |
| Live YouTube Shorts | Pass for both settings | One hour on, one hour off, the built 0.4.0 in fresh signed-out profiles on real Shorts: all 65 first-time ads skipped with Skip ads on, none of 97 skipped with it off, no ordinary video skipped by the ad rule, no page errors. See [skip ads](ads.md#live-youtube-check) |
| Minimum Chrome 120 | Pending CI for the final commit | Official Chrome for Testing 120.0.6099.109 on Linux runs the same suite in PR CI |
| Package | Pass | npm run zip and node scripts/check-package.mjs; MV3, Chrome 120+, storage and the existing three host permissions |
| Package scope | 6 of 20 extracted files identical to published 0.3.7 | Changed: the manifest, the locale files, the background worker, the popup and options pages with their chunks and stylesheet, and four content bundles that carry the new engine (YouTube, TikTok, Instagram and Instagram's page script). Identical: the TikTok and YouTube MAIN scripts and the icons |
| Native signed-in TikTok / Instagram | Not repeated on 0.4.0 | No live TikTok or Instagram ad skip was observed for this change (a signed-out TikTok run was interrupted by a sign-up dialog). Those two rest on the sites' own ad flags and routed pages. Earlier [signed-in QA](signed-in-smoke.md) stays scoped to its packages |
| Long feed | Not run on 0.4.0 | The 60-minute live runs above covered 1,885 videos. The last 24-hour run was 0.3.5; see the [long feed report](soak.md) and its stall investigation |
| Chrome Web Store | Not submitted | [Submission checklist](../store/submission-checklist.md) updated for the new single purpose |

## Artifact

scrollplus-0.4.0-chrome.zip, 128,034 bytes.

SHA-256: 2722d2751f82d7c1de747f8f1108915755659772460e7aed07d7545ceab27749.

This identifies the tested local candidate. CI ZIP metadata can differ. The previous exact-package reports remain in [0.3.7 release readiness](release-readiness-037.md#artifact), [0.3.6](release-readiness-036.md#artifact) and [0.3.5](release-readiness-035.md#artifact).

## Remaining gates

1. See a live TikTok and Instagram ad skipped with Skip ads on. TikTok needs a signed-in session and Instagram needs one too; the signed-in QA browser on the Pro host was not reachable without a new screen-sharing login.
2. Ordinary human day-use. YouTube feed stalls are explained by a failing YouTube request (see the [stall investigation](soak.md#youtube-shorts-feed-stalls-youtubes-feed-request-fails)).
3. Update the listing only to match verified support. Store submission remains an owner decision.
