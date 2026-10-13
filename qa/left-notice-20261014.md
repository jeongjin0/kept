# Left gutter notice — 2026-10-14

Opening comments could leave the old notice over the video. The renderer only repositioned on a new notice, one 250 ms settle or window resize, and also tried the right gutter or an overlay. The notice now always uses the left gutter and tracks layout changes while it is active.

## Result

- Full card: 228 px, 16 px clear of the player. Consecutive skips show the newest three reasons, without a heading or logo.
- Narrow gutter: 44 px, 8 px clear of the player, showing only 1–3 and Undo. There is no glow or expanding ring. Pause controls remain labelled icon buttons with 40 px targets.
- No safe left space: hide the notice until space returns. Filtering and the six-skip safety limit remain active; a hidden pause still stops further automatic moves. Widening the window restores its controls. There is no right or video overlay fallback, including legacy saved positions. Settings retains the visibility switch and retires the position picker.
- A kept Instagram photo can anchor the preceding video's Undo. This is layout support; photos are still kept.
- Position observers run only while an active notice is shown in a visible tab. Changes coalesce into an animation frame. Ancestor transitions have a bounded 600 ms follow period; idle pages have no position polling. Dismissal and hidden tabs disconnect observers and cancel scheduled placement.

## Verification

`npm run compile`, 126 unit checks, the initial full 78-check browser suite, production build, ZIP and `scripts/check-package.mjs` passed locally. After the final reparenting and transparent-wrapper fixes, all 13 targeted notice checks and the production build passed; the live safety-pause capture was repeated successfully. The three-reason capture predates those final lifecycle fixes and uses the same visual tokens. The unchanged CI also runs the complete suite in current Chromium and minimum Chrome 120 before landing.

Nine new browser checks cover unchanged-model comments opening/closing, focus and button identity, one-skip compact Undo, a blocked left gutter with free right space, compact pause controls, video replacement, photo replacement, reparenting, animated column movement and zero idle/dismissed hit testing. Existing adapter fixtures now provide a left gutter for Undo interaction; the separate no-space regression explicitly checks hiding and recovery.

Real unpacked candidate extension, fresh signed-out YouTube profile, Chromium from Playwright, 1440 × 900 CSS px, device scale 1:

1. A temporary 100,000,000-like bar drove real skips from live page counts. Three reasons appeared in one left card. A held QA pointer gesture was used to capture the short-lived run. Opening comments changed the same video's notice to count 3 and Undo. During the later close capture a fourth move completed; that capture is not used as a same-video comparison. [Run geometry](screenshots/left-notice-20261014/live-run-results.json).
2. A separate run reached the real six-skip safety pause. Closed → open → closed comments kept the same video and pause notice, and all three captures had a visible notice outside the player. The open state left 61.875 px between YouTube's 240 px guide and its video. The 44 px notice sat at x=249.875, right=293.875, 8 px clear of video x=301.875, centred vertically at y=450. No page errors were observed. [Pause geometry](screenshots/left-notice-20261014/live-extension-results.json).
3. Visual review of the saved captures found no video, comments, navigation or action overlap in those states. Text is legible, compact count and Undo are aligned, and the bright glow/ring is gone. Keyboard focus, accessible labels, Undo and both pause targets are covered by browser checks.

[HTML with actual captures](reviews/left-notice-20261014.html).

## Limits

This verifies the candidate UI and scoped live YouTube layout, not default-500-like effectiveness, all current website variants, signed-in Instagram/TikTok or ordinary day-use. Nine-point hit testing is a sampled obstruction check, not a proof about every pixel of every website overlay. Dense pages with no safe left gutter intentionally show no notice or inline pause controls until room returns.

The version remains 0.7.2 for this development candidate. It is not the existing public 0.7.2 ZIP: that release and the uploaded Store Draft package remain unchanged (SHA256 `00451fd95dcf1460c297e20a158475255a8080dac9044d1337be72da8ca0f097`). A subsequent release/package and refreshed Store screenshots need a separate publication step. No Store review was submitted.
