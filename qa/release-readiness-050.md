# Release readiness · 0.5.0

Checked on 2026-10-12 KST, macOS ARM64. This candidate changes defaults and the extension's own look, and how it reports a skip, not how a video is judged or skipped. The presets are 100, 500 and 1,000 likes (they were 1,000, 5,000 and 20,000). Skip ads is on from the start. The skip chip sits at the top of the video with a new look and a position setting. The popup and Settings show an estimate of the time the skips have saved. A 0.4.x install is moved to the new scale once, by name. Permissions are unchanged. Chrome Web Store submission has not occurred; SPEC.md says not to submit it.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | npm run compile |
| Unit tests | 103 passed | npm test; 28 new: the presets, the move of 0.4.x settings (by name, a rule of the person's own stays, spare minimums kept, Skip ads on once, 0.1.x words, never a second time), install, update and counting against a stand-in for chrome.storage.local, the time-saved arithmetic and its formats in English and Korean, the time on screen the engine reports with each skip (also when the next video arrives while the site is still moving) |
| Built-script browser tests | 63 passed | npm run test:e2e; 9 new: a fresh profile skips under 500 likes and skips ads; the time saved in the popup and in Settings in English and Korean, moving with a new skip; the chip's position setting and Reset; an update from a 0.4.4 profile on a real profile that is closed and opened again (Lenient 1,000 becomes Lenient 100, Skip ads on, creators kept, totals started; then a Strict chosen afterwards, which is 1,000 and was Lenient's number, survives the next restart); the chip centred on the video at 18%, 50% and 28% up from the bottom, and inside a 360 px window; Skip ads tests for the new default on all three sites (an ad is skipped and Undo brings it back; an ad stays while the switch is off). The tests of 0.4.4 that depended on 5,000, 20,000 or Skip ads off were rewritten for the new numbers |
| Update from 0.4.4 | Pass | The browser test above, and the unit tests. Not tried on a profile that had run 0.4.4 for days |
| Fresh install | Pass | Storage holds settings, schema 2, dailySkips and totalSkips; Balanced is 500 likes, Skip ads is on, the chip is at the top (also seen in the live runs below) |
| Popup and settings page | Pass | scripts/capture-ui.mjs in English and Korean: the popup is 426 px high at 1x and 2x (it was 406) and does not scroll, the settings page has no horizontal overflow at 360 px, no page errors. The store images were rendered again from the real pages |
| Live YouTube Shorts | Pass | The built 0.5.0 in a fresh signed-out Chromium profile, defaults except a 20,000-like bar, 120 s: 28 skips, 27 chip texts, 9 of the chips "Skipped · ad" (Skip ads is on by default). Every chip was centred on the video's column (x 792) and 140 px from the top. Average time on screen of a skipped Short 529 ms. An earlier 0.5.0 build, 150 s: 44 skips, 5 ads. Details in [time saved](time-saved.md) |
| Live TikTok For You | Pass | Same set-up, 90 s and 45 s with the final code: 25 and 29 skips, average time on screen 428 and 603 ms, every chip centred on the video's column and 140 px from the top (the column's centre is 720 or 724 px, depending on the session, and the chip followed it). One TikTok page error in one run ("a.init is not a function"); the extension's bundles contain no such call and no other run showed one |
| The chip's look and place | Looked at | On real frames, a bright YouTube Short and a dark TikTok video, at six positions and seven looks; see [the chip report](chip-position.md) and its [sheet](screenshots/chip-positions.png). Middle and Lower were also seen live on YouTube |
| Instagram Reels | Not observed | Signed out it redirects to the login page. The chip is placed through the same lookup of the video on screen, and the time on screen is reported the same way; neither was seen on the site. Reels skipping is as 0.4.3 measured it |
| Ad detection on TikTok and Instagram | Controlled pages only | Unchanged from 0.4.x. Skip ads is on by default now, so these two sites' own ad flags matter more: they were checked on routed pages and on 0.4.x live in YouTube only ([ads](ads.md)); the Instagram test account showed no ad in 621 reels |
| Settings from chrome://extensions in a real Chrome | Not observed | Carried over from 0.4.4: the test calls openOptionsPage from the popup page; the extension card's own link was not tried |
| Minimum Chrome 120 | 63 passed on Linux | [PR CI](https://github.com/jeongjin0/scrollplus/actions/runs/38215623957) on the final code commit; official Chrome for Testing 120.0.6099.109, actual built scripts on controlled fixtures. The same run passed the typecheck, 103 unit tests and the current-Chrome suite (63 passed on Chrome for Testing 153) |
| Package | Pass | npm run zip and node scripts/check-package.mjs; MV3, Chrome 120+, storage and the existing three host permissions; both locales have the same keys |
| Package scope | Pages, background, chip and locales changed | Against the 0.4.4 package: manifest.json (version), both locale files (new strings, the privacy line), the stylesheet and the popup, options and shared chunks (new file names), background.js (the counting and the move of old settings), and the three isolated content scripts (the chip, and the time on screen that goes with each skip). The three main-world scripts, which read the sites' data, are byte for byte those of 0.4.4 |
| Chrome Web Store | Not submitted | [Submission checklist](../store/submission-checklist.md) now says the extension also keeps an all-time total |

## Artifact

scrollplus-0.5.0-chrome.zip, 137,568 bytes.

SHA-256: 29d87ca1470fe9a8e622d41a8e89586d8ef3aaa541a5a0013db688aefb8ef93f.

This identifies the tested local candidate. CI ZIP metadata can differ. The previous exact-package reports remain in [0.4.4 release readiness](release-readiness-044.md#artifact), [0.4.3](release-readiness-043.md#artifact), [0.4.2](release-readiness-042.md#artifact), [0.4.1](release-readiness-041.md#artifact), [0.4.0](release-readiness-040.md#artifact), [0.3.7](release-readiness-037.md#artifact), [0.3.6](release-readiness-036.md#artifact) and [0.3.5](release-readiness-035.md#artifact).

## Remaining gates

1. Install 0.5.0 over 0.4.4 in the owner's browser (replace the folder's files, Reload the card) and confirm Balanced reads 500, Skip ads is on, and the chip is easy to see on the feeds in everyday use, including Instagram Reels, where it was not seen.
2. Whether 3 seconds is a fair figure for the person using it is not something a test can say. The estimate is labelled as one.
3. The gates of 0.4.3 stand: Instagram Reels and TikTok with a wheel or trackpad, a live Instagram ad skip and the sound there, ordinary human day-use, and a long run on each site.
4. Update the listing only to match verified support. Store submission remains an owner decision.
