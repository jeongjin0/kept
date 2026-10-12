# Release readiness · 0.5.2

Checked on 2026-10-12 KST, macOS ARM64. Keep accounts I follow now covers YouTube Shorts and Instagram Reels as well as TikTok. A video stays, even under the like bar, when the page already says the viewer subscribes or follows. An ad is still skipped when Skip ads is on. A missing answer is judged by likes. No follow list is stored. Permissions are unchanged. Chrome Web Store submission has not occurred.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | tsc --noEmit |
| Unit tests | 110 passed | npm test. New: YouTube subscription entity, the older subscribed flag, a signed-out button with no flag, two videos in one document left unknown, Instagram friendship_status, and the English and Korean button labels |
| Built-script browser tests | 66 passed | npx playwright test. New: a routed YouTube Short with subscribed true stays and the next unsubscribed low-like Short is skipped; a routed Reel with following true stays and the next unfollowed low-like Reel is skipped. The TikTok cases from 0.5.1 still pass |
| Popup and settings page | Unchanged height | The settings row no longer carries a TikTok icon, because all three sites are read. Popup height was not remeasured; the popup itself did not change |
| Live signed-in pages | Not observed | The Chrome window on this machine was signed out of YouTube, TikTok and Instagram. YouTube Shorts showed a 구독 button and a login link. Instagram Reels redirected to the login page. The signed-in shapes are exercised on controlled pages. See [follow](follow.md) |
| Package | Pass | npm run zip and node scripts/check-package.mjs. scrollplus-0.5.2-chrome.zip, 139,691 bytes. MV3, Chrome 120+, storage, the same three hosts |
| Minimum Chrome 120 | Pending CI | The pull request runs the suite on Chrome 120 |
| Chrome Web Store | Not submitted | Owner decision |

## Artifact

scrollplus-0.5.2-chrome.zip, 139,691 bytes, from this worktree before review.

SHA-256: 817ef82c28701c69eab6eeb1b581bc973cb3e1a787b158364d484d7e32ac156b.

This identifies the tested local candidate. CI ZIP metadata can differ. The 0.5.1 report is in [release readiness 0.5.1](release-readiness-051.md).

## Remaining gates

1. On a signed-in YouTube, TikTok and Instagram, confirm a channel you subscribe to and an account you follow stays under the like bar, and one you do not is still skipped.
2. The gates of 0.5.0 stand: install over an older build in the owner's browser, the chip on Reels, wheel or trackpad scrolling, a live Instagram ad, and ordinary day-long use.
