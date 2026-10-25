# ScrollPlus 0.7.5 Store update

Prepared 2026-10-25. The owner approved continuing the remaining next steps after the notification/popup improvement merged. Use the existing Store item `bpiliaicdpeflblgjneilaphgjkgfmja`, retaining Free/Public distribution and automatic publication after review. This supersedes the older Unlisted/deferred launch instructions; no separate Store item, paid domain or new website is needed.

## State

- Last public listing check, 2026-10-25: version 0.7.4, updated 2026-10-20.
- 0.7.5 candidate prepared; actual upload/submission is not yet recorded here.
- Existing publisher session needs routine Google reauthentication; use existing saved credentials, never repository credentials or reviewer password fields.

## Candidate

ZIP `.output/scrollplus-0.7.5-chrome.zip`, 157193 bytes, SHA-256 `85305ecd42b43a5c5f9110de107b140e84f721274affd686f149cd0866ad4d49`.

- [Candidate QA and limits](../qa/release-readiness-075.md).
- [English/Korean listing](listing-075.md).
- [Version-specific reviewer instructions](reviewer-instructions-075.md). The dashboard summary must stay within 500 characters and link to a public immutable revision of this file after landing. ScrollPlus has no account; username/password fields remain blank.
- Images: English `store/screenshots/{popup,options,chip,recovery}.png`, Korean equivalents under `ko/`; 1280×800. Promo tiles/marquees keep existing dimensions.
- Same storage/host permissions, privacy policy/support URLs, single purpose and local data declarations. Review them against the final dashboard rather than inferring acceptance from a ZIP build.

## Submission and verification

Land only after all required exact-head checks pass and the current assessment is recorded. Recheck draft/published versions to avoid replacing an active new review or uploading twice. Upload the complete checked ZIP, save changed metadata and localized screenshots, verify Free/Public and current declarations, then submit with automatic publication on. Record the accepted state. After publication, verify the public version and Store-delivered update separately from local upgrade QA.

Official process: [update guidance](https://developer.chrome.com/docs/webstore/update). A review submission leaves the previously published version available until the new version is published.
