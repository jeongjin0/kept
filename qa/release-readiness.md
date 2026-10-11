# Release readiness · 0.4.3

Checked on 2026-10-11 KST, macOS ARM64. This candidate changes how long ScrollPlus waits before it moves on from a video on two sites. On Instagram Reels it waits 100 ms after the previous move instead of 450 ms, looks at the feed while it scrolls, and presses as soon as the reel is on screen enough to be moved on from. On TikTok it waits 180 ms after a video arrives instead of 150 ms. YouTube Shorts, sound, rules, presets, defaults, popup, options and permissions are unchanged. Chrome Web Store submission has not occurred; SPEC.md says not to submit it.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | npm run compile |
| Unit tests | 75 passed | npm test; no new test: the engine's settle time, ready hook and wait between moves were added and tested in 0.4.2, and this release only sets them for Instagram |
| Built-script browser tests | 53 passed | npm run test:e2e; adds four routed Instagram tests (skips in a row, the first skip of a row follows the arrival, a reel whose address came before it was on screen enough, and the sound is left alone). Three of the four fail on the 0.4.2 build (658 ms between two skips against the 450 ms bound; 326 ms and 374 ms after an arrival against 250 ms); the sound test guards behaviour that was not wrong before |
| Live Instagram Reels | Pass for the stated scope | The Instagram scripts of the build (or of 0.4.2 for comparison) run in the page of a signed-in Aside Chromium 153 behind a stand-in for chrome.storage, in 16 runs of 80 s at the 20,000-like bar: 684 presses by ScrollPlus, 669 of them with at least 0.6 s left in their run, and every one of those started a scroll within 0.25 s; none from a reel at or above the bar (the recorder had logged the like count of the reel for 534 of the 684 presses; the first runs logged fewer); 389 steps from one reel to the next, none past a reel. Median skipped reel on screen 0.32 s against 0.62 s on 0.4.2 (130 and 150 skipped reels), first skip of a row 0.21 s against 0.31 s, a skip after a skip 0.35 s against 0.64 s. See [skip timing on Instagram](skip-timing-instagram.md) |
| Live TikTok For You | Pass for the stated scope | The 0.4.2 build with the wait after a video arrives set to 150, 180, 200 and 230 ms, in fresh signed-out profiles at 1280×800, 75 s at the 20,000-like bar, four rounds with one run of each: median skipped video on screen 0.38, 0.31, 0.33 and 0.36 s; 0.31 s at 180 ms in each of the four rounds. See [skip timing on TikTok](skip-timing-tiktok.md#how-long-to-wait-after-a-video-arrives) |
| Instagram sound | Not measured | Every video was muted when it arrived in all 16 runs, and the scripts never changed a volume or a muted state. What a skipped reel would be heard for is not known; ScrollPlus does not touch the sound on Reels |
| Minimum Chrome 120 | 53 passed on Linux | [PR CI](https://github.com/jeongjin0/scrollplus/actions/runs/38146097614) on the final code commit; official Chrome for Testing 120.0.6099.109, actual built scripts on controlled fixtures. The same run passed 75 unit tests and the current-Chrome suite (53 passed) |
| Package | Pass | npm run zip and node scripts/check-package.mjs; MV3, Chrome 120+, storage and the existing three host permissions |
| Package scope | The TikTok and Instagram content scripts and the manifest version changed | The YouTube bundles, the TikTok and Instagram main-world scripts, the background worker, the popup and options pages, the shared chunks and the locale files are byte for byte those of 0.4.2 |
| Instagram with the extension installed | Not observed | The signed-in browser cannot load an unpacked extension without a file dialog, so the Instagram scripts were run in the page with a stand-in for what the browser provides (see the method in the timing report). Earlier [signed-in QA](signed-in-smoke.md) stays scoped to its packages |
| Wheel or trackpad on Reels | Not observed | The simulated person pressed the site's Next control. Wheel events sent to the page did not flip a reel, so a person who is still scrolling when ScrollPlus presses was not simulated, here or on 0.4.2 |
| Instagram ads | Not observed live | None of the 621 reels recorded was flagged as an advertisement |
| Long feed | Not run on 0.4.3 | The runs above were 75 and 80 seconds each. The last 24-hour run was 0.3.5; see the [long feed report](soak.md) |
| Chrome Web Store | Not submitted | [Submission checklist](../store/submission-checklist.md) is unchanged |

## Artifact

scrollplus-0.4.3-chrome.zip, 129,563 bytes.

SHA-256: 85360c12dae2e56988e12f94056332555d09bd9f20cfb95328652bd2c12fd88c.

This identifies the tested local candidate. CI ZIP metadata can differ. The previous exact-package reports remain in [0.4.2 release readiness](release-readiness-042.md#artifact), [0.4.1](release-readiness-041.md#artifact), [0.4.0](release-readiness-040.md#artifact), [0.3.7](release-readiness-037.md#artifact), [0.3.6](release-readiness-036.md#artifact) and [0.3.5](release-readiness-035.md#artifact).

## Remaining gates

1. Install 0.4.3 the ordinary way and use it on Reels and TikTok with a wheel or trackpad, and see a live Instagram ad skip and the sound there.
2. Ordinary human day-use, and a long TikTok, Instagram and YouTube run on 0.4.3.
3. Update the listing only to match verified support. Store submission remains an owner decision.
