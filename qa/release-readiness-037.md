# Release readiness · 0.3.7 (published beta; superseded by [0.4.0](release-readiness.md))

Checked on 2026-10-09 KST, macOS ARM64. This candidate removes a constant idle cost. With grid filtering off, the shipped default, every tab still listed all of its page links every 400 ms only to find cards ScrollPlus might have hidden. It now lists them only while grid filtering is on or while a card it hid may still need restoring. Filtering rules, defaults, UI, permissions, dependencies and the MAIN-world scripts are unchanged. Chrome Web Store submission has not occurred; SPEC.md says not to submit it.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | `npm run compile` |
| Unit tests | 45 passed | `npm test` |
| Built-script browser tests | 29 passed, no skips or flaky results | `npm run test:e2e`; adds the idle-cost regression to the 28 existing tests, including all grid, adapter, Undo, UI and storage paths |
| Idle-cost regression | Fails on published 0.3.6, passes now | A page with 20,000 links costs 0.29 s of script time per 3 idle seconds on 0.3.6 against a 0.1 s limit; this candidate uses under 0.01 s. See [idle cost](idle-cost.md) |
| Minimum Chrome 120 | 29 passed on Linux | [PR CI](https://github.com/jeongjin0/scrollplus/actions/runs/37887335116) on the final code commit; official Chrome for Testing 120.0.6099.109, actual built scripts on controlled fixtures. The same run passed 45 unit tests and the current-Chrome suite |
| Package | Pass | `npm run zip` and `node scripts/check-package.mjs`; MV3, Chrome 120+, storage and the existing three host permissions |
| Package scope | 16 of 20 extracted files identical to published 0.3.6 | Only the manifest and the three isolated site scripts changed (the shared controller is bundled into each). Both MAIN bundles, background, popup/settings, locales and icons are byte-identical |
| Native signed-in TikTok / Instagram | Not repeated on 0.3.7 | The [0.3.6 sampling](signed-in-smoke.md#version-036-candidate--2026-10-09) stays scoped to that package. The code change touches only the periodic grid scan, which the shipped defaults leave off |
| Real YouTube long feed | Completed with recoveries, not a clean pass | Exact 0.3.7: a 6-hour run (1 reload recovery) and a 12-hour run (4), fresh signed-out profiles, 0 page errors. Exact 0.3.6: 6 hours, 0 recoveries. The feed intermittently stops responding until a reload; in the six instrumented stalls YouTube's request for more Shorts failed with HTTP 503 (also without ScrollPlus). See the [stall investigation](soak.md#youtube-shorts-feed-stalls-youtubes-feed-request-fails). Not ordinary human day-use |
| Chrome Web Store | Not submitted | [Submission checklist](../store/submission-checklist.md) prepared |

## Artifact

`scrollplus-0.3.7-chrome.zip`, 127,215 bytes.

SHA-256: `4896a36cf9cedf62fb18dfe634892b1bf4b06bb45d33543d454f8063ec32ea75`.

This identifies the tested local candidate. CI ZIP metadata can differ. The previous exact-package reports remain in [0.3.6 release readiness](release-readiness-036.md#artifact) and [0.3.5 release readiness](release-readiness-035.md#artifact).

## Remaining gates

1. See the Instagram advertisement guard on a live advertisement, and exercise Instagram Undo/reload and a genuine Following video feed natively. These need the signed-in QA browser on the Pro host, which was not reachable without a new screen-sharing login.
2. Ordinary human day-use. YouTube Shorts feed stalls are explained by a failing YouTube request (see the investigation above) and are not fixed by ScrollPlus; whether to detect and report the stuck state is an owner decision outside SPEC.md. The idle scan above is a measured CPU saving unrelated to them.
3. Update the listing only to match verified support. Store submission remains an owner decision.
