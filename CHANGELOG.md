# Changelog

## 0.7.4 – update candidate (not published)

- On Instagram Reels, skip notices wait for scrolling to settle before appearing. This avoids brief hide/reappear cycles while moving captions change the available left gutter. Undo and pause controls keep keyboard focus.
- Followed Reels are recognised when the site's follow button is deeper in the current player card. Hidden, off-screen and neighbouring-player controls are excluded; missing relation signals still use the count rules.
- Prepared a new ZIP and version-specific reviewer instructions without replacing the submitted 0.7.3 package. Defaults, permissions and the storage schema are unchanged. The local 0.7.3 → 0.7.4 upgrade preserves settings, saved creators and counters; Store delivery still requires a new review.

## 0.7.3 – 2026-10-14

- Skip notices always use the left gutter. They track comments panels and player replacements; narrow gutters show only a count and Undo. A kept Instagram photo can anchor the preceding video's Undo.
- Notices hide during player-column transitions and return after the motion ends or is cancelled. If no safe left space exists, they wait for room instead of covering the video or moving right. Legacy overlay positions and the Settings position picker are retired.
- A quieter border and shadow replace the glow and expanding ring. Compact pause actions keep accessible names and keyboard focus.
- Store images are refreshed from the candidate UI. This is the first Store review candidate; review submission and publication are separate states. Instagram Reels remains experimental and current signed-in QA remains limited.

## 0.7.2 – 2026-10-13

- Hidden tabs no longer auto-skip or repeatedly scan the active player and grids. Returning checks the feed immediately. The six-skip safety pause is preserved.
- Instagram reads embedded payloads when their script is inserted or its text changes, instead of scanning all scripts every 800 ms. Same-length replacements and changes to a text node remain supported.
- A kept video, including Undo choices and revisits, ends a consecutive skip run. A passing video separates reason lists, so unrelated skips are not grouped together.
- An in-flight move that finishes after disable, leaving the feed or switching tabs cannot bring back an old notification. Actual successful moves are still counted once.
- A cancelled pointer gesture no longer leaves filtering stuck. Window blur and tab switches also clear the gesture. Defaults, UI appearance, permissions and storage keys are unchanged.
- Live smoke and soak tools now check the current 500-like defaults and report low-like samples against the tested minimum, rather than requiring the obsolete 5,000-like bar. Historical soak packages retain their versioned expectations.

## 0.7.1 – 2026-10-13

- Removed the time-saved explanation and labels from the popup and Settings. Both show only a clock icon and the time value; Settings keeps the date the count began.

## 0.7.0 – 2026-10-13

- The skip chip no longer covers the video. It sits beside it: a card 228 px wide, its right edge 16 px from the video's left edge, centred on the window's height. If the left side is taken by something on the site or has no room it goes to the right of the video, after the site's buttons. Where there is room for neither a card, a skip shows as a small pill with the mark, how many in a row and Undo, and a pause chip, which needs its two buttons, goes over the video as before.
- A row of skips is one chip. When several videos are skipped one after another, each adds a line to the same chip. It lists the reasons, newest first, at most three, with no head and no mark, so the less shown the better. One skip looks as it did. Undo still moves back one video.
- Settings, Skip chip position, has a new first choice, Beside, which is the default. Top, Middle and Lower are still there and put the chip over the video. An install that had the chip at the top, which was the default of 0.5.0 and 0.6.0, is moved to Beside once. A middle or lower place that you chose stays.
- Skipping, settings, storage keys and permissions are otherwise unchanged. The settings schema marker is 3.


## 0.6.0 – 2026-10-13

- New look. The accent is a calm teal instead of the orange-red, and the dark surfaces, text and borders share its hue. The old accent was about twice as saturated as the surfaces around it and shouted. The new one is picked at one lightness and one chroma, so no other hue would have looked stronger (the comparison is in [qa/color-study.md](qa/color-study.md)).
- New mark. Three streaks of unequal strength run behind a play triangle: videos passed, and the next one. It replaces the door. The toolbar icon, the popup and settings header, the skip chip's dot and the store images use it.
- How a video is judged and skipped is unchanged. Settings, storage and permissions are unchanged.


