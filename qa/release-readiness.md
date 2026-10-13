# Release readiness · 0.7.0

Checked on 2026-10-13 KST, macOS ARM64. This candidate moves the skip chip off the video and changes what it shows for a row of skips. It does not change how a video is judged or skipped. The settings schema marker is 3, and an install that had the chip at the top is moved to the side once. Permissions are unchanged. Chrome Web Store submission has not occurred.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | tsc --noEmit |
| Unit tests | 116 passed | npm test. The row of skips lists up to three reasons, newest first; it starts over after the chip has gone, and one skip has no row. Also covers migrating the top position to the side, preserving middle/lower choices, schema 3, and install settings. |
| Built-script browser tests | 66 passed in CI | npx playwright test on both PR runs. Covers the side chip by default, the centred position, first and subsequent skips, the narrow-window pill, pause state, and no-room fallback. Local full-suite runs had intermittent failures in different browser tests; each passed on retry, and both clean CI runs passed all 66. |
| The chip on real sites | Looked at | Signed-out YouTube Shorts (a card with three skips, left of the video, centred), TikTok (a card with four skips, left of the video, clear of the site's menu) and YouTube in a 760 px window (a pill with the count and Undo). See [chip beside the video](chip-beside.md) |
| Popup and settings | Looked at | Popup 426 px high, no scroll. Settings has four position choices and fits at 420 px |
| Store images | Looked at | The chip image shows the card beside the video. Rendered again |
| Package | Pass | npm run zip and node scripts/check-package.mjs. scrollplus-0.7.0-chrome.zip, 148,165 bytes |
| Minimum Chrome 120 | Pass | [CI run 38350164245](https://github.com/jeongjin0/scrollplus/actions/runs/38350164245) and [CI run 38350167995](https://github.com/jeongjin0/scrollplus/actions/runs/38350167995); both Chrome 120 checks passed |
| Chrome Web Store | Not submitted | Owner decision |

## Artifact

scrollplus-0.7.0-chrome.zip, 148,165 bytes.

The 0.6.0 report is in [release readiness 0.6.0](release-readiness-060.md).

## Remaining gates

1. A signed-in feed. The card was seen beside the video on two signed-out feeds and one narrow window; a signed-in page may put something in the margin (a comments panel opens on the right of YouTube Shorts).
2. Instagram Reels was not seen with the card. Signed out it redirects to the login page. The placement uses only the video's box and what is under the card's nine points.
3. Undo on a row of skips still moves back one video, the newest. Undoing a whole row was not built. The compact pill count is capped at three.
