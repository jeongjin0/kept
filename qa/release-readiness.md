# Release readiness · 0.7.2

Checked 2026-10-13 KST on Mini, macOS ARM64. This patch suspends background-tab filtering and recurring DOM polls, observes Instagram payload changes, and repairs skip-run state after kept videos and interrupted moves. Rules, defaults, UI appearance, permissions and storage keys are unchanged. The generated store screenshots also include the text-free saved-time display introduced in 0.7.1.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| TypeScript and production build | Pass | npm run compile; npm run build |
| Unit tests | 126 passed | Ten new engine regressions for kept videos, interrupted navigation and visibility; existing rule/storage/number tests remain green |
| Local browser suite | 70 passed | Full suite before the final late-count and in-flight sixth-move resets; the added late-count and in-flight cap unit tests pass. Final CI is the completed-change gate |
| Before/after regressions | Reproduced and fixed | Published 0.7.1 fails script-read, hidden-tab navigation and pointer-cancel checks. See [foreground hardening](foreground-hardening-072.md) |
| Package | Pass | npm run zip; node scripts/check-package.mjs; manifest 0.7.2, storage-only permission, exact three supported hosts |
| Popup and settings | Looked at | Popup 426 px tall; Korean settings at 420/1440 px; [captures](screenshots/review-072/) |
| Store images | Regenerated | English and Korean popup/settings include the text-free time value |
| Live smoke | Scoped observation | Production-build YouTube/TikTok in disposable signed-out Chromium 153; see below |
| Soak runner preflight | Pass | Current defaults accepted; 500-like bar and side chip. Finite 1-second requested duration, 3.5-second startup/exit; no long-run claim |
| CI and minimum Chrome 120 | Required before merge | check, full e2e and minimum-chrome jobs; public PR checks are the final completed-change gate |
| Chrome Web Store | Not submitted | GitHub beta only |

## Live observations

The 0.7.2 candidate runtime was observed for 25 seconds on each site, before the final in-flight sixth-move cap adjustment. YouTube loaded five known-count videos, skipped one advertisement, and reported no page errors. The earlier candidate's 35-second YouTube run also skipped a 111-like video and one ad; that observation preceded the final late-count reset and is not presented as proof of the final ZIP. TikTok loaded four known-count videos in the final run, none under 500 likes, so automatic low-like filtering was not exercised by that live sample. It emitted one `a.init is not a function` page error from its own `ttwstatic.com` script; the same error was reproduced in a separate 25-second no-extension control using a fresh profile. It is recorded as a site error that also occurs without ScrollPlus, rather than an extension-free assumption or an error-free live pass. Instagram redirected to `/accounts/login/`, so signed-in Reels was not checked.

Native-visibility controlled pages establish hidden-tab stop/resume on all three platforms. They do not establish current signed-in production compatibility. Human day-long use, current signed-in Following/Instagram Undo and a live Instagram ad remain open. Historical signed-in, latency and 24-hour evidence retain their original package scope.

## Review and history

The Air-openable review is [http://100.65.71.13:8778/review-072/](http://100.65.71.13:8778/review-072/). The Mini private review service serves only review assets and the beta ZIP. Stop after review ends with `launchctl bootout gui/501/com.edgethink.scrollplus.review-031`. No Air-side probe is claimed.

Earlier reports: [0.7.1](release-readiness-071.md), [0.7.0](release-readiness-070.md), [0.6.0](release-readiness-060.md), [historical signed-in](signed-in-smoke.md), [historical long-feed QA](soak.md).
