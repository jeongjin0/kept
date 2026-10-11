# Release readiness · 0.4.2

Checked on 2026-10-11 KST, macOS ARM64. This candidate changes how ScrollPlus moves on from a video on TikTok: while TikTok keeps its Next control disabled (until it has the next video) it presses nothing and looks again every 50 ms, it waits 100 ms after the previous move and 150 ms after the video arrived instead of 450 ms, and it looks at the feed when it scrolls and when it stops. On all three sites a missing player counts as leaving the feed only after 300 ms, and a skip that follows a skip changes the words of the chip in place. TikTok's sound is left alone on purpose. Instagram Reels and YouTube Shorts keep their waits and their sound. Rules, presets, defaults, popup, options and permissions are unchanged. Chrome Web Store submission has not occurred; SPEC.md says not to submit it.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | npm run compile |
| Unit tests | 75 passed | npm test; adds eight engine tests: the settle time is counted from the arrival of a video, a video passed over before it has settled is left, a site that cannot move yet is waited for and pressed within 50 ms of being ready, given up 5 s after the video opened, not pressed past a video the person left or while they type, and Undo stays available while the next skip waits |
| Built-script browser tests | 49 passed | npm run test:e2e; adds eight routed TikTok tests (a disabled Next control is waited for, the pace of skips in a row, the sound is never touched, a control that never opens is given up, one chip for a row of skips, Undo while a skip waits, no press past a video the person scrolled to, and the pause after six skips when the player is missing between videos). Five of the eight fail on the 0.4.1 build; the other three guard behaviour that was not wrong before |
| Live TikTok For You | Pass for the stated scope | The packaged build, byte for byte, in fresh signed-out profiles on real TikTok at 1280×800: 100 skipped videos at the 20,000-like bar (four 75 s runs), 33 at the default bar (three runs) and 126 at 100,000 (two runs). On screen for 0.48 s on average at 20,000 likes against 1.03 s for 0.4.1 (90 videos); 4% of the skipped videos stayed over 1 s against 21%; the press followed a median 11 ms after TikTok offered its Next control against 1.63 s. No video at or above the bar was moved on from, in either build. The only page error was TikTok's own "a.init is not a function", which also appears in runs without the extension. See [skip timing on TikTok](skip-timing-tiktok.md) |
| TikTok sound | Left alone | A test build that muted the skipped video made TikTok start later videos muted in 3 of 4 runs, kept videos too, and TikTok stored the mute in localStorage in script-only runs; see [the sound section](skip-timing-tiktok.md#sound) |
| Live YouTube Shorts | Spot check pass | The packaged build in a fresh signed-out profile, 3 minutes at the default bar: 13 skips, 0.50 s on screen on average (0.52 s on 0.4.1), ScrollPlus decided within 2 ms (median), no press the site ignored, no page errors, and all 68 kept Shorts sampled were playing unmuted one second after arriving. This checks that the shared engine and chip changes left YouTube's pace alone; it is not a new YouTube measurement |
| Minimum Chrome 120 | 49 passed on Linux | [PR CI](https://github.com/jeongjin0/scrollplus/actions/runs/38137782915) on the final code commit; official Chrome for Testing 120.0.6099.109, actual built scripts on controlled fixtures. The same run passed 75 unit tests and the current-Chrome suite (49 passed) |
| Package | Pass | npm run zip and node scripts/check-package.mjs; MV3, Chrome 120+, storage and the existing three host permissions |
| Package scope | The shared bundle, the TikTok bundles and the manifest version changed | The YouTube and Instagram bundles carry the shared engine and controller, whose behaviour on those sites differs only by the 300 ms before a missing player counts as leaving the feed and by the chip changing its words in place. Locale files, popup and options pages are unchanged apart from the version |
| Native signed-in TikTok / Instagram | Not repeated on 0.4.2 | Not observed live for this change. Earlier [signed-in QA](signed-in-smoke.md) stays scoped to its packages |
| Instagram Reels pacing | Not measured | Signed out, /reels/ redirects to the login page and no signed-in browser was available. Reels keeps its 450 ms wait and its sound |
| Long feed | Not run on 0.4.2 | The runs above were 75 seconds each. The last 24-hour run was 0.3.5; see the [long feed report](soak.md) |
| Chrome Web Store | Not submitted | [Submission checklist](../store/submission-checklist.md) is unchanged |

## Artifact

scrollplus-0.4.2-chrome.zip, 129,545 bytes.

SHA-256: d4e81299d10c32557fd4daed28ca5b3157eaed245f74481109b89aa666ba0721.

This identifies the tested local candidate. CI ZIP metadata can differ. The previous exact-package reports remain in [0.4.1 release readiness](release-readiness-041.md#artifact), [0.4.0](release-readiness-040.md#artifact), [0.3.7](release-readiness-037.md#artifact), [0.3.6](release-readiness-036.md#artifact) and [0.3.5](release-readiness-035.md#artifact).

## Remaining gates

1. Measure Instagram Reels and see a live skip, an ad skip and the sound there; Reels needs a signed-in session. See a live signed-in TikTok skip with the 0.4.2 bundles.
2. Ordinary human day-use, and a long TikTok and YouTube run on 0.4.2.
3. Update the listing only to match verified support. Store submission remains an owner decision.
