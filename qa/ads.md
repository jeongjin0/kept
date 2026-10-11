# Skip ads · 0.4.0

2026-10-11 KST. Skip ads is a switch in the popup and in Settings, off by default. Off, an ad stays whatever its like count. On, ScrollPlus moves past an ad that fills the player as soon as the site marks it as one. The rules are in [SPEC.md](../SPEC.md#ads). This report covers how each site marks an ad, what was measured on real YouTube Shorts, and what was not.

## An existing bug this fixed

Until 0.3.7 a YouTube Shorts ad was an ordinary video to ScrollPlus. A real ad that showed 125 likes was therefore skipped by the default like rule, although ads are meant to stay. The same routed-page test, run against the published 0.3.7, fails at "an ad stays by default" for YouTube (the ad was skipped). On the other two sites ads already stayed by default.

## How each site marks an ad

**YouTube Shorts: measured.** A Shorts ad has its own video id and URL like any Short. Its reel renderer carries an `is-ads-overlay` attribute, and the feed response flags the same item with `adClientParams.isAd`. Over 377 Shorts viewed in a fresh signed-out profile, 13 of them ads that the feed flagged, using the feed flag as ground truth:

| Marker | Ads found | Ordinary videos marked as ads |
| --- | ---: | ---: |
| `is-ads-overlay` attribute on the reel renderer (used) | 13 of 13 | 0 of 364 |
| `ytd-ad-slot-renderer` element (not used) | 13 of 13 | 9 of 364, for about 100–200 ms each |

The attribute changed within 0–1 ms of YouTube's navigate-finish event, in both directions, in all 26 transitions measured, and was already set the first time the page was polled after every ad appeared. The ad-slot element stays in the page for up to 200 ms after the next Short has started, which is why it is not used: an engine reading it would treat the Short after an ad as an ad. Only the attribute is read, and the click is checked against it again (below).

**TikTok: from the item data, not seen live.** The item data the page loads carries `isAd`, the same flag that has kept TikTok ads since 0.3.1. A signed-out TikTok run (20 minutes, 100 items, one flagged as an ad) never showed that ad as the active video because a sign-up dialog interrupted the feed 286 times, so no live TikTok skip was observed for this change. TikTok ads were observed and kept in a signed-in session earlier ([signed-in QA](signed-in-smoke.md)).

**Instagram: from the item data and the visible disclosure, not seen live.** The flag is `is_ad` in the loaded data, or a visible "Ad", "Sponsored" or "광고" label inside the player of the reel on screen ([advertisement report](instagram-ads.md)). A data flag outranks a layout guess, so a flagged photo-style ad is skipped too. This path is covered by routed pages only.

## Controlled-page regressions

`e2e/skip-ads.spec.ts` runs the shipped scripts against routed pages for all three sites: the ad stays by default even with 125 likes, the real popup switch turns the rule on and applies to the ad already on screen, the chip reads "Skipped · ad" and counts once, the ordinary video after the ad stays (the YouTube page leaves the old ad slot in place for 300 ms, as the real page does), Undo returns to the ad and it stays for the session, an ad with 90,000 likes is skipped too, and a site that is switched off keeps its ads. Further tests cover an Instagram ad known only by its disclosure and the popup, options and Reset paths. Rule and engine behavior is covered by unit tests, including the guards against a stale decision.

## Live YouTube check

The built 0.4.0 extension, in a fresh signed-out Chrome for Testing profile on real Shorts, one hour with Skip ads on and one hour with it off (a one-off script; the profile and raw reports stay under `qa/tmp/`). Ads are identified from the feed flag, never from what ScrollPlus decided. An ordinary video is left after 4 seconds and an ad after 9 seconds, by pressing the page's own Next control, so anything shorter than that was ScrollPlus.

| | Skip ads on | Skip ads off |
| --- | ---: | ---: |
| Videos viewed / ads among them | 1,062 / 69 | 823 / 101 |
| First sightings of an ad skipped by ScrollPlus | 65 of 65 | 0 of 97 |
| Time an ad stayed on screen (min / median / max) | 0.45 / 0.56 / 0.87 s | 9.28 / 9.37 / 9.60 s |
| Chip "Skipped · ad" after the ad | 65 of 65 | none |
| Repeat sightings of an ad skipped earlier, skipped again | 0 of 4 | 0 of 4 |
| Ordinary videos skipped by the ad rule | 0 | 0 |
| Ordinary videos skipped by the like rule (each shown a like chip) | 242 of 993 | 150 of 722 |
| Ordinary videos marked as an ad when they opened | 0 | 0 |
| Page errors | 0 | 0 |

## Limits

- An ad the site serves again with the same id in the same page session is not skipped a second time: ScrollPlus never decides an id twice, which is also why going back with the site's Previous control leaves a video alone. Four of 69 ad sightings were repeats.
- TikTok and Instagram skipping rest on the sites' own ad flags and were checked on routed pages only. Instagram photo-style ads without a data flag are kept.
- YouTube markup can change. If the attribute disappears, an ad becomes an ordinary video again, judged by its counts, as before 0.4.0.
- Signed-out Chrome for Testing on macOS only, one site layout and region at the time of the run (Korean interface). Signed-in feeds, other regions and ad formats were not sampled.
