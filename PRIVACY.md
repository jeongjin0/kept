# Privacy

ScrollPlus does not collect, transmit, or sell user data. There is no account and no server.

The extension reads view, like, and comment counts, and whether the site marks the current item as an ad, from what YouTube, TikTok, or Instagram has already loaded in the page you are viewing. They are used on your device to decide whether to move to the next video. They are not stored.

Persistent Chrome storage on this device holds only:

- `settings`: the on/off switch, your rule (which of likes, comments, and views are on, and each minimum), per-site switches, the Skip ads option, grid option, chip option, and creator allowlist
- `dailySkips`: today's date and how many videos were skipped today

The daily count resets at local midnight. It does not store watch history or video ids. A creator you choose to keep is stored in `settings` until you remove it.

`undoKeeps` in `chrome.storage.session` temporarily remembers videos you choose to Undo, grouped by site, so they stay through reloads and new tabs. This is RAM only, not disk storage or watch history. It clears on browser restart, extension reload/update/disable, or Reset to defaults. Content scripts receive only their site's choices through the background worker; the storage area stays trusted-only. See [Chrome's session-storage documentation](https://developer.chrome.com/docs/extensions/reference/api/storage#property-session).

Contact: https://github.com/jeongjin0/scrollplus
