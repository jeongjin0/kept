# Keep accounts I follow

Checked on 2026-10-12. ScrollPlus 0.5.2 keeps a video when the page already says the viewer subscribes to or follows its creator. The switch is on by default, in Settings. It covers YouTube Shorts, TikTok and Instagram Reels. 0.5.1 covered TikTok only.

Nothing about who is followed is stored. Permissions are unchanged. A missing answer is judged by likes. An ad is still skipped when Skip ads is on.

YouTube. The player and reel responses carry subscriptionStateEntity.subscribed, matched to the video when that response names one video, or the older subscribeButtonRenderer.subscribed flag. The visible Shorts button is also read: 구독중, 구독됨 and Subscribed mean subscribed, and 구독 and Subscribe mean not. A signed-out Shorts page in Chrome on this machine showed the button labelled 구독 and a login link, and the captured reel response had the subscribe button without a subscriptionStateEntity. That signed-out shape keeps the video on the like bar. A subscribed fixture stays.

TikTok. author.relation on the item the page loaded: 0 none, 1 the viewer follows, 2 the author follows the viewer, 3 both. 1 and 3 stay. A signed-out For You response had relation 0. The values 1 and 3 were not seen on a signed-in account.

Instagram. friendship_status.following on the reel the page loaded, and the button beside the reel: 팔로잉 and Following mean followed, 팔로우 and Follow mean not. Signed out, Reels redirects to the login page, so a live reel was not seen. A fixture with following true stays.

The Chrome window on this machine was signed out of YouTube, TikTok and Instagram, so a real subscribed channel and a real followed account were not watched. The signals above are what those pages already render for a signed-in viewer, and the controlled pages exercise them.
