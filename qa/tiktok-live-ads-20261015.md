# Installed TikTok ads and follow recheck

Checked 2026-10-14–15 KST on Mini Aside, using the corrected 0.7.4 candidate: **150,625 bytes**, SHA-256 `48c71bcf667d9de1920cafdceb6401c7914e840e5f005d0cbf1f765b2f413269`. The runtime and ZIP are unchanged. This is a signed-in, native-feed check, not a routed fixture or a Store-installed update.

## Real ads

The site visibly disclosed each tested item as **광고** and ScrollPlus's existing MAIN bridge published the same item's `kind: ad`. Captions, hashtags, creator names and ordinary CapCut links were not treated as ad evidence. Only normal feed navigation, extension Settings and Undo were used; no ad destinations, likes, comments or messages were clicked.

| Observed ad | Rules | Ads off | Ads on | Undo |
| --- | --- | --- | --- | --- |
| `7694340970346827016`, 213 likes | All count rules off | Same disclosed ad; three-second observation; no automatic next request; UI total 0 | One next request, changed active feed item; total 0 → 1 | Not captured for this item |
| `7692303661040553234`, 252 likes | All count rules off | Same disclosed ad; total 1 | One next request; total 1 → 2; visible **넘김 · 광고** | Fresh visible Undo returns to the same disclosed ad; total 2 stays. Three-second observation with count rules off, then another with the actual minimum 500 enabled, adds no next request |
| `7694340716104813831`, 135 likes | Actual default: likes on/minimum 500; comments/views off | Same bridge-confirmed ad for three seconds; total 2 stays despite the below-minimum count | One next request; total 2 → 3; status identifies the ad reason | Fresh visible Undo returns to the same bridge-confirmed ad. Three-second observation at defaults leaves total 3 and adds no next request |

The second ad's full notice was visibly in the left gutter at x=235.875, width=228, with a usable Undo button. The third used the compact count/Undo presentation; its accessible status still identified the ad reason. This is not a new continuous-motion, comments-panel, every-window-size or sub-100 ms flicker certification. Site item messages can lag a feed-layout change during hydration; the before/after checks distinguish active feed markers from the last published item and confirm the restored ad after it settles.

No new product bug was reproduced in these cases. This result covers three served desktop ads and two actual Undo returns, not every TikTok ad format, region or account. Reload preservation of the same served ad slot was not tested. The existing controlled regression/upgrade results retain their original scope.

## Follow recheck

The owner's earlier permission to temporarily follow one public creator remained applicable. One further normal UI attempt used the same `tiktokcreators` account, after the earlier checks; no other target or repeated new retry was used. The button changed from Follow to Following. A fresh video load still exposed `author.relation: 0` and 433 likes; a fresh target profile returned to Follow and the owner's profile showed **0 Following**.

No retained follow was visible to cancel. This is not a successful Unfollow transaction, and it does not establish whether a notification was delivered. No relationship was injected, extra site API mutation made, credential reset performed or account restriction bypassed. A real followed-positive comparison remains **unverified**: there was no persisted known followed signal to compare with the exception on/off. The controlled relation 1/3 keep and relation 2 negative checks are separate evidence, not substitutes for this live case.

## Store access and cleanup

Mini's developer dashboard required Google password reauthentication. Existing saved-login suggestions still did not fill the password after the established Vault-unlock recovery. Pro's dashboard required sign-in. The relevant owner's Gmail account had no new Chrome Web Store approval/rejection notification at this check. Absence of mail does not establish current dashboard status. The owner chose to continue QA first; the last confirmed 0.7.3 Pending review checkpoint is not described as a fresh current state.

Settings were restored to defaults after the feed checks. The task-owned native extension was removed and Developer mode verified off. The submitted 0.7.3 ZIP, public 0.7.2 ZIP and corrected 0.7.4 ZIP remain unchanged. No review cancellation, upload, submission, publication, tag or release was performed.

Private evidence includes native ad-off/skip/Undo screenshots, bridge/marker observations, counters, the follow recheck and cleanup records. Personal account captures and publisher identifiers are excluded from this repository. See [candidate readiness](release-readiness-074.md), [earlier follow attempt](tiktok-follow-20261014.md) and [update procedure](../store/update-074.md).
