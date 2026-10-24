# Notice and popup recovery — 2026-10-25

## Scope and choice

The owner requested continued implementation of the high-confidence improvements after reviewing the default-on/left-gutter hiding behavior. Reuse the existing popup, settings and notice components. Keep notifications on, use the existing compact count/Undo presentation by default, and expand details only within safe left space. Expose safety-pause recovery and adjacent Undo in the popup. Keep a saved off choice and all filtering rules.

The previous full card remains an explicit Detailed setting. Switching notifications off is not the default: a visible explanation and Undo remain useful for unexpected skips. Moving a notice over the video or to its right was rejected by the existing owner constraint. Reconsider the compact default if real users cannot understand the count or find details; no claim of improved retention/usefulness is made from controlled QA.

## Behavior and failure handling

- The popup polls only while open. Its commands retain the displayed tab/document/revision, recheck current playback, and fail without acting when stale. It does not look up another tab to perform the old action.
- The actual destination is captured from the adapter at move completion, so a fast manual move cannot be mistaken for an unobserved first successor. A regression covers that delayed-observation case.
- Undo is available only for the latest adjacent skip, survives notification expiry, and retires after another manual navigation or leaving the feed. Reload resets the document's target; remembered Undo keep choices still use the existing RAM-only broker.
- A failed retreat reports an error and allows retry if the source video is still current. No new permission, network API, persisted video identifier or backend is introduced.
- Appearance changes preserve a six-skip pause. Hover/focus holds the ordinary notification timer and leaves at least one second after disengagement.
- Recovery controls replace the site-toggle rows while available. Otherwise a supported active feed shows its own site switch; unsupported tabs show all three. All site switches stay in Settings. Preserve the existing 320 × 480 fit requirement in both languages.

## Verification record

TypeScript and 133 unit checks pass. The full 93-case browser suite passed before the final popup fit adjustment. After that adjustment, all 14 popup/recovery checks passed, and the five recovery checks additionally cover an actual failed retreat/retry. Current-head CI must run the full final 94-case suite on Chromium and minimum Chrome 120 in both push and PR workflows before landing. Controlled pages exercise the shipped extension/content scripts and real runtime messaging. The toolbar popup is represented by its actual extension page with its active-tab query pinned to the routed feed. This is not a live signed-in platform check.

Production ZIP and `scripts/check-package.mjs` pass with unchanged permissions/version. The local development ZIP is 157,055 bytes, SHA-256 `dc07d4f83631f250c53ee22eb0fa0667df383793dc23a1ecca3b1cd69aa216a2`. This is an unreleased development package, not the already published Store 0.7.4 artifact.

Visual inspection caught an English recovery-button wrap that overlapped the footer even though the outer popup still measured 480px. The Undo action now uses its existing icon and accessible name alongside the two pause actions. Tests additionally compare the final body child against the footer; they exercise real optional creator/signed-out rows instead of appending impossible combinations of rows. Both languages measure 460px normally and 467.55px in the captured pause state, within an actual 320×480 viewport. The bilingual 1x/2x tests retain the no-scroll/fit requirement. Captures: [English pause](screenshots/notice-popup-20261025/en-popup-paused.png), [Korean pause](screenshots/notice-popup-20261025/ko-popup-paused.png), [compact](screenshots/notice-popup-20261025/notice-compact.png), [expanded](screenshots/notice-popup-20261025/notice-expanded.png).

## Signed-out YouTube smoke

The final runtime was loaded in a disposable signed-out Chrome for Testing 153.0.8010.12 profile on the real Shorts site at 04:08 KST on 2026-10-25. The 500-like/default-on/compact settings and active feed were observed; this short default segment produced zero skips, so it does not establish a default low-like positive. With a temporary 100,000,000-like bar, six real moves reached the pause, the actual extension popup displayed its pause controls, and its Undo moved back. Defaults were restored before closing the disposable browser. No extension page errors were collected. Private task evidence: `qa/tmp/notice-review/live-smoke.json` and its live screenshots. This is not Store update delivery, a signed-in Reels/TikTok pass, ordinary day-use or full accessibility verification.

The first new routed fixture lacked YouTube's navigation wrappers and could not move; traces are preserved under `qa/tmp/notice-recovery-first-failure/`. Adding the wrappers allowed the safety pause, popup resume and Undo paths to execute. The next pass found an incorrect test expectation for Lower the bar: the existing number ladder moves 500 to 200, not 100. That expectation was corrected to preserve the existing product rule; traces remain under `qa/tmp/notice-recovery-second-failure/`.

No release number, Store package submission or publication is authorized by this source task. Store delivery and long-term usefulness remain separate.
