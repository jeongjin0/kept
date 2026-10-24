# Live smoke

Before 0.3.0 this project was called Kept, and briefly Short-Form Like Filter. Older entries below use those names.

Date: 2026-10-06

Instagram Reels was not verified. The smoke browser had no signed-in Instagram session, so nothing was marked as passed there.

YouTube Shorts: 20 distinct videos. Views were read on 20. Eligible for the provisional Balanced cutoff: 19. Of those, 0 were below the cutoff. Chip text was seen on 0 samples.

TikTok: 20 distinct videos. Views were read on 0. Eligible: 0. Below the provisional cutoff: 0. Chip text was seen on 4 samples.

The browser session closed after both passes.

## 2026-10-07

The 2026-10-06 YouTube pass did not show a skip chip. Two product bugs explained that. An isolated-world click on Next did not change the Short, and a successful move cleared the chip as soon as the next video loaded.

After the fix, a fresh logged-out profile opened a low-response Short. Kept moved to the next Short and showed 넘김 with 되돌리기. The same path then skipped several more weak Shorts and stopped on one above the cutoff. Counts that arrive within 2 seconds of opening are still scored. Instagram remains unverified.

## 2026-10-07, version 0.2.0

The rule is now a like count (default: skip under 5,000 likes) and the popup, options, skip chip, and icon were rebuilt.

YouTube Shorts, fresh logged-out profile, shipped defaults, 75 seconds of scrolling. 27 distinct Shorts were opened. 21 showed a like count; 6 showed none at first sight and were left alone. 5 of the 21 were under 5,000 likes (454, 644, 123, 1,604, and 6). Kept moved on from all five without a click. For four of them the chip was captured with the reason, for example "넘김 · 좋아요 454" with "되돌리기". The fifth moved on within half a second and its chip was not captured. Every Short at or above 5,000 likes stayed.

Recording and frames are in qa/tmp (not committed). TikTok and Instagram were not re-run on this build. Instagram remains unverified.

Browser tests on the built extension cover the defaults, presets, switches, typed numbers, Custom, and Reset. Fixture tests cover the skip, the reason chip, the six-skip pause, undo, and fail-open.

Known limits: counts that load later than two seconds after a video opens are not judged. A brand-new video with few likes is skipped, as the rule says.

### Final 0.2.0 build, same day

YouTube Shorts again on the final build, logged out, 42 seconds: 18 Shorts opened, 16 showed a like count, 6 were under 5,000 (316, 3,381, 672, 83, 22, 11) and 10 were at or above it. The chip with the reason was captured for 316 and 3,381 ("넘김 · 좋아요 316", "넘김 · 좋아요 3.4천"). Shorts at or above 5,000 were left alone.

TikTok found a real bug. With the first 0.2.0 build Kept judged TikTok videos correctly but never moved the feed, so nothing was skipped. In a 21-video logged-out pass only one video was under 5,000 likes, and it was not skipped. To force the case I raised the likes minimum to 50,000 on a fresh profile and the feed still did not move. Cause: the extension sent its next-video click and key press from its isolated world, which TikTok ignores, and on Explore the button has no data-e2e attribute. On For You the active video had no id at all, because the page has no video link; the id is in the player wrapper's element id.

Fix: the click now comes from the page script, it looks for the button labelled Next video and the feed navigation button, the For You video id and creator are read from the player wrapper and author link, and the move is detected by the feed item on screen, since the next player is empty while it loads.

After the fix, with the minimum raised to 50,000 to force skips: on Explore, Kept skipped videos with 33K, 24K, and 7.4K likes with the reason chip each time, then stopped after six in a row as designed. On For You it skipped a 37K-like video with "넘김 · 좋아요 3.7만". The default 5,000 bar was not re-run on TikTok after the fix, and the logged-in For You feed was not tried. Instagram remains unverified.

## 2026-10-07, version 0.3.0 (ScrollPlus)

All runs on a fresh logged-out Chrome profile with the built extension. Where a run needed skips to happen quickly, the likes minimum was raised to 50,000 through storage; the default rule was not used for these four checks.

- Undo on YouTube Shorts: after a skip, the chip's Undo button went back to the skipped Short and it stayed for 4.5 seconds without being skipped again. Pass.
- Keep this creator on YouTube Shorts: the page answered with the channel id, the keep message saved it to the allowlist, and a fresh load of the same Short stayed put for 6.5 seconds even though it was under the minimum. Removing the creator again made a fresh load skip it. Pass.
- Late counts: the removal check first failed, because on a freshly loaded page the counts arrive about 3 seconds after the script starts, past the 2-second window, so the first video was kept. The first video now gets until 6 seconds after load. The check passes after the change.
- Instagram signed out: /reels/ redirected to the login page, no chip appeared, the extension reported "signed out", and the page had no script errors. Signed in is still untested, and the next-reel button is unverified.
- Cost: over 20 seconds on a Short that stays on screen, the extension added about 1.4 ms of CPU per second (script time 2.6 to 4.0 ms, total task time 8.1 to 9.5 ms, two runs each). On the YouTube home page it added about 0.3 ms per second (one run each). Both are tiny next to the page itself.

