# Release readiness · 0.7.1

Checked on 2026-10-13 KST. This patch removes estimate labels and explanatory copy from the time-saved display. The popup and Settings show a clock icon and the time value; Settings retains the count start date. The local calculation and its assumptions remain documented in README.md and SPEC.md. Filtering behavior and permissions are unchanged.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Production build | Pass | `npm run build` |
| Korean popup and Settings | Looked at | Captured from the built extension at 420 px and 1440 px. See [review captures](screenshots/review-071/). |
| English and Korean locale JSON | Pass | Both locale files parse; the popup and Settings use the localized accessible name for the otherwise text-free time value. |
| Unit, browser and minimum Chrome checks | Pending CI | PR #46 runs the established suites, including Chrome 120. |
| Chrome Web Store | Not submitted | This is a GitHub beta candidate. |

## Review

The Air-openable HTML review is served at [http://100.65.71.13:8778/review-071/](http://100.65.71.13:8778/review-071/).
