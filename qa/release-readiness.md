# Release readiness · 0.6.0

Checked on 2026-10-13 KST, macOS ARM64. This candidate changes the look only: the accent is a calm teal (#59C5BF) in place of the orange-red, the surfaces, text and borders take its hue, and the mark is three streaks behind a play triangle in place of the door. How a video is judged and skipped is unchanged. Settings, storage and permissions are unchanged. Chrome Web Store submission has not occurred.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | tsc --noEmit |
| Unit tests | 110 passed | npm test |
| Built-script browser tests | 66 run, flaky starts only | npx playwright test: 63 passed and 3 failed on the first run, and every failure was the browser failing to start with the extension or a timeout while the machine was busy. The three, run again, passed (two as part of their spec files, one alone). CI runs them on a clean machine |
| Popup and settings page | Looked at | Korean and English popup, 426 px, no scroll. Settings at 1440 px and 420 px. See [ui review](ui-review.md) |
| Live skip chip | Looked at | Signed-out YouTube Shorts, built extension, one skip chip with the new dot, centred on the video, readable over a bright title card |
| Toolbar icon and store images | Looked at | public/icon 16, 32, 48 and 128 and the store images were rendered again from the new mark and colors |
| Color | Studied | Nine hues at one lightness and chroma, [color study](color-study.md) |
| Package | Pass | npm run zip and node scripts/check-package.mjs. scrollplus-0.6.0-chrome.zip, 145,128 bytes |
| Minimum Chrome 120 | Pending CI | The pull request runs the suite on Chrome 120. The new tile gradient uses color-mix, available from Chrome 111 |
| Chrome Web Store | Not submitted | Owner decision |

## Artifact

scrollplus-0.6.0-chrome.zip, 145,128 bytes.

SHA-256: 3043203158f358bf18ba499d68803d0c35f23f5627d69c08c918425837ee4f08.

The 0.5.3 report is in [release readiness 0.5.3](release-readiness-053.md).

## Remaining gates

1. The owner picks the hue. Teal is a recommendation from nine candidates, and the hue is one set of CSS variables.
2. The chip over many kinds of video, and the accent on other displays, were not checked.
3. The gates of 0.5.x stand: a signed-in check of subscribe and follow, a full day of use, a live Instagram ad.
