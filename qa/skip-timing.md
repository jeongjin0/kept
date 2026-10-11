# Skip timing on YouTube Shorts

2026-10-11 KST. Why a skipped Short stays on screen for about half a second, what ScrollPlus adds to that, and what can be shortened. Measured on live, signed-out public YouTube Shorts in fresh Chromium 140 profiles at 1280×800 (desktop layout), first with the built 0.4.0 extension, then with the 0.4.1 candidate. Runs used the default bar (5,000 likes) or a stricter one (20,000 likes) to provoke many skips in a row, as stated for each. Nothing here covers TikTok, Instagram, a signed-in feed or YouTube's mobile site.

## Short answer

A Short that ScrollPlus skips is the active one for about half a second: median 0.52 s when the move onto it was a person's, and 0.77 s in 0.4.0 when it follows another automatic skip. ScrollPlus decides within 2 ms of YouTube finishing the move onto a Short (median; 14 ms at most; 237 skips) and presses the page's own Next control at once. The rest is YouTube:

- YouTube does not start a move until about 0.37 s after the previous move finished, however early Next was pressed (346 presses made within 0.25 s: median 0.37 s, 90% between 0.32 and 0.51 s).
- A move then takes about 0.14 s from start to finish (median).
- So a Short that is skipped straight away is the active one for about 0.52 s, and the extension cannot make that shorter. Pressing Next again while a move is under way does not help either: the second move finished 0.45–0.54 s after the first one had finished in all ten presses made 120 ms or more after the first press.

What the extension can change is the wait it added between two automatic skips (450 ms in 0.4.0). 0.4.1 presses 150 ms after it has confirmed the previous move, which is about the latest press that still gets the move to start as early as YouTube allows. Skips that follow another skip drop from 0.77 s to 0.51 s on screen.

## How one skip unfolds

All times are medians from the runs below, measured from the moment the new Short becomes the active one (YouTube finishes the move and the address changes).

| Step | Time | Who |
| --- | ---: | --- |
| The Short is active; its counts are in the page | 0 | YouTube |
| ScrollPlus has decided and pressed Next | 2 ms | ScrollPlus |
| YouTube starts the next move | 0.37 s | YouTube |
| YouTube finishes it; the skipped Short is no longer active | 0.52 s | YouTube |
| The chip with the reason and Undo is on screen | 0.55 s | ScrollPlus |

The Short is on screen for a little longer than it is "active": it slides in while the move onto it finishes, and slides out while the next move runs.

YouTube prefetches the next Short about a second after a Short becomes the active one: a `player` request for it, whose answer carries that Short's like count, is made 1.03 s after the move finished (median; 0.85–1.28 s; 175 moves with no press for 1.4 s). Only the first Short of the queue has this data when the page loads. A Short skipped within a second is therefore always followed by one whose data is requested on demand, but that does not change the half second: the on-demand requests are made when the move starts and are answered within the 0.14 s the move takes.

## Skips in a row

0.4.0 waited 450 ms after a move before it pressed Next again, and it looked at a Short that arrived during that move only at its next 400 ms poll. A Short that follows another skip was therefore on screen for about 0.79 s, against 0.52 s for the first one. The 450 ms was a rule in SPEC.md, not a measured value. Five-minute live runs at a strict bar (20,000 likes), changing only the wait and when the next Short is judged:

| Wait after the move | Next Short judged | Skip that follows a skip: on screen, median | Presses the site did not act on |
| --- | --- | ---: | ---: |
| 450 ms (0.4.0) | at the next poll | 0.77 s (n=36) | 0 of 87 |
| 150 ms | at the next poll | 0.51 s (n=52) | 1 of 104 |
| 0 ms | at the next poll | 0.52 s (n=26) | 1 of 61 |
| 0 ms | at once | 0.51 s (n=30) | 1 of 74 |
| 150 ms | at once | 0.50 s (n=17) | 0 of 57 |

Any wait up to about 200 ms gives the same half second, because YouTube holds the next move until about 0.37 s after the last one finished: the press has to arrive early enough for the move to start then, and no earlier. In 80 controlled presses without the extension, a press 0-180 ms after the previous move finished produced a move that finished 0.48-0.51 s after it (median for each offset), and later presses finished later by the same amount as they were late. 0.4.1 presses 150 ms after it has confirmed the move (150-200 ms after the move itself, because the confirmation polls every 50 ms) and judges the next Short as soon as the move is confirmed, so the press lands there every time instead of anywhere from 10 to 420 ms.

Twenty minutes each at the same strict bar, 0.4.0 against the 0.4.1 candidate (the 150 ms wait and judging at once, before the changes in the next two sections):

| 20 minutes, strict bar | 0.4.0 | 0.4.1 candidate |
| --- | ---: | ---: |
| Skips | 318 | 379 |
| First skip of a row: on screen, median (95%) | 0.53 s (0.67 s) | 0.52 s (0.62 s) |
| Skip that follows a skip: on screen, median (95%) | 0.79 s (0.85 s) | 0.51 s (0.66 s) |
| Mean on screen per skipped Short | 0.66 s | 0.55 s |
| Presses the site did not act on | 1 of 318 | 6 of 385 |

At the default bar (5,000 likes) the candidate skipped 72 Shorts in 10 minutes: 53 first skips at 0.52 s, 19 skips that followed a skip at 0.53 s, none not acted on.

The final 0.4.1 build, with all three changes, 10 minutes at each bar:

