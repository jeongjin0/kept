# Chrome Web Store submission checklist

Nothing here has been submitted. This is what to have ready when the owner decides to publish.

## Before you start

- A Chrome Web Store developer account (one-time registration fee).
- The public store search for [ScrollPlus](https://chromewebstore.google.com/search/scrollplus) showed no results on 2026-10-07. Recheck before submission; this is not a trademark clearance.
- Review the scoped [signed-in Instagram and TikTok results](../qa/signed-in-smoke.md) and finish the remaining gates in [release-readiness.md](../qa/release-readiness.md).
- Install the zip on a clean Chrome profile and use it for a day on your own feed.

## Package

- Upload `scrollplus-<version>-chrome.zip` (`npm run zip`, also attached to the GitHub release).
- Manifest version 3, permissions `storage` only, host permissions for youtube.com, tiktok.com, and instagram.com.

## Store listing

- Title, summary, description, single purpose: [listing.md](listing.md), English and Korean.
- Icon: `public/icon/128.png`.
- Screenshots, 1280 by 800: `store/screenshots/` (English), `store/screenshots/ko/` (Korean).
- Small promo tile, 440 by 280: `store/tile.png` (English), `store/tile-ko.png` (Korean).
- Optional marquee, 1400 by 560: `store/marquee.png`, `store/marquee-ko.png`.
- Promo images are not locale-specific in the store. Choose the English or Korean variant for the primary listing; screenshots can be localized.
- Image dimensions and promo localization follow [Chrome's image guidance](https://developer.chrome.com/docs/webstore/images).
- Category: Social & Communication is the closest fit.
- Privacy policy URL: https://github.com/jeongjin0/scrollplus/blob/main/PRIVACY.md
- Support URL: https://github.com/jeongjin0/scrollplus/issues
- Website: https://github.com/jeongjin0/scrollplus

## Privacy practices tab

- Single purpose: skip YouTube Shorts, TikTok videos, and Instagram Reels the user does not want to see: those with too few likes and ads (Skip ads is a switch that is on by default). It uses counts and ad markers already on the page.
- `storage` justification: saves the user's settings (rule, site switches, creators to keep), today's skip count and an all-time total (how many skips, and for how long those videos were on screen, which gives the estimate of time saved) on their device. It also keeps the video IDs the user chooses to Undo only in memory for the current browser session, so those choices survive reloads and new tabs. Temporary Undo choices clear on browser restart, extension reload/update/disable, or Reset to defaults; they are not written to disk.
- Host permission justification: on these three sites only, the extension reads the like, comment, and view counts and the ad markers the page has already loaded, and presses the page's own next-video control to skip a video or, while Skip ads is on, an ad. It does not call any site API of its own.
- Remote code: none. All code ships in the package.
- Data collected: none. The extension does not collect, transmit, or sell user data, so leave every data-collection box unchecked.
- Certify that data is not sold, not used for unrelated purposes, and not used for creditworthiness or lending.

## After approval

- Add the store link to the README and the repo description.
- Move `store/` copy changes through pull requests like any other change.
