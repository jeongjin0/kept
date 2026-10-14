# First-review candidate · 0.7.3

Prepared 2026-10-14 KST on Mini. The owner requested a first Chrome Web Store review with the remaining live-site limitations disclosed. Review submission and later publication are separate steps. This candidate contains the final left-gutter notice from [PR #51](https://github.com/jeongjin0/scrollplus/pull/51), rather than the older 0.7.2 draft runtime.

| Check | Result | Scope |
| --- | --- | --- |
| TypeScript, build and package | Pass | Compile, production build, fixture build, ZIP and package checker |
| Unit tests | 126 passed | Rules, engine, storage and number handling |
| Browser suite | 80 passed locally | Actual extension, controlled adapters, popup/settings, background suspension, skip cap and left-notice geometry |
| Runtime identity | Verified | Every ZIP entry matches the built unpacked files. All JavaScript, UI, locales and icons match the final PR #51 candidate byte for byte; only manifest version changes to 0.7.3 |
| CI and minimum Chrome 120 | Pass | All six current-head checks passed in [push CI](https://github.com/jeongjin0/scrollplus/actions/runs/38501162395) and [PR CI](https://github.com/jeongjin0/scrollplus/actions/runs/38501168258); 80 browser tests per browser job. CI ZIP SHA matches the uploaded candidate |
| Store images | Regenerated and inspected | English/Korean options and quiet left-notice images; all six screenshots checked at 1280 × 800 |
| Live notice geometry | Scoped observation | Final runtime's signed-out YouTube capture shows the compact notice left of the video with comments closed/open/closed. See [left-notice QA](left-notice-20261014.md) |
| Store review | Submitted, Pending review | Final confirmation had automatic publication off. The success dialog and subsequent item state confirmed acceptance; see [checkpoint](../store/draft-readiness.md) |

ZIP: `scrollplus-0.7.3-chrome.zip`, **150,158 bytes**. SHA-256: `054ca73645ae9811efc8a4ec7cbc63cc966613cb7a7187ceb791e121c6a48ecc`. The previous public 0.7.2 ZIP and its hash remain unchanged. No GitHub 0.7.3 release or tag is created by this preparation.

The YouTube layout observation used a temporary high threshold to make skips observable; it does not measure how often the default 500-like rule filters a normal feed. Current signed-in Reels, positive follow/subscription signals, a live Instagram ad and ordinary day-long use remain unverified. TikTok live samples do not establish the current low-like path. Earlier timing and soak evidence retain their original package scope. Reels remains experimental in both descriptions. No new permissions, data storage or data transmission were introduced by this candidate preparation.

Initial distribution remains Free and Unlisted. The requested first review uses deferred publication. Store approval, manual publication, tester feedback and wider promotion are still separate milestones; see [roadmap](../ROADMAP.md).
