# ScrollPlus launch roadmap

Updated 2026-10-13. Baseline: released 0.7.2, commit `317f01bcd4b7b734e604c96a6ab45e255c178972`.

**Assessment:** core development is complete enough to prepare a Store beta. The first Store launch is roughly 80% ready as an engineering judgment, not a measured completion score. Remaining work concerns current live coverage, truthful submission details and distribution. Retention and usefulness are still unvalidated.

This is a recommendation for the next launch sequence. It does not authorize domain payment, website publication or Store submission; the existing owner decision in SPEC.md remains in force.

## Where the product stands

| Milestone | State | Evidence / remaining work |
| --- | --- | --- |
| Product and UX | Implemented | Zero-setup defaults, 100/500/1,000-like presets, custom hard count rules, three platforms, ads, followed-creator keep, Undo/session persistence, side chip, aggregate time saved |
| Automated quality | Passed for 0.7.2 | 126 unit tests; 70 browser tests on current Chromium and Chrome 120 in both [final CI 1](https://github.com/jeongjin0/scrollplus/actions/runs/38379561306) and [final CI 2](https://github.com/jeongjin0/scrollplus/actions/runs/38379567920) |
| Live compatibility | Partially verified | Candidate signed-out YouTube low-like/ad skips; bounded TikTok feed observation. Current signed-in Reels, positive follow/subscription paths and Instagram live ads remain open. Historical 24-hour/login evidence belongs to its older version |
| Submission package | Prepared, disclosure being corrected | ZIP, English/Korean listing, icons, screenshots, MIT/open-source setup. [Privacy policy](PRIVACY.md) and [submission checklist](store/submission-checklist.md) now describe local data handling explicitly |
| Store distribution | Not submitted | Publisher registration/contact/2-Step Verification must be confirmed. The inspected dashboard requested Google reauthentication; account readiness is unconfirmed, not proven absent |
| Website and domain | Recommendation ready | `scroll.plus` quoted as available at normal-tier pricing on 2026-10-13; purchase and deployment not done |
| Real usefulness | Open | Small manual-feedback beta; no new analytics/backend is proposed |

## Next steps, in order

1. Freeze a release candidate after the submission documentation is settled. Use its exact ZIP/hash for live QA, screenshots and reviewer instructions. Do not carry another package's pass into this one.
2. Finish a focused live matrix: low-like skip, passing-video keep, Undo → reload, current followed/subscribed keep, ad on/off where a live ad is encountered, hidden-tab stop/return, and six-skip pause. Use the sites' existing signed-in sessions; do not turn a review into unrelated account-entry testing. Record a missing live case as unverified. Keep Reels experimental if its latest paths cannot be observed. If a site’s basic skip/Undo path fails, repair it before including that support claim in a submission.
3. Finish the Store fields: selected publisher account, contact verification, 2-Step Verification, single purpose, storage/host explanations, local-data category declarations and publicly reachable privacy/support URLs. The checklist includes [reviewer instructions](store/reviewer-instructions.md).
4. Launch one **unlisted Store item** after owner approval. Use deferred publication during review. Testers can install from its direct URL; unlisted still has the same review/policy requirements as public/private. Use that same item for the later public rollout instead of creating parallel beta/stable items prematurely. [Google distribution guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution), [publication guidance](https://developer.chrome.com/docs/webstore/publish).
5. Run a small beta with roughly 5–10 people for 3–7 days. Ask manually: Did it skip anything wanted? Did Undo work? Was the chip distracting? Did the defaults filter enough? Would they keep it enabled? Require no telemetry or account inside the extension. A reproducible wrong skip, failed Undo or distracting placement gets fixed before wider promotion. These sample sizes and durations are proposed operating choices, not Google requirements or statistical proof.
6. Switch the same Store item to public and update the README/website install link once the basic paths and tester feedback support it. Store distribution then provides ordinary extension updates; an unpacked GitHub install still requires Reload.

One short landing page is enough for the beta: a concrete promise, real extension screenshots, installation CTA, three-site/experimental-support note, GitHub, Privacy and Support. Account systems, pricing and extra features are outside this launch.

## Domain recommendation

**Prefer `scroll.plus` as the independent product address.** It spells the selected product name with the dot and works for all three sites. `scrollplus.com` being taken does not require renaming. No search-ranking or conversion uplift is assumed.

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
- Kept actual Store checkbox/category certification and publisher readiness open until the dashboard definitions/account are inspected. No claim of guaranteed review approval is made.

Scope evidence: [release readiness](qa/release-readiness.md), [foreground hardening](qa/foreground-hardening-072.md), [latest beta](https://github.com/jeongjin0/scrollplus/releases/tag/v0.7.2).
