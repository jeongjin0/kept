# Next-update candidate · 0.7.4

Prepared 2026-10-14 KST on Mini, from main `f034392672341b42a6351511f0b304ceaedb4243` (PR #54). The candidate packages the post-submission Instagram followed-account and notice-motion fixes. All 20 non-manifest ZIP entries match the final PR #54 built runtime exactly. This transfers the narrowly scoped [installed follow/motion observations](reels-follow-motion-20261014.md) by verified byte identity, not by assuming an older package passed.

| Check | Result | Scope |
| --- | --- | --- |
| Compile / units / build / package | Pass | TypeScript; 126 unit tests; WXT ZIP; package checker: MV3, Chrome 120 minimum, storage-only permission, same three hosts, all locales/icons and Store asset sizes |
| Browser suite | Pass locally | 83 tests on current Chromium, including deep/off-screen follow buttons, continuous Reels movement, keyboard focus, six-skip cap, ads, comments, hidden tabs, Undo and storage |
| 0.7.3 → 0.7.4 upgrade | Pass | Exact prior and candidate ZIPs, one disposable profile and identical unpacked path across a real Chromium restart. Custom rules, disabled flags, site choices, saved creator and daily/lifetime counts are identical; extension ID is unchanged. Session Undo choices clear on browser restart. This does not simulate Store delivery |
| UI capture | Pass | Both bundled translations, 320 px popup at 1×/2× and 360 px Settings; no overflow or page exceptions. Language is explicitly selected in the isolated capture profile |
| Fresh-profile YouTube soak | Completed | Exact 0.7.4 ZIP; default 500 likes, ads/follows on; 600.597 seconds, 24 samples with readable likes, 19/19 manual moves, four counted automatic moves, zero recovery/retry or page exceptions. No sampled ordinary video was below 500, so this run does not establish low-like efficacy |
| Installed signed-in Reels | Scoped pass | Exact ZIP loaded into Mini Aside. A previously followed Reel with 126 comments stays at a temporary 100,000,000-comment threshold with the exception on (count 0); off skips it. Six moves are counted and the safety pause stops further moves. A 16-second recording has one visible notice state, after motion settles; 228 px notice remains 16 px left of the video, with no subsequent blink/jump. Twelve manual next checks at restored defaults add ten low-like skips; no live ad is encountered |
| Installed signed-in TikTok | Scoped observation | Exact ZIP, existing signed-in account. A readable 20.6K-like video stays at defaults. Seven manual-next samples include one counted automatic move, but its reason/count was not captured, so this is not a verified default low-like or live-ad positive. A temporary high bar reaches the real six-skip pause; the final 436-like sample belongs to this high-bar phase, not a default-rule pass. The notice stays in the left gutter as a compact pill. Native Next briefly disables during feed loading and recovers without a reload; this is not counted as an extension failure |

The soak's console includes site resource/network warnings and errors; zero page exceptions does not mean a warning-free site. Its measurements are for the whole YouTube document, not extension-only CPU/memory. A ten-minute automated run is not ordinary day-long use.

ZIP: `scrollplus-0.7.4-chrome.zip`, **150,545 bytes**, 21 entries. SHA-256: `d6b747448b41aba7611af945d1e1c73ad51eccdd90ea5999efbc094e4a06e872`. The frozen submitted 0.7.3 and public 0.7.2 ZIPs remain unchanged.

## Scope and remaining checks

Signed-in YouTube subscribed keep/exception-off skip was observed in 0.7.3. Signed-in Instagram followed keep/exception-off skip, default low-like skips, Undo → reload, six-skip pause and comments-panel notice placement were observed in the final PR #54 runtime. Those observations retain their documented limitations; the byte identity above is explicit.

TikTok live followed positives and Instagram live ad on/off remain unverified. The signed-in TikTok account used for QA has no followed creators; a temporary follow can notify another account and is awaiting the owner's specific choice. Controlled cases for both features pass, but do not substitute for live positives. Reels remains experimental. Store-installed delivery and ordinary day-long manual use also remain open.

An additional direct-navigation attempt did not expose a live Undo button at the snapshot and is not counted as a new Undo pass. During feed hydration, Reels briefly had partially visible players and an unsettled address/layout; the notice stayed hidden. A native Next interaction recovered a centred player. This observation does not establish an extension regression or certify the site's cold-navigation path. The earlier installed Undo/reload result applies through the verified unchanged runtime, with its original scope.

At this preparation's Store check, Google asked for reauthentication. Available saved-login suggestions did not fill the password; no password guess, account reset, review cancellation, upload or publication was performed. The last confirmed item state is the 0.7.3 Pending review checkpoint, not a fresh claim of current review state.

Pro's existing Aside profile was also checked; its Store dashboard requires sign-in. Both checks are read-only. This access gap does not block preparing the new ZIP and copy, but dashboard state must be checked again before a later upload.

Local evidence is in the task-owned `qa/tmp/update-074/` directory (compile/unit/browser/package logs, upgrade-2 report, UI report and finite soak summary). The first upgrade-runner attempt failed because it sent a runtime message from the service worker to itself; it was corrected to use the real extension-page broker and rerun with a fresh profile. No product fix or lowered assertion was needed.

See [update procedure and release notes](../store/update-074.md), [next listing](../store/listing-074.md), and [version-specific reviewer instructions](../store/reviewer-instructions-074.md). Preparation creates no GitHub release/tag or Store submission/publication.