One run each, one machine, one network. These show the paths work, not how often they fail.

## 2026-10-07, version 0.3.1

Fresh isolated Chrome profiles, shipped defaults: on, all three sites enabled, likes minimum 5,000, comments/views disabled. Unlike the forced-skip 0.3.0 checks, these runs did not raise the minimum.

- YouTube Shorts, 90 seconds: 15 distinct active videos with known likes. Two were below the minimum (859 and 523); both advanced automatically and both reason chips were captured. The other 13 stayed until the test scrolled. No page errors.
- TikTok For You, signed out, 90 seconds: six active sampled items, all with known likes. One had 3,681 likes; it advanced automatically with the reason chip. A login overlay limited the rest of the run. One error, `a.init is not a function`, had a stack in TikTok's login CDN bundle and no extension frames. A 36-second no-extension run did not reproduce it, but a fresh 90-second control with 13 manual advances reproduced the same error at the same bundle location. The error can occur without ScrollPlus; the limited run still does not establish a clean full-feed or signed-in pass.
- Instagram Reels, signed out: redirected to `/accounts/login/`; no signed-in behavior was verified. The existing checked native Chrome profiles were also signed out.
- YouTube Undo, a separate run: the 523-like Short advanced, clicking the real chip's Undo returned to that Short, and it stayed for four seconds. Stored daily count was 1 and the settings were still the shipped defaults. No page errors.

Local evidence: `qa/tmp/release-031-defaults/report.json` with raw videos and chip frames, `qa/tmp/final-live-undo/report.json` with the Undo recording, `qa/tmp/tiktok-without-extension/report.json` for the short control, and `qa/tmp/tiktok-control-90s/report.json` plus its video for the reproduced error without the extension. These are retained locally and ignored by Git. Review clips are trimmed/transcoded copies; original recordings are preserved.

The final package also passes 42 unit tests and 10 browser tests. Built YouTube, TikTok and Instagram scripts are exercised on controlled DOM fixtures, including setting changes, cross-frame/malformed message rejection, skip count, Undo and saved creators. Those fixtures establish our script behavior; they do not establish current signed-in Instagram compatibility. The last changes after the live default run are the message guards and compact-number locale fix, both covered by regressions; the guards were present in the real Undo run.

See [release-readiness.md](release-readiness.md) for the exact artifact and remaining signed-in release gates, and [ui-audit.md](ui-audit.md) for the screenshot review.

## 2026-10-07, version 0.3.2

Fresh isolated Chrome, final built extension, shipped defaults (likes below 5,000; comments/views off). Each feed ran for 90 seconds.

- YouTube Shorts: 17 distinct active videos, all with known likes. Four were below the minimum (703, 244, 2,668 and 818); all four advanced automatically with reason chips. The other 13 stayed until the test scrolled. No page errors.
- TikTok For You, signed out: six sampled items and three distinct reason chips (3.7K, 1.8K and 4.7K likes in English notation). The report records one unambiguous automatic transition from the 1,790-like item. Some short-lived items moved between samples, so the chip count must not be reported as three independently verified transitions. A login overlay limited the run. The same `a.init is not a function` login-bundle error occurred; the 0.3.1 no-extension control already reproduced it at the same location.
- Instagram Reels: redirected to `/accounts/login/`; signed-in behavior remains unverified.

Local evidence is retained in `qa/tmp/release-032-defaults/report.json`, chip frames and original videos. The existing review clips and live Undo evidence were captured on 0.3.1; UI and Undo behavior are unchanged in this patch.

The final 0.3.2 package passed typecheck, 42 unit tests and 13 browser tests. Three new native-browser regressions reproduce and fix the reused-XHR observation bug and check that host fetch/XHR results survive observer failures. The built TikTok fixture now reads counts from a relative feed request. See [network-observer.md](network-observer.md) for the exact contracts. These controlled tests do not replace signed-in live QA.

### Additional 0.3.2 TikTok conditions, 2026-10-07

Fresh isolated, signed-out Chrome profiles; custom comments-only and views-only rules entered through the actual Settings UI. These are boundary/action checks, not shipped-default runs.

