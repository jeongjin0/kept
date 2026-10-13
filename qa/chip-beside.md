# The skip chip beside the video · 0.7.0

The chip used to sit on the video, at the top. That covered what a person was looking at, so it moved to the empty space next to the video.

## What it does

- A card 228 px wide. Its right edge is 16 px from the left edge of the video on screen. Its middle is the middle of the window. That is used and not the video's own middle, because TikTok's video is still scrolling when the chip appears and its box is moving.
- If the left side has no room, or has something a person reads or presses under the card (a link, a button, an image, an input, a video), it goes to the right of the video, after the column of buttons the sites put there (78 px).
- If neither side has room for a card, a skip shows as a pill 52 px wide: the mark, how many in a row, and Undo as a round button. A pause chip needs its two buttons and has no pill. It goes over the video, centred, as the old top did.
- The old places, top, middle and lower, are still in Settings. They put the chip over the video, as before.

## A row of skips

When a video is skipped while the chip of the one before is still up, the same chip takes a line: the head says how many in a row ("3 skipped in a row" / "연속 3개 넘김"), and each reason is listed under it, newest first, at most four, the older ones fainter. After the chip has gone (2.5 s after the last skip) the next skip starts a row of one. One skip looks as it did, with the plain reason and Undo.

Undo still moves back one video, the newest. Undoing the whole row was not built.

## Seen

On 2026-10-13, built extension, signed out, 1440 by 900 unless noted:

- YouTube Shorts: a card with three skips, left of the video, centred on it, clear of the site's left menu.
- TikTok For You: a card with four skips, left of the video, clear of the menu.
- YouTube Shorts at 760 px: the margin is 154 px, a card does not fit, a pill with ×3 and Undo, left of the video.

Images: [YouTube](screenshots/review-070/yt-run/real.png), [TikTok](screenshots/review-070/tt-run/real.png), [narrow](screenshots/review-070/yt-narrow/real.png).

## Not seen

A signed-in page. Instagram Reels (signed out it goes to the login page). A margin that holds something the site draws late, such as a comments panel. The nine-point look is made once when the chip is placed and again 250 ms later, not while the page changes under it.
