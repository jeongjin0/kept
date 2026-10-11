# Idle cost of the grid scan · 0.3.7

2026-10-09 KST. Real built extension scripts in isolated Chrome for Testing, on a routed controlled YouTube page. Before: the published 0.3.6 ZIP, SHA-256 `3d6325f8ab76539e791a52e9b6f31f4e577b9c1743d33ddabc510cc4ee71a994`. After: [0.3.7 candidate](release-readiness-037.md#artifact). This is a CPU measurement of script time on a static page; it does not measure memory or a real feed.

## What was running

Every 400 ms each tab ran the shared grid scan. Before checking whether grid filtering was on, it listed every link on the page, read each link's resolved address and measured the matching ones. Grid filtering is off by default, so in the shipped configuration that work only existed to restore cards ScrollPlus had hidden earlier, which is almost never.

## Measurement

Chrome's own `Performance.getMetrics` ScriptDuration for the page, after a 3-second settle, with the shipped defaults:

| Links on the page | Idle sample | 0.3.6 | 0.3.7 |
| ---: | ---: | ---: | ---: |
| 3,000 | 8 s | 0.131 s | 0.002 s |
| 15,000 | 8 s | 0.621 s | 0.002 s |
| 20,000 | 3 s | 0.315 s | 0.001 s |

The cost grew linearly with page size, about 8% of one core at 15,000 links, and is now negligible. Layout and style-recalculation counts stayed at zero in these probes because the page was static; a page that changes layout between scans would pay more for each measurement. Another Chrome process was running at the same time, so treat the numbers as indicative rather than a benchmark.

## Change and regression check

The controller remembers whether it may still have hidden cards. While grid filtering is off and none remain, it skips the scan. Turning grid filtering on, or off again, still scans immediately and restores every hidden card; the existing grid regression `e2e/grids.spec.ts` covers both directions. A new test, `e2e/idle-cost.spec.ts`, loads 20,000 links with the shipped defaults and requires under 0.1 s of script time over 3 idle seconds. It reports 0.29 s on the published 0.3.6 and passes on 0.3.7.

Run `npm run build`, then `npm run test:e2e -- e2e/idle-cost.spec.ts e2e/grids.spec.ts`. Set `SCROLLPLUS_EXTENSION_PATH` to an unpacked older package to see the regression fail.

## Evidence limits

With grid filtering on, the scan still lists links every 400 ms. Real YouTube, TikTok and Instagram pages have many fewer links than these synthetic pages in most views, so the saving on a typical page is smaller than the table suggests. This work is not shown to explain the two stalls in the 0.3.5 24-hour run.