- Comments: a 686-comment video stayed at minimum 686, skipped at 687 with the real reason chip, returned through Undo and stayed for 3.5 seconds. Keeping its creator persisted. On a fresh direct video page, it remained with 686 comments under a 1,372 minimum and no extra skip; the counter was 1.
- Views: a 3,600,000-view video stayed at the equal minimum and skipped at 3,600,001 with the views reason chip. Real Undo restored it. A site navigation invalidated the final creator evaluation, so only that step was recovered using the same task profile and its already-saved creator. On a fresh direct page with the minimum 7,200,000, the 3,600,000-view video stayed for 6.5 seconds and the counter remained 1.
- The known TikTok login-bundle `a.init is not a function` error occurred in the comments and recovery runs. These working paths do not establish a clean signed-in feed pass.

Reports, original recordings and frames: `qa/tmp/live-metrics-032-1791365591471/report.json` and `views/kept-recovery/report.json`. Failed/transient evidence is preserved alongside the recovered check.

## 2026-10-07, version 0.3.3

Optional grid filtering had a separate reversibility bug: lowering the minimum or disabling grid filtering left a previously hidden card hidden. The built-extension regression failed before the fix and passes afterward. Passing and unknown-count cards stay visible, and the site's own hidden card is preserved. See [grid-filtering.md](grid-filtering.md).

The final 0.3.3 package passed typecheck, 42 unit tests, 14 browser tests and package validation. Active-player behavior and UI are unchanged. A fresh shipped-default YouTube run is executing for 24 hours from this exact ZIP; its final result is pending. See [soak.md](soak.md).

Core signed-in Instagram Reels and TikTok For You paths were then verified using this exact package in Aside Chromium 153. Reels: default skips, actual Undo, persisted creator, Reset/away/back and missing views. TikTok: a 2,639-like default skip, Undo, creator, a separately identified 9,931-like Strict skip and low-like ads kept. See [signed-in-smoke.md](signed-in-smoke.md) for individual counters, sampling limits and browser scope. These results supersede the earlier lack of a usable signed-in session; they do not establish ordinary human day-use or all Google Chrome signed-in flows.

## 2026-10-07, version 0.3.4

TikTok recommendation/profile previews are now excluded from active-player filtering. The built-extension regression failed before the fix, then passed alongside For You, Following and video-route skip/Undo/creator fixtures. Typecheck, 42 unit tests, 19 browser tests and final package validation passed.

The exact ZIP was checked in actual signed-in Aside Chromium 153: Following recommendation exclusion, a 2,660-like video-page default skip and a fresh Undo restoration. Positive live Following skipping is not established because this account's route contained creator recommendations. See [the preview report](tiktok-previews.md) for the evidence and scope.

The earlier 0.3.3 long run ended after 3h7m: its QA runner treated a normal refresh as fatal after the feed stopped moving. Evidence is preserved; no extension-crash or full-duration pass is inferred. The fixed runner passed two new browser contracts (21 tests total) and a two-minute real refresh check before a fresh 24-hour 0.3.4 successor started. See [long-feed QA](soak.md).

## 2026-10-08, version 0.3.5

Fresh, signed-out Chrome for Testing profile using the exact 0.3.5 ZIP identified in [release readiness](release-readiness-035.md#artifact). Shipped defaults were verified: likes minimum 5,000, comments/views off, all sites enabled and no saved creators.

- TikTok For You: six items with known likes were sampled. The 3,827-like video advanced automatically to an 8,429-like video, with the reason chip showing `넘김 · 좋아요 3.8천` and Undo. No page errors were collected.
- A signup Terms dialog blocked further useful feed scrolling after about 30 seconds. The 90-second recording does not establish 90 seconds of unobstructed feed use. No terms were accepted, no account was created and no Undo action was performed.
- The finite run ended naturally and all thirteen recorded task-owned processes ended. This is a limited default-rule check, not signed-in, positive Following, long-term reliability or ordinary day-use evidence.

Local evidence: `qa/tmp/tiktok-live-035-signedout/report.json`, `verdict.json`, `cleanup.json`, the chip and final frames, and the original recording. They are retained locally and ignored by Git. The 26-second review clip is a trimmed/transcoded copy; the original recording is preserved.
# 2026-10-25 notice/popup source update

Disposable signed-out Chrome for Testing153.0.8010.12 on the real YouTube Shorts site: default-on,500-like and compact settings loaded, active feed confirmed, zero default skips in the short observed segment. A temporary100,000,000-like bar produced six moves and the safety pause; the extension popup displayed its controls and Undo moved back. Defaults restored; no collected extension page errors. This does not establish a default low-like positive, Store-delivered upgrade or signed-in Reels/TikTok compatibility. See [scoped notice/recovery QA](notice-popup-recovery-20261025.md).
