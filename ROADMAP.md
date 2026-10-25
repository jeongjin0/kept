# ScrollPlus launch roadmap

Updated 2026-10-25. The public [Store listing](https://chromewebstore.google.com/detail/bpiliaicdpeflblgjneilaphgjkgfmja) showed **0.7.4**, updated 2026-10-20. The owner chose **Free/Public with automatic publication after review** on 2026-10-20, superseding the earlier Unlisted/deferred launch plan. GitHub's downloadable beta remains 0.7.2.

## Current update

The owner approved continuing after the compact-notice/popup-recovery source change merged in [PR #56](https://github.com/jeongjin0/scrollplus/pull/56). **0.7.5 was submitted for review on 2026-10-25 with automatic publication on**, through the same Store item; published 0.7.4 remains available until approval/publication. [Update checkpoint](store/update-075.md) records actual submission/delivery state; [candidate QA](qa/release-readiness-075.md) separates current checks from historical evidence.

- Compact count/Undo notifications default on, with Detailed available in Settings. An explicitly disabled notification stays off during upgrade.
- Popup Keep going/Lower the bar after six skips, plus latest adjacent Undo when the notice expires or cannot fit.
- No new permissions, server, analytics, persistent video identifiers or schema change. Existing local data declarations remain applicable.
- Freeze the checked ZIP, verify the actual 0.7.4 → 0.7.5 upgrade, refresh English/Korean Store metadata/screenshots and reviewer instructions, and submit with Public/automatic publication preserved.
- After review/publication, verify the public version and actual Store delivery. A local unpacked upgrade does not establish Store delivery.

## Remaining product validation

Scoped new-version YouTube checks and controlled three-site regressions do not establish all signed-in variants or ordinary day-long use. Current TikTok followed-positive relation persistence, broader ad variants and full-day human use remain open. Reels stays experimental. Historical native evidence remains in [0.7.4 QA](qa/release-readiness-074.md), [signed-in smoke](qa/signed-in-smoke.md) and [release readiness](qa/release-readiness.md).

A proposed manual-feedback beta with roughly 5–10 people for 3–7 days can ask: did it skip wanted videos, did Undo work, was the notice distracting, did the defaults filter enough, and would they keep it enabled? No telemetry or account is required. The numbers are operating suggestions, not a Google requirement or statistical validation. Contacting people, a paid domain or a separate website is outside this update.

Keep using the current GitHub introduction, privacy and support URLs. No new domain or purchase is needed for the Store update.

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
