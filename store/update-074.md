# 0.7.4 update preparation

Prepared2026-10-14 KST; **submitted for Store review2026-10-20, currently Pending review with automatic publication off**. Published0.7.3 remains available. The original preparation/checklist below is preserved; the actual submission is recorded at the end. Preserve the first-review0.7.3 ZIP and its [reviewer instructions](reviewer-instructions.md). Use the same Store item for the update.

## Package

| Field | Value |
| --- | --- |
| Version | 0.7.4 |
| ZIP | `scrollplus-0.7.4-chrome.zip` |
| Size | 150,625 bytes |
| SHA-256 | `48c71bcf667d9de1920cafdceb6401c7914e840e5f005d0cbf1f765b2f413269` |
| Runtime | Two Instagram bundles add the native ad-disclosure correction; the other 18 non-manifest entries match the original 0.7.4 candidate |
| Defaults / permissions / schema | Unchanged: 500 likes; ads and followed exceptions on; `storage` and the three supported HTTPS hosts; schema 3 |
| Full reviewer steps | [reviewer-instructions-074.md](reviewer-instructions-074.md) |
| Validation | [0.7.4 QA](../qa/release-readiness-074.md) |

The submitted 0.7.3 ZIP remains 150,158 bytes, SHA-256 `054ca73645ae9811efc8a4ec7cbc63cc966613cb7a7187ceb791e121c6a48ecc`. The public 0.7.2 ZIP is also preserved. No release tag or GitHub release is created by preparation.

The latest local build is `.output/ad-width-074/scrollplus-0.7.4-chrome.zip`. The original `.output/scrollplus-0.7.4-chrome.zip` and [original QA review](http://100.65.71.13:8778/update-074/) are preserved historical evidence; use the hash above for the next upload. See [native ad correction](../qa/reels-ad-disclosure-20261014.md).

## After the first review

Read the actual dashboard state before any mutation. Google requires the complete new ZIP, an increased manifest version and another review for an update. Approval of 0.7.3 does not approve 0.7.4. [Official update guidance](https://developer.chrome.com/docs/webstore/update).

| Actual state of 0.7.3 | Next action after owner authorization |
| --- | --- |
| Pending review | Wait. Do not cancel the first review to upload this candidate |
| Approved and staged, not published | If the owner wants the fixes in the first distributed version, cancel the staged publication to return the item to Draft, upload 0.7.4, and submit it for a new review with automatic publication off |
| Already published | Upload 0.7.4 to the same item, update relevant copy and submit for a new review. Existing installs retain the published version until the update is published |
| Rejected / changes requested | Address the actual review feedback first, rebuild and revalidate the candidate; an old ZIP/hash must not be reused after code changes |

Deferred publication has a 30-day window after review completion. Recheck the dashboard and Google's current instructions at execution time. Returning a staged item to Draft and submitting/publishing the update are not performed by this preparation.

## Upload checklist

1. Confirm the ZIP version, size and SHA above. If any runtime change is made, rebuild it, rerun the relevant checks and replace the identity in these documents.
2. Keep Free/Unlisted distribution unless the owner chooses otherwise. Upload the ZIP to the existing item once its state permits an update.
3. The existing English/Korean screenshots and listing remain applicable: the layout is unchanged. Use [listing-074.md](listing-074.md) for the next descriptions, which add the calmer Reels notice behaviour and retain the experimental Reels qualification. Policy, host access and local data declarations remain applicable only because this update changes none of them.
4. Keep reviewer username/password blank. Paste the version-specific short instructions from [reviewer-instructions-074.md](reviewer-instructions-074.md); never provide owner site credentials.
   Verify that the full-steps URL is publicly reachable. Before the source PR lands, use its immutable commit URL from the prepared upload bundle instead of assuming the new file already exists on `main`.
5. Save the draft and inspect the package, both locales, distribution, privacy and test-instruction tabs. Turn **automatic publication off** before the final review submission. Record the accepted package version/hash and resulting review state.
6. Wait for 0.7.4 approval. Manual Store publication and a GitHub release/tag remain separate decisions. After publication, verify the actual install link and a Store-installed upgrade before declaring delivery successful.

## Release notes to paste

**English:** Quieter Instagram Reels skip notices, shown after scrolling settles. Recognises wide Instagram ad disclosures. Improved followed-account detection on Reels without reading neighbouring or hidden controls. Your settings and counters stay unchanged.

**Korean:** 릴스 넘김 알림이 스크롤이 멈춘 뒤 표시되어 깜빡임을 줄였습니다. 넓게 배치된 릴스 광고 표지도 인식합니다. 주변 영상이나 숨겨진 버튼을 제외하고 현재 릴스의 팔로우 상태를 더 정확히 읽습니다. 기존 설정과 누적 기록은 유지됩니다.

## Submitted update · 2026-10-20

- After publishing and installing0.7.3, uploaded0.7.4 to the same Store item. Package view independently confirmed draft0.7.4 and published0.7.3, with the same English/Korean locales and storage/host permissions.
- Rebuilt ZIP:150,625bytes, SHA-256 `48c71bcf667d9de1920cafdceb6401c7914e840e5f005d0cbf1f765b2f413269`, identical to the prior native-tested candidate and both current-head CI artifacts. All six checks passed at `0a9c06b50790bb69aaa2aec38e97312df26df2a5`: [push](https://github.com/jeongjin0/scrollplus/actions/runs/39315517426), [PR](https://github.com/jeongjin0/scrollplus/actions/runs/39315523759).
- Saved English1968/Korean1090-character descriptions and417-character reviewer instructions pointing to the publicly verified immutable source at that head. Reviewer username/password fields remain empty. Existing images, Free/Unlisted distribution and data declarations were retained.
- In the final confirmation, automatic publication was explicitly unchecked and verified before the final Submit action, performed once. The post-submit page became blank after its submitting state; reopening the dashboard confirmed version0.7.4 / **Pending review**. No duplicate submission or review cancellation was performed.
-0.7.4 has not been approved or published by this step. The public Store still serves0.7.3. Store-installed upgrade delivery and ordinary day-long use remain open.