| Final 0.4.1 build | Strict bar (20,000) | Default bar (5,000) |
| --- | ---: | ---: |
| Skips | 144 | 92 |
| First skip of a row: on screen, median (95%) | 0.52 s (0.57 s), n=89 | 0.52 s (0.66 s), n=62 |
| Skip that follows a skip: on screen, median (95%) | 0.51 s (0.63 s), n=55 | 0.51 s (0.55 s), n=30 |
| Mean on screen per skipped Short | 0.52 s | 0.54 s |
| Skipped Shorts on screen for over 1 s | 2 (1.05 s, 1.47 s) | 2 (1.04 s, 2.14 s) |
| Kept Shorts muted, paused or not playing 1 s after arriving | 0 of 208 | 0 of 219 |

## Presses the site did not act on

Now and then YouTube does nothing for a press: no move starts and no start event fires. All 8 cases with queue information (6 in the 20-minute candidate run, 1 in the 20-minute 0.4.0 run, 1 in a 5-minute run) happened when the site had one or two Shorts left in its queue, and while it was fetching the next batch (position in the queue / queue length: 122/124, 188/190, 304/305, 383/384, 683/685 and 753/754 in the candidate run, 214/215 in 0.4.0, 71/73 in the 5-minute run). In the controlled run without the extension 79 of 80 presses, 0-600 ms after the move, were acted on; the one that was not had one Short left. The difference between 1 of 318 and 6 of 385 is not significant (p about 0.1), but it fits the faster run using up the queue sooner: it skipped 19% more Shorts in the same time.

0.4.0 waited 1.8 s for the move before it pressed again, so the retry came 2.2 s after the first press and the Short stayed for 2.3-2.4 s. Over 1,178 automatic presses in nine runs, a move started within 0.53 s of each of the 1,168 presses the site acted on (median 0.33 s, 99% within 0.51 s). So 0.4.1 presses again when no move has started 0.7 s after a press, and every 0.4 s after that. A press made before a move starts does nothing, and nothing is pressed again once a move has started, so a slow move is never doubled. In the final runs three Shorts for which 0.4.0 would have waited 2.2 s for its retry moved on after 1.04 s, 1.05 s and 1.47 s, with the second or third press. The fourth, 2.14 s, was the first Short after the page loaded: the site ignored a press for about 2 s while it started up, and the rule is still off then because no move has been announced yet. 0.4.0 behaves the same there, and it happened once in 11 runs.

## Sound

A Short that is skipped has already started to play when ScrollPlus decides. In all 12 skips of a 3-minute run it had begun playing (the video element's playing event) between 0.15 s before and 0.04 s after the move onto it finished, and it played for 0.58-0.75 s (median 0.63 s) until the next Short replaced it. With sound on, each skip is heard as a short burst of that Short's opening.

Muting it does not carry over to the next Short, because the site sets the volume again whenever it loads one. In 24 trials without the extension (8 each of muting the skipped Short, pausing it, and doing nothing) the next Short was playing with sound 1.8 s after it arrived. After the site's own mute button was clicked twice, which makes it store the volume, 8 further mute trials left the stored value unchanged and the next Short unmuted. 0.4.1 mutes the Short only while it is being skipped, and only if the player was not already muted.

## What does not help

- **Pressing earlier or twice.** A second press within 60 ms of the first was not acted on (4 of 4). From 120 ms on it was acted on, but the second move still finished 0.45–0.54 s after the first one finished (10 of 10; no extension).
- **Deciding before the Short arrives.** When the previous Short was watched for more than about a second, the next Short's like count is already in the page, but ScrollPlus reads counts when YouTube announces the move. Knowing it earlier would not help: the next move cannot start sooner than the 0.37 s above whatever is known.
- **Hiding or covering the Short while it is skipped.** SPEC.md forbids restyling the host page, and it would only hide the 0.37 s the Short stands still, not the move onto it.

## What 0.4.1 changes

- YouTube: the next skip follows 150 ms after the move instead of 450 ms, and a Short that arrives while the previous move is still being confirmed is judged at once. TikTok and Instagram keep 450 ms and the old poll, because they were not measured.
- YouTube: a press with no move started 0.7 s after it is pressed again, every 0.4 s, and never once a move has started. The rule stays off until the page has announced a move at least once.
- YouTube: the Short being skipped is muted until the move ends, if it was not already muted.
- The first skip of a row stays at about 0.52 s on screen. That part is YouTube's.

## Reproduce

```
npm run build
node scripts/skip-latency.mjs run .output/chrome-mv3 qa/tmp/skip-latency-1 300000
node scripts/skip-latency.mjs run .output/chrome-mv3 qa/tmp/skip-latency-2 300000 '{"rule":{"likes":{"on":true,"min":20000},"comments":{"on":false,"min":100},"views":{"on":false,"min":100000}}}'
node scripts/skip-latency.mjs report qa/tmp/skip-latency-1 qa/tmp/skip-latency-2
```

Each run starts a fresh signed-out Chromium profile, so use a new output directory every time. The script needs network access to YouTube and a display (the browser is not headless).

## Limits

- Desktop layout, signed-out public feed, Chromium 140, a fast wired connection. YouTube's behaviour can change; the 0.37 s and the one-second prefetch are observations, not documented values.
- The recommendation feed differs between runs and between people, so the share of skipped Shorts and of chains differs too, and the runs are not paired. The strict runs exaggerate chains on purpose.
- TikTok and Instagram were not measured. The change in 0.4.1 applies to YouTube only; they keep the 450 ms wait.
- Local evidence: `qa/tmp/flash` (not committed).
