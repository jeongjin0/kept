# Chrome Web Store submission checklist

The owner chose an initial review submission on 2026-10-14, accepting the disclosed live-QA limitations. This checklist distinguishes preparation, review submission and later manual publication.

## Before you start

- A Chrome Web Store developer account (one-time registration fee).
- Verified publisher/contact details and the required 2-Step Verification. Check these in the selected publisher account; a general Google login is not evidence of completed publisher registration.
- The public store search for [ScrollPlus](https://chromewebstore.google.com/search/scrollplus) showed no results on 2026-10-07. Recheck before submission; this is not a trademark clearance.
- Review the scoped [signed-in Instagram and TikTok results](../qa/signed-in-smoke.md) and [release-readiness.md](../qa/release-readiness.md). Current signed-in Reels/follow positive paths and ordinary day-use remain unverified; the owner elected first review before those broader-release checks. Keep Reels experimental and do not claim the open cases have passed.
- Install the exact candidate ZIP on a clean Chrome profile. Record low-like skip, passing-video keep, Undo/reload, followed/subscribed keep, ads and background-tab return separately. The owner accepted the remaining current signed-in/follow and ordinary-use gaps for first review; they remain checks before wider promotion. Instagram remains experimental until its current signed-in paths are observed.
- A day of ordinary use is recommended before broad promotion. Longer runs and a small manual-feedback beta follow the initial release; an older build's soak does not certify the candidate.
- Follow [ROADMAP.md](../ROADMAP.md) for the scoped launch sequence. Domain purchase, website publication and Store publication remain owner decisions. Initial review submission was requested; approval must not automatically publish the item.

## Package

- Upload the exact checked `scrollplus-<version>-chrome.zip` from `npm run zip`. A GitHub release is a separate publication step; preparing this review candidate does not publish one.
- Manifest version 3, permissions `storage` only, host permissions for youtube.com, tiktok.com, and instagram.com.

## Store listing

- Title, summary, description, single purpose: [listing.md](listing.md), English and Korean.
- Icon: `public/icon/128.png`.
- Screenshots, 1280 by 800: `store/screenshots/` (English), `store/screenshots/ko/` (Korean).
- Small promo tile, 440 by 280: `store/tile.png` (English), `store/tile-ko.png` (Korean).
- Optional marquee, 1400 by 560: `store/marquee.png`, `store/marquee-ko.png`.
- Promo images are not locale-specific in the store. Choose the English or Korean variant for the primary listing; screenshots can be localized.
- Image dimensions and promo localization follow [Chrome's image guidance](https://developer.chrome.com/docs/webstore/images).
- Category: Social Networking (the current dashboard's category for these social video sites).
- Privacy policy URL: https://github.com/jeongjin0/scrollplus/blob/main/PRIVACY.md
- Support URL: https://github.com/jeongjin0/scrollplus/issues
- Website: https://github.com/jeongjin0/scrollplus

## Privacy practices tab

- Single purpose: skip short videos below the user's chosen count thresholds and site-disclosed ads, with Undo and an option to retain followed creators. It uses page data already loaded on the three supported sites.
- `storage` justification: saves the user's settings (rule, site switches, creators to keep), today's skip count and an all-time total (how many skips, and for how long those videos were on screen, which gives the estimate of time saved) on their device. It also keeps the video IDs the user chooses to Undo only in memory for the current browser session, so those choices survive reloads and new tabs. Temporary Undo choices clear on browser restart, extension reload/update/disable, or Reset to defaults; they are not written to disk.
- Host permission justification: on these three sites only, the extension reads video/creator identifiers, counts, ad markers and subscription/follow signals the page has already loaded, and presses the site's own next/previous controls for skip and Undo. It does not call any site API of its own.
- Remote code: none. All code ships in the package.
- Data handling: do not automatically leave all boxes unchecked just because nothing is transmitted. Google requires disclosure of locally processed/stored data too ([User Data FAQ, questions 3 and 14](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)). The 2026-10-13 draft declares Personally identifiable information for public creator usernames/handles and IDs, Web history for the supported active-video URL and temporary Undo video references, User activity for interaction state and aggregate skip/time counts, and Website content for page-loaded identifiers, metrics and ad/follow signals. These are the draft's mapping of the inspected dashboard definitions to existing behavior, not a claim that Google has approved the categories. All processing/storage stays on device; no data is transmitted to the developer or a third party. It does not read credentials, payment details, private communications or location, and does not record typed text or a complete browsing history. Recheck the declarations against the final package and policy before submission.
- Certify that data is not sold, not used for unrelated purposes, and not used for creditworthiness or lending.
- The privacy policy must explicitly describe the page-memory cache, local/session storage, retention/removal and Limited Use. Use a publicly reachable policy URL; a custom domain is not a prerequisite for preparing the submission.

## Distribution recommendation

- Start with one unlisted item so testers can install from a direct Store link. Unlisted still undergoes the same review and policy requirements as public/private ([distribution guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)).
- Defer automatic publication after approval so the owner can review the approved listing first. Approved staged submissions have a 30-day publication window ([publication guidance](https://developer.chrome.com/docs/webstore/publish)).
- Use the same item for the later public rollout. Create a separate beta item only if parallel channels become necessary, and then follow Google's beta naming rules.
- Prepare exact-version test instructions for the three sites. If a sign-in is needed, explain it without publishing the owner's credentials or using them as reviewer credentials.

## After approval

- Add the store link to the README and the repo description.
- Move `store/` copy changes through pull requests like any other change.
