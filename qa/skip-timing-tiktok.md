# Skip timing on TikTok

2026-10-11 KST. How long a skipped video stays on screen on TikTok, what ScrollPlus 0.4.1 added to that, and what 0.4.2 and 0.4.3 change. Measured on live, signed-out TikTok For You in fresh Chromium profiles at 1280×800 (desktop layout), first with the built 0.4.1 extension, then with the 0.4.2 build, last with the 0.4.2 build and three longer waits after a video arrives (0.4.3), using [scripts/tiktok-latency.mjs](../scripts/tiktok-latency.mjs). Each run lasted 75 s, at a strict bar (20,000 likes), the default bar (5,000) or a very strict one (100,000) to provoke skips in a row, as stated. A signed-out TikTok profile is good for about 30 videos: then it asks for a login and loads no more, so every figure comes from several short runs, each in a fresh profile. Nothing here covers a signed-in feed, TikTok's mobile layout or Instagram Reels.

## Short answer

On 0.4.1 a skipped TikTok was on screen for 1.03 s on average (median 0.58 s) and was heard for as long. On 0.4.2 it is 0.48 s on average (median 0.38 s). The mean was far above the median because one skip in five took 1.9 to 4.6 s, and those skips made up 62% of all the time skipped videos spent on screen. Two things caused them:

- **A Next control that was not ready.** TikTok keeps its Next control disabled until it has added the next video to the feed. That was the case while 19 of 90 skipped videos waited (21%), for 0.4 to 3.2 s. A press on a disabled control does nothing, so 0.4.1 waited the usual 1.8 s for a move that could not come and then pressed again 0.4 s later. It pressed 1.6 s after the control was offered (median; 2.0 s at most). 0.4.2 looks every 50 ms and pressed 11 ms after it was offered (median; 29 ms at most).
- **A wait that TikTok does not need.** Between two skips in a row 0.4.1 waited 450 ms, a value it had used before TikTok was measured. TikTok takes a press while it is still scrolling, so 0.4.2 waits until the video has been the active one for 150 ms, and 100 ms after the previous move. A skip that follows a skip dropped from 0.59 s to 0.35 s on screen (median).

