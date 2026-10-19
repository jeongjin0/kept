# Installed TikTok follow attempt and default-rule check

Checked 2026-10-14 KST on Mini Aside using the exact 0.7.4 upload candidate: 150,545 bytes, SHA-256 `d6b747448b41aba7611af945d1e1c73ad51eccdd90ea5999efbc094e4a06e872`. This follow-up changes no runtime, permissions, ZIP or Store submission. The owner explicitly allowed temporarily following one public account and restoring the original state, including the possibility of a notification.

## Follow exception: still unverified

The single selected account was the public `tiktokcreators` account found through TikTok's search. The owner account initially had no followed creators. Only this account was used; no likes, comments, messages or other follows were made.

The profile's Follow button changed to Following. After reloading, it returned to Follow, the Following feed contained only recommendations, and the tested video's page-loaded `author.relation` was 0. One bounded retry through the same normal UI returned HTTP 200 with `status_code: 0` and `follow_status: 1`, yet another freshly loaded profile/video and the owner count again showed no retained follow. The response was observed from the site's own UI request; no extra site API mutation or copied credentials were used.

This discrepancy prevents a real followed-positive test. It is not evidence that ScrollPlus discarded a known followed signal: the loaded video still reported relation 0. It is also not proof that the account is restricted, that a notification did or did not arrive, or that the site's behaviour is permanent. No anti-abuse bypass, new account, login reset, relation injection or further follow retries were attempted.

Final cleanup verification: the target profile displayed Follow after reload, and the owner's refreshed profile displayed **0 Following**. No retained follow was visible. There was no persisted Following button to turn off, so this is not described as a successful Unfollow transaction. The task-owned extension was removed and Developer mode restored to its original off state after QA.

## Default 500-like skip: verified independently

Video `7696226954470493454` exposed **325 likes** in both the visible UI and the already-loaded embedded video data. It was a video with relation 0. With the actual shipped count rules—likes on/minimum 500, comments/views off, followed exceptions on—the installed extension:

1. Began on that video with total skip count 1.
2. Issued one next move; the site's URL changed to a different video.
3. Increased the count to 2 and displayed the exact reason **Skipped · 325 likes** with Undo in the left gutter.

This is a default-rule positive captured independently of the earlier 436-like high-threshold sample and the earlier default auto-move whose reason was missed. It does not establish follow exceptions, live ads, overall filter frequency or day-long use. No Undo/reload pass is inferred from merely seeing the Undo button.

Local evidence: task-owned `tiktok-follow-qa.json`, the first-attempt observation, public-video before/after captures and the cleanup checkpoint. The private account identifier and credentials are excluded from repository documentation. See [0.7.4 readiness](release-readiness-074.md). The private update review page includes these scoped results; only the owner's QA host serves the captures.
