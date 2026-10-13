# Privacy

ScrollPlus processes page data only on your device. It does not send that data to the developer or any third party, sell it, or use it for advertising. There is no ScrollPlus account, backend, or analytics service.

The extension reads the current video URL, video identifiers, public creator identifiers (channel IDs, usernames or handles), view/like/comment counts, ad markers, and subscription or follow signals that YouTube, TikTok, or Instagram has already loaded. It uses them to identify the active video, apply your rules, skip ads, keep followed creators, and support Undo. It does not request a separate follow list or private site API, or extract or store your passwords, authentication cookies, email address or payment details.

On supported pages, ScrollPlus observes pointer press/release, focus, visible menus, page visibility and scrolling so automatic moves wait while you interact with the site. It does not record the text you type or a log of your pointer coordinates, keystrokes or clicks. Skip counts and the aggregate time spent on videos before a skip are stored as described below.

While a supported page is open, its script keeps identifiers, counts and known follow/ad signals in page memory so videos can be revisited without rereading all of the page's data. This cache disappears when the document is replaced or the tab closes. Counts, ad markers and follow signals are not written to persistent Chrome storage. The creator allowlist and temporary Undo choices are described below.

Persistent Chrome storage on this device holds only:

- `settings`: the on/off switch, your rule (which of likes, comments, and views are on, and each minimum), per-site switches, the Skip ads option, the option to keep accounts you follow, grid option, chip option, and creator allowlist. The follow option does not store who you follow.
- `dailySkips`: today's date and how many videos were skipped today
- `totalSkips`: the day counting started, how many videos were skipped in all, and, added up, for how long those videos were on screen before ScrollPlus moved on. The popup and Settings use it to estimate the time saved
- `schema`: a number that marks which version of the settings is stored, so that an update moves old settings only once

The daily count resets at local midnight. The totals contain sums and a start date, not a list of viewed videos, titles, creators or times of day. Reset to defaults preserves the allowlist and counters. Remove saved creators in Settings; removing the extension clears its local settings and counters. A creator you deliberately choose to keep is stored in `settings` until removed. Subscription/follow signals on all three sites remain in page memory and are not stored as a follow list.

`undoKeeps` in `chrome.storage.session` temporarily remembers the IDs of videos you choose to Undo, grouped by site, so they stay through reloads and new tabs. These choices are RAM only and are not written to disk. ScrollPlus does not maintain a complete list of pages or videos you visit, page titles or visit times; the current URL and temporary Undo choices are used only for filtering and restoring videos on the supported sites. They clear on browser restart, extension reload/update/disable, or Reset to defaults. Content scripts receive only their site's choices through the background worker; the storage area stays trusted-only. See [Chrome's session-storage documentation](https://developer.chrome.com/docs/extensions/reference/api/storage#property-session).

ScrollPlus uses the information it handles only for the short-video filtering features described above. Its use of that information complies with the [Chrome Web Store User Data Policy and Limited Use requirements](https://developer.chrome.com/docs/webstore/program-policies/limited-use). It does not transfer the information to advertisers, data brokers or other third parties, and the developer cannot access it through the extension.

This policy covers the extension. Opening GitHub or a video site uses that site's own privacy policy. A future product website must disclose any website data handling separately.

Contact: https://github.com/jeongjin0/scrollplus/issues
