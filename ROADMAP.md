# ScrollPlus launch roadmap

Updated 2026-10-14. Public GitHub beta: 0.7.2. First Store review candidate: 0.7.3, with the final left-gutter notice from PR #51.

**Assessment:** 0.7.3 was accepted for first Store review on 2026-10-14 with automatic publication off. It is Pending review, Free and Unlisted, not approved or published. The earlier roughly 80% readiness estimate was an engineering judgment, not a measured completion score. Review submission does not certify current signed-in compatibility, retention or usefulness.

The owner requested first review on 2026-10-14 with the live-QA gaps disclosed and automatic publication disabled. Candidate preparation and review submission are authorized by that request. Domain payment, website publication and Store publication remain separate owner decisions. See the [current checkpoint](store/draft-readiness.md) and [candidate QA](qa/release-readiness-073.md).

## Where the product stands

| Milestone | State | Evidence / remaining work |
| --- | --- | --- |
| Product and UX | Implemented | Zero-setup defaults, 100/500/1,000-like presets, custom hard count rules, three platforms, ads, followed-creator keep, Undo/session persistence, side chip, aggregate time saved |
| Automated quality | Passed for 0.7.3 | 126 unit tests; 80 browser tests on current Chromium and Chrome 120 in both [push CI](https://github.com/jeongjin0/scrollplus/actions/runs/38501162395) and [PR CI](https://github.com/jeongjin0/scrollplus/actions/runs/38501168258) |
| Live compatibility | Partially verified | Candidate signed-out YouTube low-like/ad skips; bounded TikTok feed observation. Post-submission source QA observed current signed-in Reels notice motion, a YouTube subscribed exception in the submitted build, and an Instagram followed exception in the source candidate; see [focused QA](qa/reels-follow-motion-20261014.md). TikTok live followed positives and Instagram live ads remain open. Historical 24-hour/login evidence belongs to its older version |
| Submission package | Submitted | Exact 0.7.3 ZIP; English/Korean descriptions and three screenshots per locale; icon/promo images; permissions/data declarations; test instructions. [Privacy policy](PRIVACY.md) explains existing local processing |
| Store distribution | Pending review, not published | Free/Unlisted. Automatic publication was unchecked before final submission; the success dialog and Pending review state confirmed acceptance. No Store approval or live QA completion is inferred |
| Website and domain | Use existing GitHub URLs for now | Cost-conscious beta preparation needs no new domain. `scroll.plus` remains a possible later independent address; purchase and deployment not done |
| Real usefulness | Open | Small manual-feedback beta; no new analytics/backend is proposed |

## Launch sequence

Steps 1 and 3 are complete for the 0.7.3 first review. Review is pending with deferred publication; step 2 retains the broader-rollout live cases. Manual publication in step 4 still needs the owner’s decision.

1. Freeze a release candidate after the submission documentation is settled. Use its exact ZIP/hash for live QA, screenshots and reviewer instructions. Do not carry another package's pass into this one.
2. Finish a focused live matrix before wider rollout: low-like skip, passing-video keep, Undo → reload, current followed/subscribed keep, ad on/off where a live ad is encountered, hidden-tab stop/return, and six-skip pause. Use the sites' existing signed-in sessions; do not turn a review into unrelated account-entry testing. Record a missing live case as unverified. Keep Reels experimental if its latest paths cannot be observed. If a site’s basic skip/Undo path fails, repair it before including that support claim in a submission.
3. Recheck the saved Store draft against the final package: publisher details, single purpose, storage/host explanations, local-data declarations, privacy/support URLs and [reviewer instructions](store/reviewer-instructions.md). Contact verification is complete. Keep private account identifiers and verification links out of repository documentation. See the [draft checkpoint](store/draft-readiness.md).
4. Launch one **unlisted Store item** after owner approval. Use deferred publication during review. Testers can install from its direct URL; unlisted still has the same review/policy requirements as public/private. Use that same item for the later public rollout instead of creating parallel beta/stable items prematurely. [Google distribution guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution), [publication guidance](https://developer.chrome.com/docs/webstore/publish).
5. Run a small beta with roughly 5–10 people for 3–7 days. Ask manually: Did it skip anything wanted? Did Undo work? Was the chip distracting? Did the defaults filter enough? Would they keep it enabled? Require no telemetry or account inside the extension. A reproducible wrong skip, failed Undo or distracting placement gets fixed before wider promotion. These sample sizes and durations are proposed operating choices, not Google requirements or statistical proof.
6. Switch the same Store item to public and update the README/website install link once the basic paths and tester feedback support it. Store distribution then provides ordinary extension updates; an unpacked GitHub install still requires Reload.

One short landing page is enough for the beta: a concrete promise, real extension screenshots, installation CTA, three-site/experimental-support note, GitHub, Privacy and Support. Account systems, pricing and extra features are outside this launch.

## Domain recommendation

**Use the existing GitHub introduction, policy and support URLs for the beta.** The owner wants to keep new spending cautious; a dedicated domain can wait for usage feedback. If an independent product address is later chosen, prefer `scroll.plus`: it spells the selected product name with the dot and works for all three sites. `scrollplus.com` being taken does not require renaming. No search-ranking or conversion uplift is assumed.

The exact `scroll.plus` search on Porkbun showed an Add-to-cart option, **$9.78 for the first year and $47.89/year renewal**, on 2026-10-13. It matched the published standard `.plus` tier; no separate premium label was shown on the result. Availability and the final checkout quote can change. The [exact search capture](qa/screenshots/launch-readiness-20261013/scroll-plus-price.png) records the quote. [Porkbun .plus pricing](https://porkbun.com/tld/plus), [renewal-price guidance](https://kb.porkbun.com/article/108-how-to-check-domain-renewal-price).

| Option | Best use | Tradeoff |
| --- | --- | --- |
| `scroll.plus` | Recommended for a product intended to continue independently | Another annual renewal; people may need the dot spelled out |
| `scrollplus.<owned personal/company domain>` | Lowest additional domain cost for an experiment | Longer address and a parent-brand association; hosting/renewal of the parent still needs maintenance |
| `scrollplus.drifty.so` | Concrete subdomain example under the existing Drifty domain, if the owner wants that association | Can imply it is part of the Drifty product family; not selected or provisioned |
| GitHub repository / GitHub Pages | Minimal public beta home and policy/support links | Less independent presentation; Pages must be configured before treating its URL as live |

Choose one canonical homepage. If the dedicated domain is bought, put the actual site there; avoid publishing one address only to immediately redirect testers to another. A subdomain can be used initially without changing the extension name. A custom domain is not a reason to delay preparation of the Store package: existing public GitHub policy/support URLs are already available.

Suggested dedicated-site routes: `/`, `/privacy`, `/support`. Keep website data handling separate from the extension policy. The simple proposed website needs no analytics or contact form; GitHub Issues can provide support.

The exact checkout/purchase and the canonical parent domain, if using a subdomain, remain the owner's choice. Other owned domains were not established by the read-only checks, so they are not invented as candidates.

## Submission issues already found

- Removed the instruction to leave every data checkbox unchecked solely because the extension has no server. Local data handling must still be disclosed. [Google User Data FAQ, questions 3 and 14](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).
- Explained the page-memory cache, temporary video identifiers, creator allowlist, aggregate counters, follow signals, retention/removal and Limited Use in the policy. These document existing behavior; they do not add storage or transmissions.
- Qualified the listing's followed-creator promise: the site must expose the relation; otherwise the count rules apply.
- Saved the draft's mapping of the inspected data categories and completed publisher contact verification. These declarations still need a final package/policy review before submission; no Google review approval is claimed.

Scope evidence: [release readiness](qa/release-readiness.md), [foreground hardening](qa/foreground-hardening-072.md), [latest beta](https://github.com/jeongjin0/scrollplus/releases/tag/v0.7.2).