## 0.5.3 – 2026-10-12

- Hardened the subscribe and follow buttons. A Short labelled "Subscribed to …" or "…구독중", and a Reel labelled "Following …" or "Unfollow", now counts. A caption that merely mentions subscribing still does not.
- YouTube reads the subscription flag from the player and the current reel response only. The large sequence and next responses are left alone, and an unchanged video is not sent across to the filter again.
- Instagram looks for the follow button beside the reel, instead of every button on the page.


## 0.5.2 – 2026-10-12

- Keep accounts I follow now covers YouTube and Instagram as well as TikTok. A Short from a channel you subscribe to, and a Reel from an account you follow, stay even under the like bar. The switch was already on.
- YouTube is read from the subscription flag on the video the page loaded, and from the subscribe button on the Short (구독중 / Subscribed). Instagram is read from the follow flag on the reel, and from the button beside it (팔로잉 / Following). TikTok is unchanged.
- If the page does not say, the video is judged by its likes. An ad is still skipped when Skip ads is on. Nothing about who you follow is stored.


## 0.5.1 – 2026-10-12

- Keep accounts I follow is on in Settings. On TikTok, a video from a creator you already follow stays, even when it is under the like bar. Turn the switch off and those videos are judged like any other. An ad is still skipped when Skip ads is on.
- ScrollPlus reads the relation field TikTok already put on the video. It does not save who you follow, and it asks for no new permission. If the page does not say, the video is judged by its likes.
- YouTube and Instagram are not covered yet. The settings row carries the TikTok icon so that is plain. A signed-in check that relation 1 really means "I follow this account" is still open.
- Updating from 0.5.0 turns the switch on. Nothing else about your settings moves.


## 0.5.0 – 2026-10-12

- The presets are 100, 500 and 1,000 likes. Lenient, Balanced and Strict were 1,000, 5,000 and 20,000. Balanced, the default, skips videos under 500 likes. Updating from 0.4.x moves your settings once, by name: if you were on Balanced you are on Balanced, now at 500, and the same for Lenient and Strict. A rule of your own (a number that is none of the three, or comments or views turned on) stays exactly as it was.
- Skip ads is on by default. It also turns on once for an install updated from 0.4.x, because a saved "off" cannot be told from a switch nobody touched. The switch in the popup turns it off again, and that stays.
- The skip chip is easier to see. It sits at the top of the video, centred on it, and not at the bottom of the window where it covered the caption and, over a dark video, could not be told from the video. It has a dark body with an accent border and glow, larger text, larger buttons and a ring that widens when it appears. New in Settings: Skip chip position, Top (default), Middle or Lower (above the caption). The chip stays inside the window on a narrow one.
- Time saved. The popup shows an estimate of the time the skips have saved so far, and Settings shows today's skips, the skips in all and the time saved, with how it is estimated: each skip counts as about 3 seconds you would have spent on the video before swiping it away yourself, less the time it stayed on screen (a slow skip saves nothing, it never takes time away). The 3 seconds is an assumption, not a measurement of you. The count starts when you install or update. New storage keys: `totalSkips` (start day, number of skips, summed time on screen) and `schema`. Reset keeps both. PRIVACY.md lists them. Nothing leaves the device.
- How a video is judged and skipped is unchanged. The page scripts differ from 0.4.4's in the chip (its look and place) and in reporting, with each skip, how long that video was on screen.

## 0.4.4 – 2026-10-12

