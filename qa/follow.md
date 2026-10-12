# Keep accounts I follow

Checked on 2026-10-12. ScrollPlus 0.5.1 keeps a TikTok video when the item the page already loaded says the viewer follows that creator. The switch is on by default. It is in Settings, with the TikTok icon, because YouTube and Instagram are not read.

The field is author.relation on the same object that holds stats. A signed-out For You response (/api/recommend/item_list/, two items, captured in qa/tmp/follow-probe/tt-bodies.json) had relation 0 on both authors. The embedded rehydration payload from that same signed-out load had no video items, so the first video's relation, when it exists, comes from the feed response.

The values used are the ones published for this field: 0 none, 1 the viewer follows, 2 the author follows the viewer, 3 both. 1 and 3 are kept. 0 and 2 are judged by likes. A missing value, or any other number, is judged by likes. That mapping was not seen with a signed-in account. Relation was 0 in the only live capture.

An ad is still skipped when Skip ads is on, including an ad from a followed creator. The master switch, a site that is off, and a creator on the allowlist are judged first.

Nothing about who is followed is stored. Permissions are unchanged. A 0.5.0 install has no keepFollowed key; reading the missing key as on does not rewrite storage.

YouTube Shorts, signed out, exposes a subscribe button and a subscribe-state key, and no subscribed boolean was present in the captured player data. Instagram signed out redirects to login. Neither site is covered.

Open: watch a signed-in TikTok and confirm a creator you follow arrives with relation 1 (or 3 when they follow you back), and that a low-like video from them stays while one from someone you do not follow is skipped.
