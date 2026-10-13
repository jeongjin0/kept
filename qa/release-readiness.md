# Release readiness · 0.7.0

Checked on 2026-10-13 KST, macOS ARM64. This candidate moves the skip chip off the video and changes what it shows for a row of skips. It does not change how a video is judged or skipped. The settings schema marker is 3, and an install that had the chip at the top is moved to the side once. Permissions are unchanged. Chrome Web Store submission has not occurred.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | tsc --noEmit |
| Unit tests | 116 passed | npm test. New: a row of skips is listed newest first and at most four, it starts over after the chip has gone, one skip has no row; the move of the top to the side (schema 2 to 3), a middle or lower place that stays, nothing moved from schema 3, and the install path |
| Built-script browser tests | 66 run | npx playwright test. New: the chip is beside the video by default, 16 px from its left edge and centred on it, with the first skip alone and the second adding a line; the pill when little room is left; the pause chip and a window with no room go over the video. A TikTok test was changed to read the rows. Run in full and not against CI yet: 63 passed on the first full local run, the failures were four different tests that changed from run to run and each passed when run again |
| The chip on real sites | Looked at | Signed-out YouTube Shorts (a card with three skips, left of the video, centred), TikTok (a card with four skips, left of the video, clear of the site's menu) and YouTube in a 760 px window (a pill with the count and Undo). See [chip beside the video](chip-beside.md) |
| Popup and settings | Looked at | Popup 426 px high, no scroll. Settings has four position choices and fits at 420 px |
| Store images | Looked at | The chip image shows the card beside the video. Rendered again |
| Package | Pass | npm run zip and node scripts/check-package.mjs. scrollplus-0.7.0-chrome.zip, 148,165 bytes |
| Minimum Chrome 120 | Pending CI | The pull request runs the suite on Chrome 120 |
| Chrome Web Store | Not submitted | Owner decision |

## Artifact

scrollplus-0.7.0-chrome.zip, 148,165 bytes.

The 0.6.0 report is in [release readiness 0.6.0](release-readiness-060.md).

## Remaining gates

1. A signed-in feed. The card was seen beside the video on two signed-out feeds and one narrow window; a signed-in page may put something in the margin (a comments panel opens on the right of YouTube Shorts).
2. Instagram Reels was not seen with the card. Signed out it redirects to the login page. The placement uses only the video's box and what is under the card's nine points.
3. Undo on a row of skips still moves back one video, the newest. Undoing a whole row was not built.
