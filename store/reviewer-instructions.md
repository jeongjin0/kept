# Draft Chrome Web Store test instructions

Prepared 2026-10-14 for the 0.7.3 first-review candidate. ZIP SHA-256: `054ca73645ae9811efc8a4ec7cbc63cc966613cb7a7187ceb791e121c6a48ecc`. This document is not evidence that the current live cases have all passed. If the candidate package changes before submission, replace the version/hash and verify the new package's live paths.

The dashboard's Additional instructions field is limited to 500 characters. The draft uses the following 367-character summary, with this document providing the full steps. Reviewer username/password fields are blank because ScrollPlus has no account system; do not provide the owner's site credentials.

> Chrome 120+. No ScrollPlus login. Defaults: 500 likes, ads/follow exceptions on. Open YouTube Shorts or TikTok; Reels needs your own Instagram login. Raise Likes above a visible count to trigger a skip. Undo, then reload: the restored video stays. Reset clears Undo choices. Full steps: https://github.com/jeongjin0/scrollplus/blob/main/store/reviewer-instructions.md

## Setup

Use desktop Chrome 120 or later. Install the submitted package. The extension is already enabled: Balanced minimum 500 likes, Skip ads on, Keep accounts I follow on. There is no ScrollPlus account or setup. YouTube Shorts and TikTok can expose usable feeds while signed out; Instagram Reels requires a site login. Counts and available relation/ad signals come from data the sites already loaded.

Do not supply the owner's personal credentials to reviewers. Use a reviewer-owned site login or separately approved QA access if the dashboard requires test access instructions. If a site's login/feed variation cannot be tested, state that limitation.

## Basic checks

1. Open `https://www.youtube.com/shorts/` or `https://www.tiktok.com/foryou`; for Reels, sign in to Instagram and open its Reels feed. Observe a playable video with a readable like count. Unknown counts and photo posts stay.
2. To make a controlled skip easy to encounter, temporarily set Likes in the extension's Settings above the observed count, with Comments/Views off. The extension advances using the site's own next control. Its optional notice uses the left gutter: recent reasons and Undo, or a compact count/Undo in narrow space. It stays hidden while a player-column CSS transition is running or no safe space exists, then returns when room is available. Widen the window if the notice or six-skip pause controls cannot fit. To test a passing video, set Likes at or below its known count; it stays.
3. Select Undo immediately after a skip. The most recently skipped video returns and is kept for the browser session. Reload that same video; it remains kept. Reset defaults clears these temporary Undo choices while preserving saved creators and counters.
4. Toggle the master switch off: automatic skips stop. Reenable to resume. Site switches independently affect their respective sites.
5. With Keep accounts I follow on, a low-like video stays when the page already exposes its subscribed/followed relation. If no relation is exposed, count rules apply. Ads still skip with Skip ads on.
6. If the site presents an ad filling the player, Skip ads on advances past its disclosed ad marker. Off keeps it. This feature does not block ad network requests or hide ads in grids.
7. Put the feed in a background tab. Automatic moves stop; returning immediately checks the active video. A site move already issued before hiding may finish. Six consecutive skips pause for a choice, including when the sixth issued move finishes while hidden.
8. Type in a comment field, hold the pointer or open a menu: automatic movement waits. After leaving the field/closing the menu/releasing or cancelling the pointer, filtering can resume.

Reset to defaults when finished. The popup/settings work in English and Korean; Chrome's UI language selects the extension language. Grid filtering is optional and off by default. Creator keep stores only creators explicitly selected by the user. Time saved is derived locally from skip counts and on-screen duration, with a three-second comparison assumption; it is not an observed personal usage measurement.

## Data and code

The package uses `storage` and host access restricted to the three supported `www` HTTPS hosts. The page-memory cache disappears with its document; persistent settings/aggregate counters and session-only Undo choices are disclosed in [PRIVACY.md](../PRIVACY.md). All executable code ships with the package. There is no backend, remotely hosted executable code, analytics, payment or ScrollPlus login.
