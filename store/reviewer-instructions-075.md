# Chrome Web Store update test instructions · 0.7.5

Prepared 2026-10-25. The exact package, checks and submission state are in [update checkpoint](update-075.md). This is a test procedure, not a claim that every live case has passed. The dashboard summary links to the immutable revision of this file and stays within its 500-character limit. Reviewer username/password fields stay blank: ScrollPlus has no account system.

## Setup

Use desktop Chrome 120 or later. Install the submitted 0.7.5 package. Defaults: enabled, Balanced minimum 500 likes, Skip ads on, Keep accounts I follow on, skip notifications on in Compact style. No ScrollPlus sign-in or setup is needed. YouTube Shorts/TikTok can expose feeds while signed out; Instagram Reels remains experimental and needs your own Instagram login. Never share the owner's credentials.

## Focused update checks

1. Open `https://www.youtube.com/shorts/` or `https://www.tiktok.com/foryou`. For Reels, use your own Instagram session and open its Reels feed. Unknown counts and photo posts stay.
2. In Settings, temporarily raise Likes above a readable current count with Comments/Views off. The site advances. A compact count and Undo appear briefly in safe space left of the video; they remain hidden if no safe space exists. Reels waits for scrolling to settle. Open the count by click or keyboard for details when a full card fits; Settings also offers Detailed. Neither style covers the video or moves to its right. Hover/focus keeps controls available; the notice normally lasts 2.5 seconds.
3. After a skip's notice expires, open the extension popup while still on the immediate next video. Use Undo: the last skipped video returns. It stays kept through reloads/new tabs for the browser session. Manually move further, leave the feed or reload before Undo and the popup no longer offers that old target. Browser restart/extension update clears temporary session choices.
4. Allow six consecutive skips. Filtering pauses. Even if notifications are off or there is no left gutter, open the popup: Keep going resumes; Lower the bar lowers the enabled thresholds and resumes. Undo returns to the last skipped video. Changing only notification style/on-off must not resume a paused run. Return Likes to 500 when finished.
5. Toggle the master switch off: no new automatic moves. Reenable to resume. All site switches are in Settings. The popup shows the current supported site's switch, or all three outside supported feeds; recovery controls take those rows' place when available.
6. On a low-like video from a creator visibly subscribed/followed in the current card, Keep accounts I follow keeps it only when the page exposes that relation. If unavailable, count rules apply. Ads still skip when Skip ads is on. A disclosed player ad stays with Skip ads off; on advances it. No ad network blocking is claimed.
7. Background the feed: no new automatic moves until return; an already-issued move may finish. Comment editing, an open menu or held pointer waits. The six-skip pause still applies if its last move finishes while hidden.
8. Reset defaults clears temporary Undo choices, restores the 500-like rule and Compact notifications, and preserves explicitly saved creators and aggregate counters. An upgrade from 0.7.4 preserves custom settings, an explicit notification-off choice, creators and counters. A legacy setting with no style falls back to Compact.

English/Korean follow Chrome's UI language. Grid filtering is optional and off by default. Time saved is a local estimate using 3 seconds per dismissal minus actual on-screen time; it is not observed personal usage measurement.

## Data and code

Only `storage` and the same three HTTPS `www` host permissions are used. No new permission, backend, analytics, payment, ScrollPlus account or remotely hosted executable code. All processing stays on device. Persistent settings/aggregate counters and memory-only Undo choices are disclosed in [PRIVACY.md](../PRIVACY.md).
