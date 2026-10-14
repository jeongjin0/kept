# Reels motion and signed-in follow QA · 2026-10-14

This is post-submission source work, based on main `99ceaac`. It does not replace the 0.7.3 package currently in Store review, change a version, or publish an update. Reels remains experimental. Private screenshots and sampled recordings are available at [Mini review](http://100.65.71.13:8778/reels-follow-20261014/).

## Findings and changes

On the current signed-in Reels DOM, the creator control is 13 ancestors above the video. The old eight-ancestor fallback misses it when JSON does not expose a relation. The new search reaches the current card and stops before neighbouring videos, wide feed containers or offscreen controls. The actual installed submitted build fails the deep-followed-player regression; the new build passes. This controlled regression reproduces the observed DOM structure, not a claim that a followed live creator was skipped.

In live consecutive skips, the creator caption crosses the left gutter. Hit testing then alternates the notice between full, compact and hidden. The submitted build's 16-second observation recorded eight hide/reappear cycles lasting 17–40ms and two horizontal positions. The changed build waits for 200ms of quiet after scrolling/model updates; its 16-second observation showed one settled notice with no later hide/reappear cycle. The notice still only uses safe space on the left. The same Undo button and keyboard focus survive the quiet interval; dismissal cancels the timer. No idle polling was added.

Both live runs used the installed extension in Mini Aside, with a temporary 100,000,000-like threshold to make skips observable. They recorded 13 and six automatic moves respectively; the second stopped at the safety pause. Their recommended items differ. These samples establish the notice behaviour, not an improvement in skip speed, a safety-cap defect in the submitted build, default-500 effectiveness, or absence of every possible video flicker. Screen captures were sampled about six times per second and assembled at their actual capture intervals; per-frame DOM observations measured the shorter visibility gaps.

## Signed-in exceptions

| Case | Observation | Package scope |
| --- | --- | --- |
| YouTube subscribed Short | A subscribed channel's Short with 660 likes stayed with the temporary 100,000,000-like bar and Keep followed on. Turning the exception off moved away from the same Short; two skips were persisted. No subscription was added for testing | Exact submitted 0.7.3, installed in Mini Aside |
| Instagram followed Reel | An already-followed creator's Reel stayed with Keep followed on and total counter 28. The creator hides likes; its visible 124 comments were below a temporary 100,000,000-comment bar. Turning the exception off moved away and the counter became 29. No follow was added for testing | Installed post-submission motion/follow candidate; final keyboard-focus refinement separately covered by automated regression |
| TikTok followed account | Controlled relation 1/3 keep and relation 2 skip tests pass. Existing Pro TikTok tab could not attach: repeated `Page.enable` timeout. This is not a live positive pass | Current automated suite; live positive case remains open |

Instagram login was completed using the existing saved login and the owner's approved security check. No new credentials, account, OS permission or follow/like/comment action was used. Account identifiers, login tokens and contact lists are excluded from public evidence.

## Validation

- TypeScript, production/fixture builds, 126 unit tests and the complete 83-browser-test suite pass locally.
- New meaningful regressions: deeply nested followed button without JSON relation; offscreen neighbour rejection; one settled notice after a scrolling burst with three reasons, Undo and preserved focus. Both bug regressions fail against the frozen submitted build and pass against the source fix.
- A full-suite failure exposed an asynchronous test assertion: the chip rendered before the background count persisted. The ad test now waits for the same expected counter, with no product counter or expectation change. The complete suite passed afterward, including the final focus refinement.
- Current-head CI, including Chrome 120, must pass before landing; see the PR checks for the final result. Local QA above does not imply Chrome 120 passed yet.

The frozen submission ZIP remains 150,158 bytes, SHA-256 `054ca73645ae9811efc8a4ec7cbc63cc966613cb7a7187ceb791e121c6a48ecc`. Any ZIP generated in this task's worktree is an unreleased source-check artifact, not those submitted bytes. Ordinary day-long use, live Instagram advertisements and TikTok live followed positive behaviour remain unverified.
