# Skip timing on Instagram Reels

2026-10-11 KST. How long a skipped reel stays on screen on Instagram Reels, what ScrollPlus 0.4.2 did there, and what 0.4.3 changes. Measured on live, signed-in Reels in Aside's Chromium 153 (Aside 1.0.928.1, macOS ARM64), with the two Instagram content scripts of the built extension run in the page behind a stand-in for chrome.storage and chrome.runtime (see [Method](#method)), using [scripts/instagram-latency.mjs](../scripts/instagram-latency.mjs). Each run lasted 80 s at a strict bar (20,000 likes). Nothing here covers a phone layout, a different account, or the extension installed the ordinary way.

## Short answer

On 0.4.2 a skipped reel was on screen for a median 0.62 s (mean 0.78 s). 0.4.3 brings it to 0.32 s (mean 0.52 s), and the share of skipped reels that stayed over 1 s from 11% to 6%. The first skip of a row went from 0.31 s to 0.21 s and a skip that follows a skip from 0.64 s to 0.35 s. Two things caused the time:

- **A wait that Reels does not need.** Between two skips in a row 0.4.2 waited 450 ms after the previous move had been confirmed, and pressed 0.49 s (median) after a reel had arrived. Reels takes a press while it is still scrolling and puts the next reel on screen 0.14 to 0.19 s after it (medians for presses made at different moments), so the wait only kept the skipped reel on screen. 0.4.3 waits 100 ms after the previous move.
- **A look at the page every 400 ms.** The first skip of a row followed the arrival of the reel by 0.16 s (median) and by about 0.4 s at the 90th percentile, depending on when the 400 ms look came. 0.4.3 looks while the feed scrolls, as it does on TikTok, and presses as soon as the reel is on screen enough to be moved on from (at least 60% of it).

