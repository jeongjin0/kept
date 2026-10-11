# Changelog

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
