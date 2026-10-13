# Foreground and skip-state hardening · 0.7.2

Checked 2026-10-13 KST on Mini, macOS ARM64. The audit covered the active-player controller, three MAIN scripts, embedded data bridge, consecutive skip state, delayed navigation completion and input blocking. Thresholds, UI appearance, permissions and storage keys are unchanged.

## Reproduced problems and changes

| Trigger | Before | After | Regression evidence |
| --- | --- | --- | --- |
| A low-like Short becomes active in a background tab | 0.7.1 advances to the next video while the tab is hidden | No automatic move until the tab is visible; return checks immediately | `youtube-pacing.spec.ts`, real Chrome tab visibility |
| Filtering is enabled while TikTok or Reels is in a background tab | The shared controller can move an unseen feed | No automatic move; one move after returning | `item-bridge.spec.ts`, both platforms |
| Idle Instagram page with 100 embedded payload scripts | All 100 are read every 800 ms | One initial scan; only inserted or changed scripts are subsequently read | `idle-cost.spec.ts`, instrumented MAIN-world script getter |
| Five skips, a kept video, then another skip | Session Undo choices, creator keeps, revisits and late-count keeps can leave the count at five and pause too early | The kept video ends the run | Nine added engine tests cover interruption boundaries and visibility |
| A passing video between two skips while the notification is still up | Old reasons can appear in the new run | The new skip has only its own reason | `engine.test.ts` |
| A pending move finishes after disabling, leaving the feed or hiding the tab | A cleared notification can reappear | Count the real successful move once; do not restore the stale notification/run | `engine.test.ts` |
| A pointer-down gesture receives `pointercancel` rather than `pointerup` | Filtering stays blocked | Cancel, window blur and visibility changes clear the gesture | `youtube-pacing.spec.ts` |
| Running live QA with current defaults | Smoke/soak assert the old 5,000-like bar; pause detection uses an old CSS class | Smoke uses 500, soak checks the tested version; sample counts use the actual bar and pause detection uses the chip mode | Short live and soak preflight checks, below |

The six-skip safety pause remains in effect across tab switches. A move already sent to a site can still finish after hiding the tab; it is counted once. No additional navigation request is made while hidden.

## Performance comparison

The same routed Instagram page, 100 unchanged JSON scripts, 2.5-second idle measurement:

| Measure | Released 0.7.1 | Candidate 0.7.2 |
| --- | --- | --- |
| Embedded-script text reads while idle | 300 | 0 |
| Reads after one text-node edit and one inserted script | Not measured in baseline; old poll rediscovers them | 2, one for each affected script |
| Hidden fixture ScriptDuration over 2.5 seconds | Not measured in baseline | 0 seconds in the recorded local sample |

This measures avoided script reads on a controlled page, not a percentage reduction in CPU usage on live Instagram. The hidden-page check allows less than 25 ms of script time to account for the probe and platform noise. Network responses and inserted payloads still update the caches while hidden; recurring DOM polls stop. Cached metrics continue to be kept for revisits.

The published 0.7.1 ZIP fails all three newly added browser regressions: repeated script reads (300 rather than 0), background YouTube navigation (`v2` rather than `v1`), and a stuck cancelled pointer (`v1` rather than `v2`). The initial engine regression run also reproduced both premature pauses and both notification revivals before the implementation changed.

The ordinary Playwright launcher forces every page into foreground focus. Visibility regressions therefore use a separate disposable Chrome process connected with `noDefaults: true`, native tab activation, and an assertion on `document.hidden`. They do not override JavaScript visibility getters and do not change the extension's permissions. MAIN-world read instrumentation is installed on `HTMLScriptElement.prototype`, which owns the getter in current Chromium, rather than on the inherited Node getter.

## Verification scope

- TypeScript, 125 unit tests, production build and package checks passed locally.
- The local full browser suite passed 70/70 before the additional late-count reset; that reset passed its new unit regression. Final CI must exercise the completed change, including minimum Chrome 120, before merging.
- The UI is captured from the production build in [review screenshots](screenshots/review-072/). The store images are regenerated to include the text-free time display from 0.7.1.
- [Release readiness](release-readiness.md) records the final CI and live scope.

No signed-in Instagram/Following claim, day-long stability claim, live CPU percentage or bounded-history memory claim is established by these checks.
