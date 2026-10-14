# Chrome Web Store draft checkpoint

Prepared 2026-10-13 through the owner's browser. The original checkpoint below describes a saved draft. The 2026-10-14 first review was subsequently submitted with deferred publication; see the accepted-submission section. It is not a published Store release. Private publisher identifiers, contact details and verification links are intentionally kept outside repository documentation.

## Saved in the dashboard

- One ScrollPlus item, status **Draft**, package version **0.7.2**, English and Korean. No duplicate item was created.
- Uploaded `scrollplus-0.7.2-chrome.zip`, 148,668 bytes; SHA-256 `00451fd95dcf1460c297e20a158475255a8080dac9044d1337be72da8ca0f097`.
- Owner-selected **Non-trader** declaration; publisher contact email verified through the requested Google email. No additional registration payment or domain purchase was made.
- English/Korean descriptions and three localized screenshots per language, 128px icon, small tile and marquee. Category: **Social Networking**. Homepage, support and privacy use the existing public GitHub URLs.
- Single purpose, storage/host justifications and **no remotely hosted executable code**. See [listing](listing.md), [privacy policy](../PRIVACY.md) and [submission checklist](submission-checklist.md).
- Draft data declarations: Personally identifiable information (public creator identifiers), Web history (supported active-video URLs and temporary Undo references), User activity (local interaction state and aggregate counters), Website content (page-loaded video information). This is a mapping to the inspected form definitions, not Google approval. No data is sent to the developer or third parties.
- Distribution: **Free**, **Unlisted**, all currently supported regions. No in-app purchases.
- A 367-character test summary links to [full reviewer instructions](reviewer-instructions.md); reviewer credential fields are blank because the extension has no account system.

After contact verification, reopening the item showed **Draft** and an enabled **Submit for review** button, with no missing-fields button. Package view says the item has not been published. The submit button was not clicked.

## Description refresh · 2026-10-14

The English and Korean descriptions were shortened into feature lists. They now distinguish desktop Chrome websites from mobile video apps, a ScrollPlus account from each site's login, and optional skip notices from unconditional notices. On-device processing is stated near the start, while experimental Reels support and the saved-time estimate remain explicit. English is 1,782 characters; Korean is 1,023. Both descriptions were saved and checked in the same draft; the package, title, summary, images, permissions and distribution remain unchanged. This copy update adds no runtime QA evidence or review submission.

## First-review decision · 2026-10-14

The owner requested a first review without waiting for every broader-release live case. Candidate 0.7.3 packages the final left-gutter notice, updates the English/Korean descriptions and screenshot assets, and retains experimental Reels wording. Its checked ZIP is 150,158 bytes, SHA-256 `054ca73645ae9811efc8a4ec7cbc63cc966613cb7a7187ceb791e121c6a48ecc`; see [candidate QA](../qa/release-readiness-073.md). This preparation does not establish Store approval or publication. The dashboard outcome will be recorded after submission is accepted.

## Accepted first review · 2026-10-14

- Candidate **0.7.3** was accepted for review at approximately 11:33 KST. The success dialog said the extension was submitted; after dismissal, the item showed **Pending review**. No second item or duplicate submission was created.
- The exact checked ZIP above was uploaded. The package page confirmed 0.7.3 with English/Korean and storage/host permissions. The final candidate's [push CI](https://github.com/jeongjin0/scrollplus/actions/runs/38501162395) and [PR CI](https://github.com/jeongjin0/scrollplus/actions/runs/38501168258) passed all six checks, including the 80-test suite on current Chromium and Chrome 120. The CI ZIP SHA-256 matches the uploaded candidate.
- English description: 1,899 characters; Korean: 1,063. Both saved descriptions retain experimental Reels and local processing. Each locale has three screenshots; the settings and quiet left-notice images were replaced. Icon and promo tiles remain unchanged.
- Single purpose, storage/host explanations, local-data declarations and public privacy/support URLs were rechecked. Free, Unlisted and all supported regions remain selected. The unchanged 367-character summary links to the candidate reviewer instructions now on main through [PR #52](https://github.com/jeongjin0/scrollplus/pull/52). Credential fields remain blank.
- In the final confirmation, **Automatically publish after passing review was unchecked**, verified before the final submit click. The accepted dialog confirmed staging for later publication and its 30-day window after approval. This is deferred publication, not Store approval or an installable Store release. [Google publication guidance](https://developer.chrome.com/docs/webstore/publish/).
- No Store publication, GitHub 0.7.3 release/tag, new payment or domain purchase was performed. The earlier public GitHub 0.7.2 ZIP is unchanged.

## Next after review

1. Read the actual review decision and address any stated issue; do not infer approval from a submitted form or a passing CI run.
2. Current signed-in Reels/follow positive paths, live Instagram ads and ordinary day-use remain open as recorded in [candidate QA](../qa/release-readiness-073.md). Keep experimental/limited claims qualified before broader promotion.
3. The owner decides manual Store publication after approval. Google states that approved staged submissions expire back to Draft after 30 days if not published. No automatic monitor or publication job was created.
4. After publication, run the proposed [manual-feedback beta](../ROADMAP.md) before a wider rollout. Pending review does not provide an installable Store link yet.
