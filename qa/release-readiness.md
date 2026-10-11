# Release readiness · 0.4.1

Checked on 2026-10-11 KST, macOS ARM64. This candidate changes how ScrollPlus moves on from a Short on YouTube only: the next skip follows 150 ms after the move instead of 450 ms and a Short that arrives while a move is being confirmed is judged at once, a press the site did not act on is pressed again after 0.7 s instead of 2 s, and the Short being skipped is muted until the move ends. Rules, presets, defaults, UI and permissions are unchanged. TikTok and Instagram keep the 450 ms wait. Chrome Web Store submission has not occurred; SPEC.md says not to submit it.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | npm run compile |
| Unit tests | 67 passed | npm test; adds six engine tests (the default 450 ms wait, no wait, a video that arrives while a move is still being confirmed, and the six-skip pause without a wait). Four of them fail on the 0.4.0 engine |
| Built-script browser tests | 41 passed | npm run test:e2e; adds six routed-page YouTube tests: no old wait between skips, a press the site never acts on is pressed again once, a move that has started is never pressed again, a Short is quiet while skipped, a player the person muted stays muted, and a skip that never happens puts the sound back. One earlier full run failed the existing YouTube Skip ads Undo test once (its chip is on offer for 2.5 s); it passed in the ten runs after that, including six in parallel and three full suites |
| Live YouTube Shorts | Pass | The final 0.4.1 build in fresh signed-out profiles on real Shorts, 10 minutes at a strict bar and 10 at the default bar: 236 skips, a skipped Short on screen 0.52 s and 0.54 s on average, no page errors, and all 427 kept Shorts sampled were playing unmuted one second after arriving. Four skips took over 1 s: three presses the site ignored while it had one Short left moved after the second or third press (1.04–1.47 s), and the first Short after a page load took 2.14 s, as it does on 0.4.0. See [skip timing](skip-timing.md) |
| Skips in a row | Faster on YouTube | A Short that follows another skip: 0.79 s on 0.4.0 against 0.51 s, 20 live minutes each at the strict bar (154 and 201 such skips; the 0.4.1 run was a candidate without the repeated press and the mute). The first skip of a row stays at 0.52 s, which is YouTube's own pace |
| Minimum Chrome 120 | @@CI@@ | |
| Package | Pass | npm run zip and node scripts/check-package.mjs; MV3, Chrome 120+, storage and the existing three host permissions |
| Package scope | The three content bundles and the manifest changed | The YouTube bundle carries the new wait, the repeated press and the mute. The TikTok and Instagram bundles carry the shared engine and move helper, whose behaviour on those sites is the same except that a video that arrives while a move is being confirmed is judged when the move is confirmed instead of at the next poll, inside the same 450 ms wait. Locale files, popup and options pages are unchanged apart from the version |
| Native signed-in TikTok / Instagram | Not repeated on 0.4.1 | Not observed live for this change. Earlier [signed-in QA](signed-in-smoke.md) stays scoped to its packages |
| Long feed | Not run on 0.4.1 | Beyond the 20 live minutes above (236 skips). The last 24-hour run was 0.3.5; see the [long feed report](soak.md) |
| Chrome Web Store | Not submitted | [Submission checklist](../store/submission-checklist.md) is unchanged |

## Artifact

scrollplus-0.4.1-chrome.zip, 128,472 bytes.

SHA-256: 694fc07a3fc571c8b5b4469a56a8d923f34aef131ef394badeaf71f3b727556f.

This identifies the tested local candidate. CI ZIP metadata can differ. The previous exact-package reports remain in [0.4.0 release readiness](release-readiness-040.md#artifact), [0.3.7](release-readiness-037.md#artifact), [0.3.6](release-readiness-036.md#artifact) and [0.3.5](release-readiness-035.md#artifact).

## Remaining gates

1. See a live TikTok and Instagram skip with the 0.4.1 bundles, and a live ad skip on both. TikTok and Instagram need signed-in sessions.
2. Ordinary human day-use, and a long YouTube run on 0.4.1. The paced runs here were 10 to 20 minutes each.
3. Update the listing only to match verified support. Store submission remains an owner decision.
