# TikTok follow persistence: extension-absent comparison

Checked 2026-10-15 KST on Mini Aside, in the existing signed-in account. The owner authorized temporarily following one public account and restoring the original state. This investigation used the same `tiktokcreators` target, with **one** ordinary UI attempt in this run, the fourth across the documented runs. No other follows, likes, comments or messages were made.

## Observed chronology

ScrollPlus was fully removed before the attempt: the native extension manager contained no installed extensions. Both the target and owner pages exposed the same signed-in viewer as the discovered Profile link; the owner's refreshed profile showed zero Following. The target's page-loaded data reported `privateAccount: false` and `relation: 0`.

The observer called the site's original fetch unchanged and read a cloned response. It retained only endpoint paths, times and whitelisted status fields, not query tokens, cookies, headers or account identifiers. No extra follow API request was made by the observer.

| Time (KST) | Observation |
| --- | --- |
| 04:37:26.496 | Ordinary Follow click issued the site's POST to `/api/commit/follow/user/`, action type 1. The original button changed to Following. |
| 04:37:27.053 | Site response: HTTP 200, `status_code: 0`, empty `status_msg`, `follow_status: 1`. |
| 04:37:29.546 | A separate fresh target page displayed Follow; its embedded relationship was 0 and it was signed in. This observation occurred after the success response. |
| 04:37:59.466 | Original page still displayed Following; no site error was displayed in the captured state. |
| 04:38:00.129 | Refreshed owner data: Following count 0, signed in, viewer matches the owner profile. |
| 04:38:41.944 | Same-origin target HTML GET with browser cache mode `no-store`: HTTP 200, `Cache-Control: max-age=0, no-cache, no-store`, no Age header, relationship 0, same signed-in viewer, public target. |
| 04:38:42.219 | Original page still showed Following, while the independently loaded target page showed Follow. |
| 04:39:43.595 | Original page reload again exposed relationship 0. Owner's Following list explicitly displayed its empty state. |

## Conclusion and limits

The inconsistency reproduces without ScrollPlus. The original UI's Following label and the success acknowledgement are not evidence of a persisted follow. Account mismatch and a browser-cached profile are not supported by these observations. The fresh reads do **not** exclude TikTok-side caching, eventual consistency or a silent account policy. No restriction notice or precise internal cause was established. No login reset, anti-abuse bypass, new account or repeated further follow attempts were performed.

There was no visible retained follow to cancel; this is not described as a successful Unfollow transaction or proof that no notification reached the creator. All four task-owned tabs were closed, with a fresh inventory showing zero remaining task targets. No extension was installed during this comparison.

The live followed-positive exception remains **unverified**. Marking the website's transient success acknowledgement as followed would conceal the discrepancy and is not an appropriate fix. The candidate runtime and frozen ZIPs are unchanged.

## Additional installed-extension regression

`e2e/tiktok-follow-refresh.spec.ts` adds two isolated native-browser cases using the exact corrected 0.7.4 runtime. For viewer-following relation 1 and mutual relation 3, each case verifies that:

1. A success-shaped follow acknowledgement alone does not replace the current player's known relationship 0.
2. A fresh item response with unchanged ID/counts and known followed relationship updates the active bridge.
3. The exception prevents a queued low-like move when Next becomes available.
4. Disabling the exception without reloading makes exactly one move and increments the count once, with no page exceptions.

Both cases pass locally on the exact installed candidate; TypeScript compilation also passes. The normal automated suite still tests relation 2 as a non-followed viewer, static relation 1/3, the exception switch, saved creators, ads and Undo. These controlled responses do not substitute for the missing live persisted-follow case. If TikTok cannot retain a follow, the existing saved-creator control is an independent way to keep that creator; no new account activity is needed for that feature.

Private evidence: task-owned `follow-extension-absent.json`, original/fresh profile captures and the native test output. Public documentation excludes the owner's account identity and personal captures. See [0.7.4 readiness](release-readiness-074.md), [prior follow attempt](tiktok-follow-20261014.md), and [live ad QA](tiktok-live-ads-20261015.md).
