# Release readiness · 0.5.3

Checked on 2026-10-12 KST, macOS ARM64. This pass hardens the subscribe and follow reading and cuts repeated work on YouTube. The popup and settings look are unchanged. Permissions are unchanged. Chrome Web Store submission has not occurred.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | tsc --noEmit |
| Unit tests | 110 passed | npm test. Added labels: Subscribed to a channel, 구독중 inside a short label, subscribers ignored, Following creator, Unfollow |
| Built-script browser tests | 66 passed | npx playwright test, including the YouTube, TikTok and Instagram keep-followed routes |
| Popup and settings | Looked at | Korean and English popup, 426 px, no scroll. Settings at 1440 px and 420 px. The follow row fits at 420 px. See [ui review](ui-review.md) |
| Live chip | Looked at | Signed-out YouTube Shorts, built extension, one skip chip "넘김 · 광고" centred on the video. Not a signed-in follow check |
| Package | Pass | npm run zip and node scripts/check-package.mjs. scrollplus-0.5.3-chrome.zip, 139,866 bytes |
| Minimum Chrome 120 | Pending CI | The pull request runs the suite on Chrome 120 |
| Chrome Web Store | Not submitted | Owner decision |

## Artifact

scrollplus-0.5.3-chrome.zip, 139,866 bytes.

SHA-256: ebe3c03548e8f9b76b51f06def5072a911b24698a48ea7f1ac5472dd45d038e2.

The 0.5.2 report is in [release readiness 0.5.2](release-readiness-052.md).

## Remaining gates

1. On a signed-in YouTube, TikTok and Instagram, confirm a subscribed or followed creator stays under the like bar.
2. The earlier gates stand: a full day of human use, a live Instagram ad, and wheel or trackpad scrolling.