The first skip of a row is unchanged at about 0.4 s. The sound is unchanged too: a skipped TikTok starts playing when it arrives and is heard until it leaves. Muting it looks like the obvious fix, and TikTok punishes it (see [Sound](#sound)).

0.4.3 waits 180 ms after a video arrives instead of 150 ms, and is faster for it: TikTok answers a press made less than about 0.16 s after a video arrived in 0.23 s instead of 0.13 s. At the same bar the median skipped video was on screen for 0.31 s instead of 0.38 s, in each of four rounds (see [How long to wait after a video arrives](#how-long-to-wait-after-a-video-arrives)).

## How TikTok moves

Without the extension, two presses on the site's own Next control, the second one 30 to 600 ms after the first (36 pairs in two runs):

- A press starts a scroll within 0.03 s. The scroll takes 0.2 s. The new video counts as the active one (at least 60% on screen) 0.11 to 0.19 s after the press, and starts playing then.
- A second press within about 0.1 s of the first is ignored (5 of 5, made 31 to 33 ms and 82 ms after it). From 0.13 s on it is taken, also while the first scroll is still under way (28 of 28 with the control enabled).
- The video in the middle is then the active one for a median 0.30 s (20 pairs with the second press 0.13 to 0.31 s after the first: 0.26 to 0.34 s, once 0.18 s), whenever in that range the second press is made. A second press 0.4 s after the first leaves it on screen for 0.39 to 0.41 s, one 0.6 s after for 0.59 to 0.60 s. Any press up to about 0.3 s after the first gives the same 0.3 s, and a later one only keeps the video on screen longer. 0.4.1's 450 ms wait was a later one. (This is about two presses made by a script. It does not say how soon after a video arrived a press may be made: see [How long to wait after a video arrives](#how-long-to-wait-after-a-video-arrives).)
- In 3 of the 31 pairs where the second press was not ignored, the control was disabled when it was made. The control was disabled 9 times in the 36 trials and was enabled again after 0.49 to 3.0 s.

## The Next control

0.4.1 and 0.4.2 at the same bar (20,000 likes, four runs each):

| | 0.4.1 | 0.4.2 |
| --- | ---: | ---: |
| Skipped videos | 90 | 100 |
| On screen, mean | 1.03 s | 0.48 s |
| On screen, median (90%, 95%) | 0.58 s (2.57 s, 4.06 s) | 0.38 s (0.58 s, 0.72 s) |
| Skipped videos on screen for over 1 s | 19 (21%), 1.9–4.6 s | 4 (4%), 2.6–2.7 s |
| Their share of all time on screen | 62% | 22% |
| Control disabled while the video waited | 19 | 13 |
| Disabled for, median (longest) | 0.73 s (3.2 s) | 0.58 s (2.6 s) |
| Pressed after the control was offered, median (longest) | 1.63 s (2.04 s) | 0.011 s (0.029 s) |
| Control never disabled: on screen, median | 0.58 s (n=61) | 0.37 s (n=77) |
| First skip of a row: on screen, median | 0.40 s (n=35) | 0.40 s (n=45) |
| Skip that follows a skip: on screen, median | 0.59 s (n=55) | 0.35 s (n=55) |

TikTok's own waits were of the same kind in both builds (the control was disabled in 13 to 21% of the skipped videos, for a median 0.6 to 0.7 s and now and then for 2 to 3 s), so the difference lies in how soon the extension pressed after the control was offered, not in the feed. At the default bar the runs are short, because few videos fall under 5,000 likes: 0.4.1 skipped 21 videos in two runs (mean 0.80 s on screen, 3 over 1 s; a third run never loaded a video and is left out) and 0.4.2 skipped 33 in three (mean 0.50 s, 1 over 1 s). At 100,000 likes 0.4.2 skipped 126 videos in two runs: mean 0.55 s, median 0.39 s, 7 over 1 s (2.7–3.6 s), and the control was pressed 13 ms after it was offered (median). In every run, of both builds, ScrollPlus moved on only from videos under the bar: none of the 90, 21, 100, 33 and 126 skipped videos was at or above it.

What decides the long skips that remain is TikTok: while it has no next video there is nothing to move to. In the 0.4.2 runs the control stayed disabled for 3.4 s at most. ScrollPlus gives up on a video 5 s after it opened, as before.

## How long to wait after a video arrives

0.4.2 pressed 150 ms after a skipped video had become the active one. To check that wait, the 0.4.2 build was run with the wait set to 150, 180, 200 and 230 ms (three builds that differ from it in that one number), at 20,000 likes in fresh profiles, 75 s each: four rounds, each with one run of every build one after the other, 16 runs.

| Wait after the video arrived | 150 ms (0.4.2) | 180 ms | 200 ms | 230 ms |
| --- | ---: | ---: | ---: | ---: |
| Skipped videos | 93 | 108 | 99 | 118 |
| On screen, median (90%) | 0.38 s (0.96 s) | 0.31 s (0.70 s) | 0.33 s (0.72 s) | 0.36 s (0.75 s) |
| The median in each of the four rounds | 378, 383, 393, 385 ms | 319, 314, 310, 313 ms | 330, 333, 359, 334 ms | 355, 360, 362, 363 ms |
| Control never disabled: on screen, median | 0.38 s (n=65) | 0.31 s (n=83) | 0.33 s (n=67) | 0.36 s (n=94) |
| First skip of a row: click to next video active, median | 0.23 s | 0.13 s | 0.13 s | 0.13 s |
| Control disabled while the video waited | 19 | 12 | 19 | 15 |

The means (0.64, 0.44, 0.60 and 0.58 s) say less, because they follow TikTok's own waits for its Next control, which came at random: 0.5 to 4.2 s, in 11 to 20% of the skipped videos of every build. The medians, and the videos for which the control was never disabled, are the comparison.

At 150 ms TikTok answered the first skip of a row slowly: 0.23 s from the press until the next video was the active one, against 0.13 s at the other three waits, and each of the four rounds shows it (0.20 to 0.23 s against 0.12 to 0.13 s). Over all 16 runs, a press made less than about 0.16 s after a video arrived was answered slowly, and one made later was not:

| Press made after the video arrived | Presses | Click to next video active, median | Over 0.18 s |
| --- | ---: | ---: | ---: |
| Under 160 ms | 52 | 0.23 s | 48 |
| 160 to 199 ms | 134 | 0.13 s | 14 |
| 200 ms or more | 164 | 0.13 s | 4 |

(Presses made within 0.4 s of the arrival; the report prints this table.) 150 ms sits just under that edge, so the 0.4.2 wait cost about 0.1 s on every first skip and on some skips that follow a skip. 180 ms is past it. 14 of the 134 presses in its band were still slower than 0.18 s, against 4 of 164 from 200 ms on, and the medians put 180 ms ahead of 200 ms by 0.02 s, with the rounds of the two overlapping in part, so the choice between them is a small one. A press 165 ms after the arrival, answered in 0.13 s, would leave a video on screen for about 0.3 s, so 0.31 s is close to what TikTok allows. 0.4.3 waits 180 ms. The 100 ms after the previous move and the sound are as in 0.4.2.

## Sound

A skipped TikTok starts playing as it arrives, so the first 0.3 to 0.4 s of every skipped video is heard. Muting it is what 0.4.1 does on YouTube, and it works there. On TikTok it does not, because TikTok takes a mute made by a script for the person's own choice:

- A test build of 0.4.2 muted a skipped video as soon as it had been judged (within about 0.02 s of its arrival) and gave the sound back after the move. In 3 of 4 runs at 20,000 likes the videos that followed started muted, kept videos too (21 of 24, 23 of 26 and 22 of 25 of them), for the rest of the run; in the fourth run none did (0 of 22). The skipped videos themselves were heard for 2 ms on average.
- A script that muted every video 20 to 250 ms after it arrived and pressed Next shortly afterwards (11 runs, 4 of them recorded with an earlier version of the script): in 6 of the runs every later video started muted, and in the 2 of those recorded with the committed script TikTok also wrote the key webapp-video-mute to localStorage, so the mute outlives the tab. In the other 5 it did not. Which of the two happens is not visible in advance. A mute made 0.5 s or later after the arrival was forgotten at the next video in all 4 runs (0.5, 0.7 and 1 s), which is no use for a video that is skipped after 0.4 s.
- Setting the volume to 0, or pausing the video, instead of muting it, was not remembered in one run each (12 videos). After a volume of 0 one video started silent, with its predecessor's volume, and stayed so for 2.6 s, until TikTok added the next video to the feed. Neither was pursued: a good video that plays silent costs more than a short burst of a bad one.

So 0.4.2 does not touch TikTok's sound, and a browser test fails if it ever does. A skipped video is heard for as long as it is on screen: 0.47 s on average (1.03 s on 0.4.1).

## What 0.4.2 changes on TikTok

- While the Next control is disabled the engine presses nothing and looks again every 50 ms, up to 5 s after the video opened, as before. The press follows within about 0.03 s of the control being offered. A person who scrolls on, starts typing, or presses Undo in the meantime is not pressed past, and Undo stays available while the next skip waits.
- Between two moves: at least 100 ms after the previous move was confirmed and 150 ms after the video became the active one, where 0.4.1 waited 450 ms. First skips are no slower than on 0.4.1. (0.4.3 raised the 150 ms to 180 ms; see [How long to wait after a video arrives](#how-long-to-wait-after-a-video-arrives).)
- The active video is looked at while the feed scrolls (at most every 60 ms) and when it stops, not only at the next 400 ms poll. Idle pages produce no scroll events, so this costs nothing until the feed moves.
- On every site a missing player counts as leaving the feed only after 300 ms. TikTok's scroll leaves no player on screen for about 0.05 s between two videos (median 47 ms, 95% under 81 ms, 204 times in the four 0.4.2 runs), and a poll that landed in that moment cleared the chip and reset the count of six; on a routed page the six-skip pause never came on 0.4.1. The skip chip also changes its words in place for a skip that follows a skip, instead of showing a new chip for every video.
- Instagram Reels and YouTube Shorts keep their waits and their sound as they were.

## What 0.4.3 changes on TikTok

One number: the wait after a video arrives is 180 ms instead of 150 ms. Nothing else on TikTok changes.

## Reproduce

```
npm run build
node scripts/tiktok-latency.mjs run .output/chrome-mv3 qa/tmp/tt-1 75000 '{"rule":{"likes":{"on":true,"min":20000},"comments":{"on":false,"min":100},"views":{"on":false,"min":100000}}}'
node scripts/tiktok-latency.mjs probe qa/tmp/tt-probe 2
node scripts/tiktok-latency.mjs mute qa/tmp/tt-mute 250 12
node scripts/tiktok-latency.mjs report qa/tmp/tt-1 qa/tmp/tt-probe qa/tmp/tt-mute
```

The wait after a video arrives is settleMs in src/entrypoints/tiktok.content.ts. To compare other values, build once for each, copy .output/chrome-mv3 to a directory of its own, and run one build after the other in every round.

Use a new output directory for every run. The script needs network access to TikTok and a display (the browser is not headless). To compare with 0.4.1, build it from the v0.4.1 tag and run it the same way.

## Limits

- Desktop layout, signed-out For You, Playwright's Chromium, a fast wired connection, one afternoon. A signed-in feed may add videos further ahead and keep the control enabled more often, and TikTok can change; every timing above is an observation, not a documented value.
- The recommendation feed differs between runs, and the runs of the two builds were made one after the other, not paired. The comparison rests on quantities the feed does not decide: when the control was offered and when the extension pressed it, and the videos for which the control was never disabled.
- The default-bar runs are small (21 and 33 skipped videos). The 100,000-like runs have no 0.4.1 counterpart.
- Instagram Reels was not measured. Signed out, /reels/ redirects to the login page, and no signed-in browser was available for this change. Its 450 ms wait and its sound are as they were in 0.4.1, and whether Reels also keeps its Next control disabled, takes a press while it scrolls or remembers a mute is open. The same three measurements (run, probe, mute) can be repeated on Reels in a signed-in profile once the script has been adapted to its page.
- Local evidence: qa/tmp/tt-pace (not committed).
