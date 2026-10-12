# Time saved · 0.5.0

2026-10-12 KST. The popup and Settings show how much time the skips have saved. This report says what the figure is, where the 3 seconds in it come from, what was measured on the real sites and what the figure cannot tell. The rules are in [SPEC.md](../SPEC.md#time-saved).

## What the figure is

An estimate of the time a person would have spent if they had seen each skipped video, decided they did not want it and swiped it away themselves, less the time ScrollPlus kept the skipped video on screen:

    time saved = skips x 3 s - the time those videos were on screen

Each skip adds its on-screen time to a total, limited to 3 seconds, so a slow skip saves nothing and never takes time away from the others. A skip whose time is unknown counts as saving nothing. The total is kept on the device as totalSkips (since, count, onScreenMs), is not cleared by Reset, and starts when 0.5.0 is installed or updated to.

## Where the 3 seconds come from

It is a cautious reading of public TikTok viewing data, not a measurement of the person using ScrollPlus. "State of the Feed" ([wrapped.vantezzen.io/state-of-the-feed](https://wrapped.vantezzen.io/state-of-the-feed)) reports watch histories donated by 16,981 TikTok users (464 million videos, 83 countries). In the 2026 panel the median video was swiped away after 6 seconds, and 33% of videos were gone within 3 seconds. By its time on screen, a video was gone within 1 s in 6% of cases, within 2 s in 13% more, and within 3 s in 8% more. Those numbers include videos people liked and watched on purpose, so the time spent on a video that is dismissed is less than the median, and about 3 seconds is a fair upper reading for "I looked and did not want it". Taking the quick dismissals alone (under 8 seconds) gives a mean of about 3.1 s from the bucket mid-points. Nothing here is specific to YouTube Shorts or Instagram Reels, and the source is a single research site: that is why the interface calls the figure an estimate and says how it is made.

## What was measured

The on-screen time is measured by the page script: from the moment the skipped video was first seen as the active one to the moment the site had moved on from it. Built 0.5.0, fresh signed-out Chromium profile, 20,000-like bar so that it skipped, a calm scroller that pressed the site's own Next control after 2.5 s on a video the extension kept:

| Site | Run | Skips | Time on screen, total | Per skip | Saved |
| --- | --- | ---: | ---: | ---: | ---: |
| YouTube Shorts | 120 s | 28 (9 chips were "Skipped · ad") | 14.8 s | 529 ms | 69 s of 84 s |
| YouTube Shorts, an earlier build of 0.5.0 | 150 s | 44 (5 were ads) | 23.7 s | 540 ms | 108 s of 132 s |
| TikTok For You | 90 s | 25 | 10.7 s | 428 ms | 64 s of 75 s |
| TikTok For You, an earlier build of 0.5.0 | 90 s | 50 | 19.2 s | 385 ms | 131 s of 150 s |

The first and third rows are the final code. The per-skip times agree with the dedicated timing reports ([YouTube](skip-timing.md), [TikTok](skip-timing-tiktok.md)). In the YouTube runs the number of chips seen equals the number the extension stored (a skip that follows a skip of the same text shows one text, so 28 skips were seen as 27 different texts), and the stored total equals the sum of its parts.

## What the figure cannot tell

- The 3 seconds is one assumption for everybody. A person who dismisses a video faster saves less than the figure says, and one who takes longer saves more.
- The measured on-screen time can be shorter than the real one by the moment between a video arriving and the first look at it. Against 3 seconds that is a small share.
- It counts what ScrollPlus did: a video the person would have watched for a while is a video it skipped on a like count, and the figure treats it like any other.
- Instagram Reels was not measured here: signed out it redirects to the login page. Its timing is in [skip timing on Instagram](skip-timing-instagram.md).
- Counting starts at 0.5.0. Skips made by 0.4.x are not added, only today's count carries over.
