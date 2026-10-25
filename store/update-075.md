# ScrollPlus 0.7.5 Store update

Prepared 2026-10-25. The owner approved continuing the remaining next steps after the notification/popup improvement merged. Use the existing Store item `bpiliaicdpeflblgjneilaphgjkgfmja`, retaining Free/Public distribution and automatic publication after review. This supersedes the older Unlisted/deferred launch instructions; no separate Store item, paid domain or new website is needed.

## State

- Last public listing check, 2026-10-25: version 0.7.4, updated 2026-10-20.
- **0.7.5 submitted for review on 2026-10-25, approximately 22:04 KST**, with automatic publication on. The dashboard showed the submission-success dialog and then Pending review. Approval/public delivery is not yet confirmed; published 0.7.4 remains available.
- Package tab before submission: draft 0.7.5 / published 0.7.4. Same item, no parallel draft/review was replaced. Free/Public and all regions confirmed; privacy/data declarations and credentials fields remain unchanged.
- Saved English/Korean descriptions: 2232/1264 characters. Replaced each locale’s three older screenshots with four current screenshots, refreshed the common English marquee, and saved a 382-character summary pointing to [immutable full reviewer instructions](https://github.com/jeongjin0/scrollplus/blob/24964fc5aa61e78c153be1e63516e8956682b850/store/reviewer-instructions-075.md). Username/password remain empty.
- Existing publisher session was recovered with the approved saved-login/Vault route. No credential is included in the package, repository or reviewer form.

## Candidate

ZIP `.output/scrollplus-0.7.5-chrome.zip`, 157193 bytes, SHA-256 `85305ecd42b43a5c5f9110de107b140e84f721274affd686f149cd0866ad4d49`.

- [Candidate QA and limits](../qa/release-readiness-075.md).
- [English/Korean listing](listing-075.md).
- [Version-specific reviewer instructions](reviewer-instructions-075.md). The dashboard summary must stay within 500 characters and link to a public immutable revision of this file after landing. ScrollPlus has no account; username/password fields remain blank.
- Images: English `store/screenshots/{popup,options,chip,recovery}.png`, Korean equivalents under `ko/`; 1280×800. Promo tiles/marquees keep existing dimensions.
- Same storage/host permissions, privacy policy/support URLs, single purpose and local data declarations. Review them against the final dashboard rather than inferring acceptance from a ZIP build.

## Exact release-head verification

[PR #57](https://github.com/jeongjin0/scrollplus/pull/57), head `24964fc5aa61e78c153be1e63516e8956682b850`, merged as `a5ce5311f3ceddba25518eec02000b7aebc9dac3` at 2026-10-25 21:54:29 KST. All six checks pass: compile/unit/package and 94 browser cases on current Chromium/Chrome 120 in both [push](https://github.com/jeongjin0/scrollplus/actions/runs/40194833139) and [PR](https://github.com/jeongjin0/scrollplus/actions/runs/40194850117) workflows. The downloaded CI ZIP matches the local/submitted ZIP SHA-256 exactly. Pre-merge assessment: potential impact low, residual risk low, verification confidence high; the owner’s next-step continuation supplies specific release authorization.

## Submission and verification

Land only after all required exact-head checks pass and the current assessment is recorded. Recheck draft/published versions to avoid replacing an active new review or uploading twice. Upload the complete checked ZIP, save changed metadata and localized screenshots, verify Free/Public and current declarations, then submit with automatic publication on. Record the accepted state. After publication, verify the public version and Store-delivered update separately from local upgrade QA.

Official process: [update guidance](https://developer.chrome.com/docs/webstore/update). A review submission leaves the previously published version available until the new version is published.
