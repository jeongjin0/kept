# Release readiness · 0.5.1

Checked on 2026-10-12 KST, macOS ARM64. This candidate keeps a TikTok video when the page already says the viewer follows that creator. The switch is on by default, in Settings, and it shows the TikTok icon because YouTube and Instagram are not read. Skip ads still skips an ad, including one from a followed creator. A missing relationship is judged by likes. No follow list is stored. Permissions are unchanged. Chrome Web Store submission has not occurred.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | npm run compile, and tsc --noEmit |
| Unit tests | 107 passed | npm test. New cases: relation 0, 1, 2, 3, a missing value and an unknown number; a followed creator is kept with or without counts and on a grid; their ad is still skipped; the switch off falls through to likes; a missing keepFollowed reads as on, and only a real false turns it off; a 0.4.x move leaves the switch on |
| Built-script browser tests | 64 passed | npx playwright test. New: a routed TikTok feed keeps relation 1, skips relation 2, keeps relation 3, and with the switch off skips those low-like videos through to one that passes the like bar. The settings page shows the switch on, and Reset turns it back on |
| Fresh install and update from 0.5.0 | Pass, by the rule | A missing keepFollowed reads as on. Schema stays 2, so the 0.4.x move does not run again. Not tried by installing 0.5.0 and then 0.5.1 in a browser profile |
| Popup and settings page | Looked at | English at a wide window and Korean at 420 px. The new row sits under Skip ads, on, with the TikTok mark. Popup height stays 426 px. Store options images were rendered again |
| Live signed-in TikTok | Not observed | The only capture is signed out, and both authors had relation 0. The values 1 and 3 are the published meaning of that field, not something seen on an account that follows someone. See [follow](follow.md) |
| YouTube and Instagram | Not covered | Signed-out YouTube had no subscribed boolean. Signed-out Instagram redirects to login |
| Package | Pass | npm run zip and node scripts/check-package.mjs. scrollplus-0.5.1-chrome.zip, 138,387 bytes. MV3, Chrome 120+, storage, the same three hosts. Both locales have the same keys |
| Minimum Chrome 120 | Pass | [CI](https://github.com/jeongjin0/scrollplus/actions/runs/38224357106) and [CI](https://github.com/jeongjin0/scrollplus/actions/runs/38224340908), both on the 0.5.1 commit. Chrome for Testing 120 and current Chromium. |
| Chrome Web Store | Not submitted | Owner decision |

## Remaining gates

1. On a signed-in TikTok, confirm a creator you follow arrives with relation 1 (or 3 if they follow you back), and that a low-like video from them stays while one from someone else is skipped.
2. YouTube subscriptions and Instagram follows are not kept yet.
3. The gates of 0.5.0 stand: install over 0.4.4 in the owner's browser, the chip on Reels, wheel or trackpad scrolling, a live Instagram ad, and ordinary day-long use.

## Artifact

scrollplus-0.5.1-chrome.zip, 138,387 bytes, from this worktree before review.

SHA-256: d96b700e96dcef6823c7ec9469a9c85fa52d3c9f664a8ef25460513b948a3b36.

This identifies the tested local candidate. CI ZIP metadata can differ. The 0.5.0 report is in [release readiness 0.5.0](release-readiness-050.md).
