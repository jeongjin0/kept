# Release readiness · 0.4.4

Checked on 2026-10-12 KST, macOS ARM64. This candidate changes the extension's own pages and nothing about how it skips. Settings opens in a tab of its own (options_ui open_in_tab) instead of the small dialog that chrome://extensions shows, with the ScrollPlus icon and a title in the browser's language on the tab. The GitHub button shows GitHub's mark in white instead of a star. Rules, presets, defaults, permissions and the skipping code are unchanged. Chrome Web Store submission has not occurred; SPEC.md says not to submit it.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript | Pass | npm run compile |
| Unit tests | 75 passed | npm test; no new test, the changed code is the pages |
| Built-script browser tests | 54 passed | npm run test:e2e; adds one test: the manifest opens the options page in a tab, the popup's Settings link opens chrome-extension://<id>/options.html as a new tab titled "ScrollPlus · Settings", and that page links to the repository. It fails on the 0.4.3 build, whose options_ui has open_in_tab false |
| Popup and settings page | Pass | scripts/capture-ui.mjs in English and Korean: the popup is 406 px high at 1x and 2x and does not scroll, the settings page has no horizontal overflow at 360 px, and there were no page errors. The store images that show the popup (popup and marquee, both languages) were rendered again from the real page |
| Live Instagram and TikTok timing | Carried over from 0.4.3 | Not repeated. The skipping code is unchanged, and the same browser tests ran on these bundles. The [Instagram](skip-timing-instagram.md) and [TikTok](skip-timing-tiktok.md) reports describe the 0.4.3 scripts |
| Settings from chrome://extensions in a real Chrome | Not observed | The test calls openOptionsPage from the popup page in Chromium with the extension loaded. The extension card's options link was not tried, and the signed-in Aside browser cannot load an unpacked extension without a file dialog |
| Minimum Chrome 120 | {{CI}} | |
| Package | Pass | npm run zip and node scripts/check-package.mjs; MV3, Chrome 120+, storage and the existing three host permissions |
| Package scope | Pages, manifest, locales and the icon table changed | Against the 0.4.3 package: manifest.json (version, options_ui.open_in_tab), options.html (tab icon), popup.html and the shared, popup and options chunks and the stylesheet (new file names), both locale files (two renamed keys), THIRD_PARTY_NOTICES.txt (new), and the three content scripts, whose only change is the icon table they share with the popup (the star is out, the GitHub mark is in, neither is drawn on a page) and the short names the minifier picked. The background worker and the three main-world scripts are byte for byte those of 0.4.3 |
| GitHub's mark | Credited | Octicons mark-github (MIT), shipped with its notice in THIRD_PARTY_NOTICES.txt; white, unaltered, linking to the repository as [GitHub's logo guidelines](https://github.com/logos) allow. README, the store listing and SPEC.md say that ScrollPlus is not affiliated with GitHub |
| Chrome Web Store | Not submitted | [Submission checklist](../store/submission-checklist.md) is unchanged |

## Artifact

scrollplus-0.4.4-chrome.zip, 132,290 bytes.

SHA-256: 01283cd3359c0b2e88f7f2d5c0f0e0780cf5d778970d806b2ca41e06ba4cd2ec.

This identifies the tested local candidate. CI ZIP metadata can differ. The previous exact-package reports remain in [0.4.3 release readiness](release-readiness-043.md#artifact), [0.4.2](release-readiness-042.md#artifact), [0.4.1](release-readiness-041.md#artifact), [0.4.0](release-readiness-040.md#artifact), [0.3.7](release-readiness-037.md#artifact), [0.3.6](release-readiness-036.md#artifact) and [0.3.5](release-readiness-035.md#artifact).

## Remaining gates

1. Install 0.4.4 the ordinary way and open Settings from the popup and from the extension's card on chrome://extensions.
2. The gates of 0.4.3 stand: Instagram Reels and TikTok with a wheel or trackpad, a live Instagram ad skip and the sound there, ordinary human day-use, and a long run on each site.
3. Update the listing only to match verified support. Store submission remains an owner decision.
