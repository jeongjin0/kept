# Native Reels ad disclosure correction · 2026-10-14

This updates the unpublished 0.7.4 candidate. The submitted 0.7.3 package, public 0.7.2 package and original 0.7.4 QA package are preserved. Reels remains experimental; one native desktop layout is not every Instagram variant.

## Reproduced defect

Mini Aside's signed-in feed presented a real BMW advertisement with a visible Ad disclosure and Learn more control. Its ordinary counts payload reported 99,021 likes and kind video, without a usable ad flag. The 0.7.4 original remained on the advertisement for six one-second samples after Skip ads was turned on, with zero counted moves.

The disclosure's block span was 273 px wide, while its actual Ad text occupied 15.109375 × 15 px. The detector rejected elements wider than 180 px. This missed a disclosed ad; with ads off, the same misclassification could also let count rules skip a low-like ad.

The detector now measures the disclosure's text with a DOM Range. The exact short ad-label match, small text bounds, on-screen position and bounded shared player container remain required. Hidden disclosure text is excluded explicitly. No ad request blocking, network request, permission, follow rule or notice styling is added.

## Exact installed correction

ZIP: **150,625 bytes / 21 entries**, SHA-256 `48c71bcf667d9de1920cafdceb6401c7914e840e5f005d0cbf1f765b2f413269`. Every installed file was checked against this ZIP. Only the Instagram MAIN and isolated bundles differ from the original 0.7.4 ZIP. Its original 150,545-byte ZIP/hash remain frozen separately.

A second native advertisement, with **8 likes**, used the same 273 px block disclosure:

- With the real 500-like rule on and Skip ads off, it stayed for the three-second observation and the counter stayed zero.
- Turning the actual Settings ad switch on issued an ad advance, followed by one ordinary one-like skip. The counter became two; the notice included both reasons. These are two actual moves, not one advertisement counted twice.
- With count rules temporarily off, native Previous returned to the same disclosed advertisement. The ad switch then produced exactly one additional counted skip (2 → 3), with **Skipped · ad** and Undo.
- The fresh snapshot's Undo control returned to the disclosed advertisement. It stayed for three seconds with the counter still three. Returning count rules to the actual 500 minimum and reloading retained the same Reel ID/count. The site no longer presented it as an advertised feed slot after reload, so this is a restored-video/session check, not proof that the same ad slot persists on reload.

No ad destination, purchase, Follow, Like, comment or message was clicked. The first Undo attempt used a role locator which failed to resolve the visible shadow-root control; no product failure or Undo pass is inferred from it. The successful comparison used the fresh snapshot's actual control reference.

## Follow and notice recheck

The corrected installed ZIP also kept an already-followed Reel (embedded friendship following true; 126 comments) at a temporary 100,000,000-comment minimum with the exception on and count three. Switching the exception off moved away and counted five skips (three → eight). The roughly 12.7-second DOM observation sampled about every 100 ms: one settled visible notice at left 232.875 px/width 228 px, then normal expiry after about 2.5 seconds, with no repeated visible entry. This sample is not a new six-skip-cap pass or a measurement of shorter-than-sampling flashes.

TikTok was rechecked read-only: the prior temporary-follow target still showed Follow and the owner profile still had zero Following. No new follow retry was made; the live positive remains unverified.

## Automated validation

The new wide-span regression fails against the exact frozen original ZIP: with ads off the low-count ad is incorrectly skipped. The corrected regression checks off-keeps, on-skips, ad reason, Undo and session preservation across reload. Two separate cases reject visibility-hidden and horizontally offscreen disclosures. All three pass in the corrected build.

TypeScript, 126 unit tests, package validation, 17 targeted browser checks and the full 86-test browser suite pass locally. The exact 0.7.3 → corrected 0.7.4 ZIP upgrade preserves settings, saved creators and counters; session Undo clears at browser restart. A first overlapping full run lost its borrowed fixture server when the targeted runner exited, causing nine connection-refused failures. Both runners were completed, the fixture rebuilt and the full suite run alone: 86 passed. No assertion or product gate was weakened.

Evidence: private task-owned native screenshots/aggregate observations, `qa/tmp/ad-width-074/`, `qa/tmp/ad-width-074-before/`, `qa/tmp/ad-width-074-full-2/` and `qa/tmp/ad-width-074-upgrade/`. Public docs omit private account identifiers and credentials. Current-head CI must be green separately; preparing this candidate does not merge its version PR, resubmit the Store item or publish it.
