# UI review · 0.5.3

Captured 2026-10-12 from the built extension, Korean and English, at the browser language. Popup height was 426 px in both languages. The settings page was captured at 1440 px and at 420 px. The skip chip was captured on a live signed-out YouTube Shorts page with the built extension.

## What holds

The popup is one screen. Power, today's count, the time-saved estimate, the three presets with their like counts, Skip ads, the three sites, Settings and GitHub. Nothing scrolls. The Korean preset row reads 느슨 100, 기본 500, 엄격 1천.

Settings is one column. Rules, sites, behavior, creators, reset. The new row "구독·팔로우 중인 계정은 유지" fits on a 420 px width with its switch, and the number fields drop under their labels there. The chip position control shows 위, 가운데, 아래, with 위 selected. The empty creator list says to add one from the popup. GitHub is the mark plus the word, not a star.

On a live Short the chip sat on the video, centred, and read "넘김 · 광고" with 되돌리기. It stayed readable on a bright title card. That page was signed out, so the subscribe button said 구독 and the follow rule was not the thing being shown.

## What this pass changed

0.5.3 does not restyle the popup or settings. It hardens the follow signals and does less repeated work. Longer labels now count: "Subscribed to …", a short label containing 구독중, "Following …", and Unfollow. A caption that only mentions subscribing still does not. YouTube no longer parses the large sequence and next responses, and it does not resend a video whose counts and follow flag are unchanged. Instagram looks for the follow button beside the reel instead of every button on the page.

## Still open

A signed-in YouTube, TikTok and Instagram were not available in the browser used for this capture. Whether a channel you actually subscribe to stays under the like bar is still the open check. The chip was seen on the wide Shorts layout, not inside the narrow full-height player.

Images: [popup, Korean](screenshots/review-053/popup-ko.png), [settings, Korean](screenshots/review-053/options-1440-ko.png), [settings at 420 px](screenshots/review-053/options-420-ko.png), [skip chip on a Short](screenshots/review-053/real.png). English copies sit beside them.