What remains is mostly Reels itself: its scroll takes about half a second, and it loads reels 13 at a time (see [Loading](#loading)). The sound is unchanged: every reel in these runs started muted, so what a skipped reel would have been heard for was not measured, and ScrollPlus does not touch the sound on Reels.

## How Reels moves

From the recordings of all 16 runs (684 presses by ScrollPlus, 381 by the simulated person):

- A press starts a scroll within 0.02 s (median; 90% within 0.06 s). The address of the reel changes 0.14 s after a press by the person and 0.19 s after one by ScrollPlus (medians), and the reel counts as the active one (at least 60% on screen) 0.14 s and 0.16 s after. The scroll then runs for about half a second.
- Presses made while it is still scrolling are taken. All 669 presses by ScrollPlus that had at least 0.6 s left in their run started a scroll within 0.25 s, at every wait from 450 ms after the previous move down to none. The first probe without the extension (nine pairs of presses, the second 30 to 600 ms after the first) found two of the second presses, made 86 and 244 ms after the first, followed by no second move (in the second pair the first press was itself answered only after 1.5 s); no later run saw a press that started no scroll.
- A press made right after a reel arrived is answered a little later than one made 0.1 s after (0.19 s against 0.15 s, median), and still leaves the reel on screen for less time overall. There is no edge like TikTok's, where a press made within 0.16 s of an arrival is answered 0.1 s late (see [skip timing on TikTok](skip-timing-tiktok.md)):

| Press made after the reel arrived | Presses | Press to next reel on screen, median | Skipped reel on screen, median |
| --- | ---: | ---: | ---: |
| Under 40 ms | 61 | 0.19 s | 0.20 s |
| 40 to 79 ms | 31 | 0.15 s | 0.21 s |
| 80 to 119 ms | 39 | 0.18 s | 0.27 s |
| 120 to 159 ms | 70 | 0.15 s | 0.29 s |
| 160 to 199 ms | 110 | 0.15 s | 0.32 s |
| 200 to 299 ms | 109 | 0.16 s | 0.39 s |
| 300 to 699 ms | 187 | 0.16 s | 0.62 s |

(One press per reel, answered within 0.6 s, from builds with different waits.) The sooner ScrollPlus presses, the shorter the skipped reel stays.

## Loading

Reels sends the reels of its stream 13 at a time, one batch every 15 s (median) while reels are skipped as fast as these were. When a press moves the page to the end of what it has, it scrolls on to nothing and waits for the next batch: after 38 of the 684 presses by ScrollPlus (1.8 a minute) the next reel was on screen only after 1.2 to 4.7 s (median 3.6 s). The skipped reel had left the screen by then: in 36 of the 38 waits no video was on screen more than 2% of its height until the next reel came, and in the other two a sliver of one was (23 and 24%). These waits are why the mean is far above the median in every build, and they were as frequent on 0.4.2 as on 0.4.3.

ScrollPlus does not press while no reel is on screen enough to be moved on from, so it does not press again into that wait, and the simulated person was made to do the same.

## The builds compared

Each build is the packaged 0.4.2 scripts with the numbers named below, apart from the last row, which is built from the source. Between two builds the feed was a different one, so the figures say less than the quantities the feed does not decide (the waits and the answers above). A calm scroller was simulated: 2.2 s after a reel that ScrollPlus did not skip, it pressed the site's own Next control, and it tapped Keep going when the pause chip appeared (every six skips in a row).

| Build | Wait after the previous move | Wait after the arrival | Looks at the feed | Runs | Skipped reels | On screen, median (mean, 90%) | Over 1 s | First skip of a row, median | Skip after a skip, median |
| --- | ---: | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: |
| 0.4.2 as shipped | 450 ms | none | every 400 ms | 4 | 150 | 0.62 s (0.78 s, 1.15 s) | 17 (11%) | 0.31 s | 0.64 s |
| B | 100 ms | 150 ms | while it scrolls | 5 | 221 | 0.37 s (0.61 s, 0.88 s) | 16 (7%) | 0.33 s | 0.38 s |
| C | none | none | while it scrolls | 2 | 88 | 0.33 s (0.56 s, 0.66 s) | 6 (7%) | 0.22 s | 0.35 s |
| D | 50 ms | 80 ms | while it scrolls | 2 | 85 | 0.38 s (0.50 s, 0.69 s) | 4 (5%) | 0.27 s | 0.39 s |
| **0.4.3** | 100 ms | none, until 60% of the reel is on screen | while it scrolls | 3 | 130 | 0.32 s (0.52 s, 0.69 s) | 8 (6%) | 0.21 s | 0.35 s |

B, C and D differ little in a row of skips (0.35 to 0.39 s): pressing earlier is answered later, and the two nearly cancel. They differ in the first skip of a row, where ScrollPlus presses at once or waits, and 0.4.3 is the fastest of them (0.21 s) without the failure C has in principle: the address of a reel changes a little before the reel is on screen enough, and a press made then is refused by ScrollPlus's own check, which 0.4.2's 400 ms retry turns into a 0.4 s loss (shown on a routed page, not on the live site). 0.4.3 looks again every 50 ms until the reel is on screen enough.

## Checks

- Moved on only from reels under the bar. Of the 684 presses by ScrollPlus, none was made from a reel at or above 20,000 likes. For 150 of them the recorder had not logged the like count of the reel (the first nine runs logged less); the other seven runs (305 presses) have all but one, and none of those was at or above the bar.
- No reel moved past. In the seven runs that logged the order the page lists its reels in, 389 steps from one reel on screen to the next were each one place on in that order.
- Sound. In every run every video that was on screen was muted when it arrived. The scripts never changed the volume or the muted state of a video: no volumechange event was recorded.
- None of the 621 reels recorded was flagged as an advertisement by the page's data, so the ad paths were not observed live.

## What 0.4.3 changes on Instagram

- The wait after the previous move is 100 ms instead of 450 ms.
- While Reels scrolls, and when it stops, the active reel is looked at (at most every 60 ms), not only at the next 400 ms look.
- ScrollPlus presses once the reel is on screen enough to be moved on from (at least 60% of it) and looks again every 50 ms until it is, up to 5 s after the reel opened, as before. A person who scrolls on or starts typing in the meantime is not pressed past.
- Nothing else on Instagram changes: rules, defaults, and the sound.

## Method

The browser was signed in to Instagram, and an extension cannot be loaded into it without a file dialog. So the script opens /reels/, defines a stand-in for the parts of chrome.storage and chrome.runtime that the scripts use (settings in memory, the session list of reels kept after an Undo, the skip counter), runs the two Instagram content scripts of the built extension (instagram-main.js and instagram.js, byte for byte from the package, or with the numbers of a build) in the page's own world, and records what the page does: the address, the scroll position and the position of every video once per frame, the video that is on screen at least 60%, the chip, the messages between the two scripts, the presses, and the volume of the videos. In an installed extension the second script runs in an isolated world and the settings come from chrome.storage; the timers, the messages between the scripts and the page are the same. The script presses only the site's own Next control: it does not like, follow, comment on or change the sound of anything, and it leaves its tab when it is done.

## Reproduce

```
npm run build
node scripts/instagram-latency.mjs build .output/chrome-mv3 qa/tmp/ig-1.js 80000
aside repl --host <a Mac whose Aside is signed in to Instagram> "$(cat qa/tmp/ig-1.js)" > qa/tmp/ig-1.out
# fetch the artifacts/ig-1.json printed by the last line of the output, then:
node scripts/instagram-latency.mjs report qa/tmp/ig-1.json
```

Use a new name for every run, and keep the tab visible for the whole run (the recorder works on animation frames, which a hidden tab does not draw). A run is 80 s because the REPL stops a script after 120 s. To compare other numbers, change the startFilter call in src/entrypoints/instagram.content.ts, build, copy .output/chrome-mv3 to a directory of its own, and run one build after the other in every round.

## Limits

- One account, one machine and one hour (22:30 to 23:05 KST), in a window about 1,000 px high at desktop width. The feed is the account's recommendation feed and differs between runs. The runs of the builds were made one after the other.
- The extension was not installed the ordinary way, so what an installed extension adds is not covered: the isolated world, the background worker, the chip's translated words (the stand-in has no chrome.i18n, so the chip was in English), the popup and the options page.
- The simulated person is calm and presses the Next control. A person who scrolls faster, or with a wheel or trackpad, was not simulated: wheel events sent to the page (up to 950 px in 0.4 s) moved the reel by at most 220 px, which then returned, so the reels did not flip. ScrollPlus presses as soon as a reel is on screen enough, and that can be while such a gesture is still arriving. Whether the page takes the press then was not measured, and neither was it for 0.4.2, which pressed at the next 400 ms look.
- The B, C and D rows are exploratory (two to five runs each). The 0.4.3 row is three runs and 130 skipped reels.
- Instagram can change; every timing above is an observation, not a documented value.
- Local evidence: qa/tmp/tt-pace (not committed).
