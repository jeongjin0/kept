# Skip chip: where it sits and how it looks · 0.5.0

2026-10-12 KST. The owner found the skip chip hard to see and asked for several positions to choose from. This report records what was looked at, on real frames, what was chosen and what was not checked. The rules are in [SPEC.md](../SPEC.md#the-skip-chip).

## What was wrong

0.4.4 put the chip 32 px above the bottom edge of the window, centred on the window. In a 1440 x 900 window, signed out, in Chromium with the built extension:

- YouTube Shorts: the video is 452 x 804 px at x 566, y 64. Its caption (channel, subscribe button, title) is a block 420 x 160 px at y 692, so a chip whose bottom edge is at y 868 sat on the channel row and the title, on the bottom edge of the video.
- TikTok For You: the video column is 488 x 868 px at x 476, y 16, with the caption at its bottom left. The chip sat on the caption here too. A landscape clip is shown 832 x 468 px in the middle of the page, and the chip then hung in empty page about 200 px below it, away from the video.
- The chip body was the near-black of the page (#10110F) with a 1 px border at 20% white. Over the black bars that TikTok puts around a clip it was text without a silhouette: the body against black is 1.1 : 1.

## What was looked at

Real frames, taken from a fresh signed-out profile with the extension and a 20,000-like bar so that it skipped: a bright YouTube Short and a dark TikTok video. The chip was set over a frozen frame at each position, so that every position is on the same frame ([sheet](screenshots/chip-positions.png)).

| Position | Seen on the frames |
| --- | --- |
| Bottom, 32 px up (0.4.4) | On the caption on both sites, and lost in the dark bars of the dark TikTok video |
| Top, centred on the video | Clear of the caption and the buttons, below YouTube's player controls (y 81 to 128) |
| Middle | The most visible, and it covers the face or the subject |
| Lower, above the caption | Above the caption block on both sites, but it can meet the video's own subtitles, which sit in the lower middle of many Shorts |
| Beside the video, in the margin | Not used. YouTube leaves 326 px between its sidebar and the video at this width, but TikTok leaves about 236 px between its left rail and the video, which is less than the chip's 290 to 300 px, so the chip would cover the site's menu |
| Top right of the window | Not used. It is far from the video, next to the sites' own login buttons |

Top is the default, with Middle and Lower in Settings. The height is measured from the window and the column from the video: while TikTok scrolls to the next video the video's box is still moving, but its column is not.

## The look

Seven looks were tried at the top position on both frames: the old one; the dark body with an accent ring; with a soft accent glow; a white outline; cream; and an accent fill in two shades. A cream chip disappears on a bright frame, and an accent fill is the loudest but reads as an alert for something that happens every few seconds. The dark body with an accent border and glow is readable on both (the words are 16.7 : 1 on the body; the body is 18.8 : 1 against a white video) and visible on black (the border is 6.4 : 1 against black). Text is 15 px at weight 600 instead of 14 px at 500, the dot 28 px instead of 24, the buttons 34 px tall. One ring widens and fades when the chip appears, which is the one motion the eye picks up.

## Checked

- Built 0.5.0 on live YouTube Shorts, 120 s, 20,000-like bar, signed out: 28 skips, 27 chip texts, every one centred on the video's column (x 792, the video is 566 to 1018) and 140 px from the top of the window ([time saved](time-saved.md) has the other figures). Lower and Middle were set from storage and looked at on a live frame as well.
- Built 0.5.0 on live TikTok For You at the same bar, 90 s and 45 s: 25 and 29 skips, every chip centred on the video's column and 140 px from the top. A debug run that recorded the video's box next to the chip's position showed the chip at x 724 for a column from 304 to 1144 (a landscape clip) and for one from 480 to 968. TikTok's column moves by 4 px between sessions (its centre was 720 in some and 724 in others), and the chip followed it.
- Browser tests: the chip is centred on the video and sits at 18% of the window's height (top), 50% (middle) or 28% up from the bottom (lower), also when it is updated in place; in a 360 px window it stays inside; the setting is in Settings and Reset puts it back to the top.

## Not checked

- Instagram Reels: signed out it redirects to the login page. The chip finds the reel through the same lookup of the video on screen, but where it lands on Instagram's page was not seen.
- Windows other than 1440 x 900 on the real sites. A narrow window is covered by a browser test on a controlled page.
- Whether people find the chip easier to see. This was judged from frames, not tried on people.