- Settings opens in a tab of its own, from the popup's Settings link and from the extension's card on chrome://extensions. It used to open in the small dialog that chrome://extensions shows for an options page. The tab carries the ScrollPlus icon and a title in your language.
- The GitHub button shows GitHub's mark in white in place of a star. Its tooltip still says "Star this project on GitHub"; the button itself only says GitHub.
- GitHub's mark comes from Octicons (MIT). The notice ships in the package as THIRD_PARTY_NOTICES.txt, and the README, the store listing and SPEC.md now say that ScrollPlus is not affiliated with GitHub either.
- Skipping is unchanged. The only source file the YouTube, TikTok and Instagram scripts share with these pages that changed is the icon table, so their bundles differ from 0.4.3's in that table (the star is out, the GitHub mark is in, and no page draws either) and in the short names the minifier picked.

## 0.4.3 – 2026-10-11

- Instagram Reels skips are faster. A skipped reel was on screen for a median 0.62 s (mean 0.78 s) and now stays for 0.32 s (mean 0.52 s), measured live in a signed-in browser at a strict bar (80-second runs: four of 0.4.2, three of 0.4.3). The first skip of a row went from 0.31 s to 0.21 s and a skip that follows a skip from 0.64 s to 0.35 s. Between two skips ScrollPlus waited 450 ms, which Reels does not need, because it takes a press while it is still scrolling: none of the 669 presses measured was ignored, at any wait. The wait is 100 ms now, ScrollPlus looks at the feed while it scrolls instead of every 400 ms, and it presses as soon as the reel is on screen enough to be moved on from. What was measured, and the numbers tried, are in [skip timing on Instagram](qa/skip-timing-instagram.md).
- Reels loads reels 13 at a time. When skipping reaches the end of those, the page shows no reel for 1.2 to 4.7 s (1.8 times a minute in these runs, as often on 0.4.2). That wait is the site's.
- TikTok: the wait after a video arrives is 180 ms instead of 150 ms. TikTok answers a press made less than about 0.16 s after a video arrived 0.1 s late, so 150 ms cost about 0.1 s on every first skip of a row. The median skipped video is on screen for 0.31 s instead of 0.38 s, in each of four rounds of live runs ([skip timing on TikTok](qa/skip-timing-tiktok.md#how-long-to-wait-after-a-video-arrives)).
- The Instagram figures come from the built Instagram scripts run in the page behind a stand-in for chrome.storage, because an extension could not be loaded into the signed-in browser. A person who scrolls with a wheel or a trackpad was not simulated, and the account showed no advertisement.
- New scripts/instagram-latency.mjs repeats the Instagram measurements. YouTube, defaults, rules, sound and permissions are unchanged.

## 0.4.2 – 2026-10-11

- TikTok skips are faster. A skipped video was on screen for 1.03 s on average and now stays for 0.48 s (live, signed-out For You, four 75-second runs of each build at a strict bar). A skip that follows a skip went from 0.59 s to 0.35 s; the first skip of a row stays at about 0.4 s. What was measured, and what was tried and dropped, is in [skip timing on TikTok](qa/skip-timing-tiktok.md).
- TikTok keeps its Next control disabled until it has added the next video, which was the case for about one skipped video in five, for up to 3 s. ScrollPlus pressed the disabled control anyway, waited 1.8 s for a move that could not come and tried again, so it moved a median 1.6 s after the control was offered. It now looks every 50 ms and moves 11 ms after (median).
- Between two skips on TikTok it waits 100 ms after the previous move and 150 ms after the video arrived, instead of 450 ms, and it looks at the feed when it scrolls and when it stops, not only every 400 ms.
- TikTok's sound is left alone on purpose. TikTok takes a mute made by a script as your own choice: in about half of the sessions measured it started every later video muted, and stored the mute in localStorage. A skipped TikTok is heard while it is on screen.
- A row of skips shows one chip whose words change, instead of a new chip for every video. A moment without a player between two videos, as in TikTok's scroll, no longer clears the chip or resets the count of six. Both apply to all three sites.
- Instagram Reels and YouTube Shorts keep their waits and their sound. Reels was not measured: signed out it redirects to the login page.
- New scripts/tiktok-latency.mjs repeats the TikTok measurements. Defaults, rules and permissions are unchanged.

## 0.4.1 – 2026-10-11

- On YouTube Shorts a Short that follows another skip is now on screen for about 0.5 s instead of 0.8 s (median over 20 live minutes at a strict bar). The next skip follows 150 ms after the move instead of 450 ms, and a Short that arrives while the previous move is still being confirmed is judged at once. The first skip of a row is unchanged at about 0.5 s: ScrollPlus decides within 2 ms, and YouTube itself starts the next move about 0.37 s after the last one finished. TikTok and Instagram keep the 450 ms wait. Measurements, and what does not help, are in [skip timing](qa/skip-timing.md).
- YouTube sometimes does nothing for a Next press when it has only one or two Shorts left and is fetching more. ScrollPlus used to wait 2 s before pressing again; it now presses again after 0.7 s, only when YouTube has not started a move, and never once a move has started.
- The Short that is being skipped is muted while it is skipped, so the first half second of a low-like video is no longer heard. A player you muted stays muted, and the volume the site stores is not touched.
- New scripts/skip-latency.mjs repeats the timing measurements on live YouTube Shorts. Defaults, rules, UI and permissions are unchanged.

## 0.4.0 – 2026-10-11

- New **Skip ads** switch in the popup and in Settings, off by default. When it is on, ScrollPlus moves past an ad that fills the player on YouTube Shorts, TikTok and Instagram Reels as soon as the site marks it as one, with the chip "Skipped · ad" and Undo. It never blocks ad requests and never hides ads in lists.
- YouTube Shorts ads are now recognised, from the reel renderer's own ad attribute. Before, a Shorts ad was an ordinary video, so an ad showing 125 likes was skipped by the default like rule although ads were meant to stay. Ads now stay unless Skip ads is on.
- Before it moves on, the page script checks again that the item is still what the decision assumed, so a count never skips an ad and the ad rule never skips an ordinary video, including the first moments after an ad ends.
- The popup can be up to 480 px tall (it was 420) for the new row. Settings saved earlier read as Skip ads off; every other default is unchanged. Evidence, including what was and was not seen on real feeds, is in [qa/ads.md](qa/ads.md).

## 0.3.7 – 2026-10-09

- Pages no longer list all of their links every 400 ms while grid filtering is off, the default. On a page with 20,000 links that was about 0.3 s of script time per 3 idle seconds; it is now near zero. Cards hidden by optional grid filtering are still restored immediately when filtering is lowered or turned off.
- A browser regression covers the idle cost. Defaults, rules, UI and permissions are unchanged. Evidence and limits are in [idle cost](qa/idle-cost.md) and [release readiness](qa/release-readiness.md).

## 0.3.6 – 2026-10-09

- TikTok and Instagram no longer resend their whole observed feed history on every idle poll, and unchanged embedded JSON is not reparsed. With 5,000 loaded items an idle 2.5-second probe went from 30,000 TikTok and 15,000 Instagram rows to zero extra messages.
- Instagram count changes whose replacement payload has the same length and prefix are now observed, so a reel whose likes drop from 6,000 to 1,000 is skipped by default.
- Instagram keeps disclosed advertisements (visible Ad, Sponsored or Korean disclosure) and any feed card without a visible video, such as an image-style advertisement. Native QA of earlier candidates had skipped both under the 5,000-like minimum.
- A player that mounts after its URL and counts is reconsidered without clearing a session Undo. Defaults, rules, UI and permissions are unchanged. Controlled-page and native evidence, including what is still open, is in [release readiness](qa/release-readiness.md).

## 0.3.5 – 2026-10-08

- Undo keeps restored videos through page reloads and new tabs for the browser session. Choices stay in trusted-only Chrome session RAM and are committed before moving back; video ids are never written to disk.
- Reset clears temporary Undo choices across open tabs while preserving saved creators and today's count. Pending Reset is disabled, and a failed reset shows an inline message.
- Built-browser regressions cover all five adapter routes, concurrent session writes, real browser restart and saved-state preservation. Defaults and permissions are unchanged. Historical signed-in checks and remaining release gates are scoped in [release readiness](qa/release-readiness.md).

## 0.3.4 – 2026-10-07

- TikTok creator recommendation previews and profile/grid hover previews are no longer treated as active feed videos. This prevents next-video attempts and incorrect current-creator actions on those surfaces while grid filtering is off.
- Built-extension regressions cover preview exclusion and skip, Undo, and creator persistence on For You, Following, and individual video routes.
- Defaults, UI and permissions are unchanged. Live QA scope and remaining release gates are recorded in [release readiness](qa/release-readiness.md).

## 0.3.3 – 2026-10-07

- Cards hidden by optional grid filtering are rechecked even when they have no layout box. Lowering a minimum or turning grid filtering off restores them immediately; cards hidden by the site remain untouched.
- A built-extension regression covers restoration, passing cards and missing counts. Actual signed-out TikTok checks now cover custom comments/views, equal-count boundaries, Undo and a saved creator on a fresh page.
- Defaults and UI are unchanged. Signed-in Instagram and TikTok QA remains pending.

## 0.3.2 – 2026-10-07

- Reused XMLHttpRequests have one observer rather than accumulating listeners on every send. Responses are read at completion before ordinary load callbacks can reopen the request.
- Network observers match the browser's actual response URL, so relative feed API requests are read too. Native XHR `send` and `open` arguments are preserved; fetch keeps its original Promise, Response, headers and body.
- Native browser regressions cover XHR reuse, fetch identity, invalid JSON and observer failures. The built TikTok adapter fixture now gets its counts through a relative feed request instead of embedded data.
- Filtering defaults and UI are unchanged. Signed-in Instagram and TikTok live QA is still pending.

## 0.3.1 – 2026-10-07

- Undo remembers the skipped video after the next item becomes active. Settings changes apply to the current video, and Continue/Lower still work after a long pause.
- Timely counts remain usable after writing a comment. Polling preserves focus on skip-chip buttons.
- Escape cancels number edits; invalid numbers get an inline error. Switches have larger click targets, rule rows reflow in narrow settings windows, and controls have distinct accessible names.
- Compact numbers follow the actual localized labels, even when Chrome's reported UI language differs from the locale used for messages.
- Creator keep confirmations wait for storage, and an already-kept creator is shown correctly when reopening the popup.
- Ads flagged by TikTok or Instagram are kept; zero views are retained as a known count. Cross-frame and malformed advance messages are ignored.
- The background serializes daily counter updates across tabs; an open settings page refreshes at midnight. The manifest enforces Chrome 120+.
- Built-adapter regression coverage, package and asset checks, reproducible bilingual UI captures, refreshed listing copy, and English/Korean marquee images.
- Signed-in Instagram and TikTok still require live QA. Store submission remains pending.

## 0.3.0 – 2026-10-07

- Renamed to ScrollPlus.
- TikTok now actually moves to the next video. Before, the click and key press came from the extension's isolated world, which TikTok ignores, and the For You feed exposed no video id. The click now comes from the page script, For You ids are read from the player wrapper, and a move is detected by the feed item on screen.
- Instagram uses the same page-script click. It could not be tested signed in, so it stays unverified.
- A freshly loaded page judges its first video until 6 seconds after load, because counts arrive late there.
- Development dependencies updated; `npm audit` reports no vulnerabilities. CI now also runs the browser tests.

## 0.2.0 – 2026-10-07

- The rule is a plain like count. Presets: Lenient 1K, Balanced 5K (default), Strict 20K. Settings can also turn on a minimum for comments or views.
- New popup, settings page, skip chip that says why, and icon. English and Korean, with numbers shown the way each language writes them.
- YouTube Shorts: clicking Next from the page script, the skip chip stays on screen after the move.

## 0.1.0 – 2026-10-06

- First prototype with a weighted engagement rate and Lenient, Balanced, and Strict presets.
