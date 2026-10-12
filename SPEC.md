# ScrollPlus specification

This file is the product spec. Implement it. Do not add features that are not written here. If a rule is missing, leave the behavior out and record the gap in qa/gaps.md. Read this file before coding and again before calling the work done.

Status: 0.4.4 beta. Settings opens in a tab of its own instead of the small dialog that chrome://extensions shows for an options page, and the GitHub button carries GitHub's mark in white instead of a star. Skipping is unchanged: the YouTube, TikTok and Instagram scripts differ from those of 0.4.3 only in the icon table they share with the popup. 0.4.3: On Instagram Reels a skipped reel is on screen for a median 0.32 s instead of 0.62 s (live, signed in, 20,000-like bar, the built Instagram scripts run in the page behind a stand-in for chrome.storage; qa/skip-timing-instagram.md): ScrollPlus waits 100 ms instead of 450 ms between skips, looks at the feed while it scrolls, and presses as soon as the reel is on screen enough. On TikTok the wait after a video arrives is 180 ms instead of 150 ms, because TikTok answers a press made sooner than about 0.16 s after an arrival 0.1 s late: the median skipped video is on screen for 0.31 s instead of 0.38 s (qa/skip-timing-tiktok.md). A person who scrolls Reels with a wheel or trackpad was not simulated. 0.4.2: on TikTok a skipped video is on screen for 0.48 s on average instead of 1.03 s (live, signed out, 20,000-like bar): ScrollPlus no longer presses a Next control that TikTok keeps disabled until it has the next video, waits 150 ms after a video arrives instead of 450 ms between skips, and leaves TikTok's sound alone because TikTok takes a mute made by a script as the person's own choice. A row of skips shows one chip. 0.4.1: on YouTube a Short that follows another skip is on screen for about 0.5 s instead of 0.8 s, a press the site does not act on is pressed again after 0.7 s instead of 2 s, and a Short that is being skipped is muted. Why the first skip stays at about half a second is in qa/skip-timing.md. A Skip ads switch, off by default, moves past an ad that fills the player on YouTube Shorts, TikTok and Instagram Reels. While grid filtering is off, pages are not rescanned for links. Instagram keeps disclosed advertisements and non-video cards. TikTok/Instagram publish only changed rows and active-player data; unchanged embedded payloads are not reparsed. Undo now survives reloads and new tabs for the browser session; Reset clears those temporary choices. Bounded 0.3.5 signed-in default filtering and TikTok Undo/reload/Reset were observed in Aside Chromium 153; earlier 0.3.3/0.3.4 paths retain their own package scope. The exact-0.3.5 automated 24-hour YouTube run completed with two reviewed page-reload recoveries. Current Instagram Undo/reload, broader signed-in Google Chrome, positive-path live Following and ordinary human day-use remain open. See qa/session-undo.md and qa/release-readiness.md. Decisions below are locked.

## Product

ScrollPlus is a Manifest V3 Chromium extension. After install, with no account and no setup, it skips Shorts, Reels, and TikToks that have too few likes while the user scrolls short-form feeds.

Platforms:

- YouTube Shorts on https://www.youtube.com/shorts/
- TikTok on https://www.tiktok.com/ For You, Following, and video pages
- Instagram Reels on https://www.instagram.com/ when the user is already signed in

TikTok creator recommendation cards and profile/search previews are not active players. Optional grid filtering remains a separate setting.

The scroll stays. The extension never empties a feed, never hides all shorts, and never blocks the sites.

English line: Weak videos skip themselves.

Korean line: 설치하면 바로 켜집니다. 좋아요가 적은 쇼츠, 릴스, 틱톡을 넘깁니다.

## Name

ScrollPlus, in both languages. The owner chose it: short, easy to say, and it names no service, so it cannot read as official. In the wordmark "Plus" is set in the accent color. The role is carried by the store title, "ScrollPlus – Skip low-like short videos" / "ScrollPlus – 좋아요 적은 숏폼 건너뛰기". Earlier working names were Kept and Short-Form Like Filter.

The locale files hold two strings: extName is the manifest name and the store title, and appName is the short name shown in the toolbar tooltip, the popup, and the options page.

## Repository

- Local directory: /Users/jeongjin/Developer/edgethink/kept (keeps its old name)
- Public GitHub repo: github.com/jeongjin0/scrollplus
- License: MIT
- Version: 0.4.4
- Do not put this project in the Obsidian vault
- Do not submit it to the Chrome Web Store

## Non-goals

Do not build any of these:

- AI or model classification
- Keyword, topic, or channel blocklists other than the creator allowlist
- Hiding all Shorts, Reels, or TikTok
- Downloaders, auto-like, auto-follow, or auto-comment
- Blocking ad requests, hiding ads inside lists, or restyling a site. Skip ads only moves past the ad that fills the player.
- Accounts, sync, payments, analytics, servers, or remote code
- Firefox, Safari, mobile apps, or embedded players on other sites
- m.youtube.com, music.youtube.com, and non-www TikTok or Instagram hosts
- Rates, scores, or weights. The rules are plain counts.

## The rule

A rule is a list of conditions. Each condition is one count the page shows, an on/off switch, and a minimum.

| Condition | Default | Default minimum | Shown by |
| --- | --- | --- | --- |
| Likes | on | 5,000 | YouTube, TikTok, Instagram |
| Comments | off | 100 | TikTok, Instagram |
| Views | off | 100,000 | YouTube, TikTok, Instagram |

Skip a video when any turned-on condition has a known count that is under its minimum. Nothing else is judged. There is no minimum number of plays: a video with 40 views and 3 likes is skipped by the default rule.

- A count the page does not show is ignored. If no turned-on condition has a known count, keep the video.
- A count equal to the minimum passes.
- If the creator is allowlisted, keep the video.
- If the platform is off or the master switch is off, keep the video.
- Photo carousels and items with no metrics are kept. Ads are kept too unless Skip ads is on (see Ads).

### Presets

A preset sets Likes to a fixed minimum, turns Likes on, and turns Comments and Views off. The spare minimums for Comments and Views are remembered.

| Preset | Korean | Skip when likes are under |
| --- | --- | --- |
| Lenient | 느슨 | 1,000 |
| Balanced | 기본 | 5,000 |
| Strict | 엄격 | 20,000 |

The popup and options show the active preset. Any rule that matches no preset is shown as Custom. The presets show their like count inside the control.

### Numbers

Counts are shown short in the interface language: 5K and 20K in English, 5천 and 2만 in Korean. Fields accept what people type: 5000, 5,000, 5k, 2만, 3천. The plus and minus buttons step through round numbers: 5, 10, 20, 50, 100, 200, 500, 1K, 2K, 5K, 10K, 20K, 50K, 100K, and up to 10M.

### Ads

Skip ads is a switch, off by default. Off, an ad is kept whatever its counts: an ad that shows 125 likes stays. On, an ad that fills the player is skipped as soon as it is known to be one, without waiting for counts and without looking at them. The chip says "Skipped · ad" / "넘김 · 광고" with Undo, and Undo keeps that ad for the browser session like any other skip.

- Only the active player is judged. Ad cards in lists and grids are never hidden, even with Skip ads and filterGrids both on.
- The usual keeps apply first: the master switch, a site that is off, and a creator the user kept.
- An ad counts as a skip: toward today's count and toward the six-in-a-row pause.
- Never skip on a guess. An item is an ad only when the site marks it as one:
  - YouTube: the Shorts reel renderer carries the is-ads-overlay attribute. It changes in the same millisecond as the URL and the navigate-finish event, in both directions, so it never lags the id it belongs to. The ad's own ytd-ad-slot-renderer is not used: it stays in the DOM for up to 200 ms after the next Short has started.
  - TikTok: the ad flag (isAd) in the item data the page loaded.
  - Instagram: the ad flag (is_ad) in the data the page loaded, or a visible "Ad", "Sponsored" or "광고" disclosure inside the player of a reel that is on screen. A page without a visible video is a photo card and is kept unless its data flags it as an ad.
- The data flag of an ad outranks a guess from the layout.
- Before moving, the page script checks once more that the item is still what the decision assumed. A count never moves on from an ad, and the ad rule never moves on from something that is not an ad, so a stale decision cannot skip the wrong item.
- An ad the site does not mark this way is an ordinary video and is judged by its counts.
- An ad the site serves again with an id already decided in this page session is not decided again. This is the same rule that leaves a video alone when the user goes back with the site's own Previous control.

### Grids and shelves

Home shelves, channel grids, profile grids, and search grids are not filtered unless filterGrids is on. Default is off, and then the page's links are listed only to restore cards ScrollPlus hid earlier. When it is on, the same rule applies. A card whose counts are unknown is kept.

## Defaults

On install, write these defaults and apply them immediately. The extension must work if the user never opens the popup.

    {
      "enabled": true,
      "rule": {
        "likes":    { "on": true,  "min": 5000 },
        "comments": { "on": false, "min": 100 },
        "views":    { "on": false, "min": 100000 }
      },
      "platforms": { "youtube": true, "tiktok": true, "instagram": true },
      "filterGrids": false,
      "showSkipChip": true,
      "skipAds": false,
      "allowlist": []
    }

Settings from 0.1.x that hold a sensitivity map to the matching preset. Settings saved before 0.4.0 have no skipAds and read as off. Anything unreadable falls back to the defaults.

Rule and power changes re-evaluate the current video immediately. Undo still keeps its video for the session. A deliberate Continue or Lower action renews the decision window after a long pause; known counts that arrived on time remain usable after writing a comment.

There is a master switch. Default is on. Turning it off pauses every platform without deleting settings.

Page data crosses the MAIN/isolated boundary only when an item or active-player observation changes. The isolated cache merges row updates. Embedded JSON is re-read when a script node's full text changes, including same-length/same-prefix replacements. Known metrics remain available for revisits; this is not a bounded-history policy. See [bridge QA](qa/feed-cache-performance.md).

## Skip behavior

This applies to the active vertical player only.

- Wait up to 700ms for metrics. If they arrive within 2 seconds of the video opening, judge them. On a freshly loaded page the first video gets until 6 seconds after load, because counts arrive late there. After that, keep the video. Never skip blind.
- Advance with the site's own next control. On every site, click that control from the page script. A click or key event sent from the extension's isolated world does not move the feed on YouTube or TikTok. Historical [signed-in Reels QA](qa/signed-in-smoke.md) also confirmed page-script navigation through Instagram's own next-reel control on 0.3.3; it does not establish signed-in compatibility for the current 0.3.6 package. On TikTok that control is the button labelled Next video, or the feed navigation button; a key press is the last resort. TikTok keeps that button disabled until it has the next video, often for half a second and sometimes for several seconds. While it is disabled ScrollPlus presses nothing and looks again every 50ms, so the press follows within a few hundredths of a second of the button being offered. The feed counts as moved when the video id changes or, while the next player is still empty, when a different feed item is most on screen. If the control is not ready, retry until 5 seconds after the video opened, then stop. Do not delete DOM nodes. Do not restyle the host page.
- Wait between automatic advances: on Instagram until the reel is on screen enough to be moved on from (at least 60% of it; look again every 50ms, up to 5 seconds after it opened) and until 100ms after the previous move was confirmed. Reels takes a press while it is still scrolling (all 669 presses of one measurement, made at waits from 450ms down to none, were taken), and the sooner a press follows a reel's arrival the shorter the reel stays on screen (see [Instagram timing](qa/skip-timing-instagram.md)). On TikTok wait until the video has been the active one for 180ms and until 100ms after the previous move was confirmed: TikTok ignores a press made within about 0.1s of the last one, takes one made while it is still scrolling, and answers one made less than about 0.16s after a video arrived 0.1s later than one made after that (see [TikTok timing](qa/skip-timing-tiktok.md)). On YouTube wait 150ms after the previous move has finished, then press: the site starts the next move no sooner than about 0.37s after the last one finished, so a later press only keeps the skipped Short on screen longer (see [skip timing](qa/skip-timing.md)). A video that arrives while a move is still being confirmed is judged as soon as the move is confirmed. Never advance in parallel.
- YouTube announces the start of every move between Shorts (the yt-navigate-start event), within 0.53s of a press it acts on and never after one it ignores, for example while it loads the next batch of Shorts. Once the page has announced a move, a press that has not been followed by a start after 700ms is pressed again, every 400ms until one starts. A press is never repeated once a move has started, so a slow move is not doubled. Before the page has announced any move the wait is the plain one.
- On YouTube the Short being skipped is muted from the moment ScrollPlus presses until the move ends or fails, only if the player was not already muted. The site sets the volume again when it loads the next Short, and ScrollPlus puts the player back if the move does not happen. It does not touch what the site stores about the volume.
- On TikTok ScrollPlus does not touch the sound. TikTok takes a mute made by a script as the person's own choice: in about half of the sessions measured, every later video then started muted and TikTok stored the mute in localStorage ([TikTok timing](qa/skip-timing-tiktok.md)). A skipped TikTok video is therefore heard for as long as it is on screen. ScrollPlus does not touch Instagram's sound either. The reels of the account it was measured on all started muted, so how long a skipped reel is heard was not measured ([Instagram timing](qa/skip-timing-instagram.md)).
- On TikTok and Instagram the active video is also looked at while the feed scrolls (at most every 60ms) and when it stops, not only every 400ms. On every site a missing player counts as leaving the feed only after 300ms, because a scrolling feed has no player for a moment between two videos, and that moment must not clear the chip or reset the count of six.
- Stop after 6 consecutive skips. Show a non-modal chip: "The next ones are under your bar." Korean: "다음 영상도 기준 아래입니다."
- Actions on that chip: "Keep going" / "이어서 보기" resets the cap for another 6. "Lower the bar" / "기준 낮추기" moves every turned-on minimum down one step on the number ladder, then continues. If every turned-on minimum is already at the lowest step, only "Keep going" is shown.
- Do not advance while a comment field is focused, the pointer is down, or a menu is open.
- If the next control does not exist, stop and leave the current video. Do not loop.
- The extension's only host-page UI is the chip. No banner, no sidebar, and no restyling of YouTube, TikTok, or Instagram.

When a skip happens and showSkipChip is on, the chip says why, with the count that missed: "Skipped · 454 likes" / "넘김 · 좋아요 454", plus "Undo" / "되돌리기", for 2.5 seconds. Comments and views read the same way, and an ad skipped by Skip ads reads "Skipped · ad" / "넘김 · 광고". Undo moves back one item and keeps the skipped id for the browser session, even when the engine already sees the next video. Undo does not write the creator allowlist. Repeated polling never replaces a focused chip button. A skip that follows a skip changes the words of the chip that is already shown instead of showing a new one.

A session keep-set is memory only, shared across reloads and tabs by platform. Use trusted-only chrome.storage.session through a background message broker, and commit before retreating. Do not persist video ids to disk. Browser restart, extension reload/update/disable and Reset clear the temporary choices. Older delayed messages must not restore choices cleared by Reset.

## Allowlist

Empty by default. The popup action "Keep this creator" / "이 제작자는 유지" adds the current creator and then reads "Creator kept" / "제작자 유지됨".

Store stable ids:

- YouTube: channelId
- TikTok: uniqueId without @
- Instagram: username, lowercased

Match on that id. Options can remove entries. The allowlist survives restarts and survives Reset. The session undo set does not.

## Popup and options

The popup is 320 wide and no taller than 480. It does not scroll, including when the creator button and the signed-out note are both shown.

Popup contains only:

- The app mark and the name, and a round power button for the master switch
- Today's skip count, large, with the label "skipped today" / "오늘 넘김"
- The preset control: Lenient, Balanced, Strict, each showing its like count
- One row with a switch, "Skip ads" / "광고 건너뛰기", with a megaphone icon, in its own card under the presets
- Three site rows, each with an original icon, the site name, and a switch. No other text in the row.
- "Keep this creator" when a supported video is active
- The signed-out note when it applies
- Footer: a Settings link, with a Custom badge when the rule matches no preset, and a GitHub button

If Instagram metrics are unavailable because the user is signed out, the popup says "Instagram is signed out. Nothing is hidden." Korean: "인스타그램에 로그인되어 있지 않습니다. 숨기지 않습니다." Do not show this as a modal on instagram.com.

The options page opens in a tab of its own (open_in_tab), from the popup's Settings link and from the extension's card on chrome://extensions, and not in the small dialog that chrome://extensions shows for an options page. Its tab has the ScrollPlus icon and the title "ScrollPlus · Settings" / "ScrollPlus · 세부 설정". The content is one centred column, at most 600px wide.

Options, top to bottom:

- Wordmark and the power button with an On / Off label
- Today's skip count
- Rules: the preset control, then one row each for Likes, Comments, and Views. Each row has an icon, the name, a stepper with plus, minus, and a typeable number, and a switch. Comments shows the TikTok and Reels icons, because YouTube does not show comment counts. A turned-off row is dimmed and its stepper is disabled.
- Sites: the three site rows
- Behavior: skip ads, also filter lists and grids, and show the skip chip
- Creators to keep: the list with a remove button, or an empty state
- Reset to defaults, which clears temporary Undo choices and keeps the allowlist and today's count, and the GitHub button. Disable Reset while pending; report a failure inline rather than claiming success.
- A one-line privacy statement

Changes apply immediately. There is no save button. The toolbar icon has no number badge.

Escape cancels a numeric edit. An invalid number is not saved and gets an inline error. At narrow widths, a rule's number field moves below its label and switch. Saved creators already show as kept when the popup reopens.

The GitHub button shows GitHub's own mark in white (Octicons mark-github, MIT, credited in public/THIRD_PARTY_NOTICES.txt) and the word GitHub, with the tooltip "Star this project on GitHub" / "GitHub에서 별표 남기기". The interface never says "Star us". It opens the public repo in a new tab and appears in the popup and the options page. It is never injected into a host site. The mark is used only to link to the repository, unchanged and in white, as GitHub's logo guidelines allow, and nothing implies that GitHub is behind ScrollPlus or endorses it.

## Visual system

- Background #10110F
- Surface #1A1B17, raised surface #24251F
- Text #F4F1EA
- Muted text #A8A396
- Accent #FF4D2E, used for the mark, "Plus" in the wordmark, the on state, the active preset, and the skip chip

Cards have 14px corners. Controls are at least 32px tall in the popup and 34px in options. Every control has a visible keyboard focus ring and an accessible name. Icons are one set, drawn on a 16px grid with a 1.5px stroke. The GitHub mark is GitHub's own filled mark on the same grid and is never recoloured. No purple gradients, glassmorphism, or runtime web fonts. UI text uses ui-sans-serif.

Motion is ease-out, about 180ms. The preset highlight slides between choices. The skip chip fades in over 120ms and out over 200ms. No bounce. Reduced motion shortens every transition.

The app mark is a rounded square in the accent color with a door-like frame and a dot. It is recognizable at 16px. Generate 16, 32, 48, and 128 sizes from that mark with scripts/render-icons.mjs.

Store screenshots are original compositions made from the real popup, options page, and skip chip. Do not copy the YouTube, TikTok, or Instagram logos or interfaces, and do not imply affiliation.

## Language

English and Korean. The interface follows the browser language. Numbers follow it too. If a key is missing in a language, fall back to the bundled English text.

## Data and permissions

All judging is local. Do not add a backend.

Permissions:

- storage
- host access limited to https://www.youtube.com/*, https://www.tiktok.com/*, and https://www.instagram.com/*

No all-urls permission, and no tabs, cookies, webRequest, history, or identity permission.

Persist only settings and a daily skip count in chrome.storage.local. Reset the count at local midnight. Keep Undo video ids only in chrome.storage.session RAM, without exposing that storage area to content scripts. Do not persist watch history or video ids to disk.

The background worker serializes counter writes across tabs. An open options page refreshes its counter at local midnight.

Read metrics the page has already loaded. Do not call private APIs yourself.

- YouTube: read player and reel data YouTube already placed on the page, including ytInitialPlayerResponse and reel renderers updated on navigation. Ignore ad requests. An ad Short is recognised as described in Ads. YouTube shows views and likes; comment counts are not in this data.
- TikTok: read __UNIVERSAL_DATA_FOR_REHYDRATION__, SIGI_STATE when present, and feed JSON the page itself requested. Use playCount, diggCount, and commentCount. The active video is the id in the URL on a video page, and on For You it is the id in the player wrapper's element id (xgwrapper-N-ID), with the creator from the author link in the same feed item.
- Instagram: read reel counts in responses Instagram already requested for the page. Use like, comment, and play or view counts. If counts are hidden or the user is signed out, keep every reel.

A fetch observer must call the original fetch and return the original response untouched. Errors in the extension must not break the host page.

PRIVACY.md states that the extension does not collect, transmit, or sell user data, lists the storage keys, and gives the GitHub repo as the contact. The same statement belongs in the options page and store/listing.md.

README and the store listing say the extension is not affiliated with YouTube, TikTok, Instagram, or GitHub.

## Implementation

- WXT, TypeScript, React for the popup and options, and hand-written CSS
- No UI component library
- Vitest for the rule and the number helpers
- Playwright against local fixture pages for the skip engine, and against the built extension for the popup and options
- Content scripts are static. A MAIN-world script may read page data and pass metrics to the isolated world.
- Platform adapters live separately for YouTube, TikTok, and Instagram
- The rule is a pure function with no DOM access
- Discover current selectors during implementation. A selector miss means keep. Never skip because parsing failed.
- Chrome 120 or newer

Repository files:

- README.md with what it does, unpacked install, development, privacy, the affiliation disclaimer, and a link to the repo
- LICENSE, MIT
- PRIVACY.md
- CONTRIBUTING.md
- SECURITY.md
- .github/ISSUE_TEMPLATE/
- .github/workflows/ci.yml running typecheck, test, and zip build
- .gitignore
- store/listing.md in English and Korean
- qa/live-smoke.md
- qa/calibration.md

Store title: ScrollPlus – Skip low-like short videos. It names the role and no service.

Store assets, rendered by scripts/render-store.mjs:

- icons at 16, 32, 48, and 128
- one 440 by 280 tile and three 1280 by 800 screenshots, in English and in Korean (store/screenshots/ko and store/tile-ko.png)
- English and Korean listing copy, including the single-purpose sentence used for review

Single purpose: skip YouTube Shorts, TikTok videos, and Instagram Reels the user does not want to see: those with too few likes and, if the user turns it on, ads. It uses counts and ad markers already on the page.

## Acceptance

The work is done only when all of these are true:

1. npm test passes. Tests cover the rule: minimums, equal-to-minimum, missing counts, any-condition-fails, allowlist, ads, carousels, grids, presets, Custom detection, and old settings. They also cover the number helpers.
2. Playwright fixture tests prove a skip with its reason chip, the 6-skip pause, undo, and fail-open when metrics are missing.
3. Playwright tests on the built extension prove the defaults on a fresh profile, preset changes, site and power switches, typed numbers, Custom detection, and Reset.
4. The production build is green, the unpacked extension loads, and a zip exists.
5. qa/live-smoke.md records a dated YouTube Shorts run with the shipped defaults. Signed-in claims must cite actual live evidence, browser/version and tested paths; fixtures do not establish signed-in compatibility. qa/signed-in-smoke.md records the current scoped Reels and For You checks.
6. The popup fits without scrolling at 1x and 2x, in English and Korean.
7. Fixture pages show no console errors caused by the extension.
8. Store copy and images exist, and no image implies affiliation.
9. The public GitHub repo exists and contains this spec, the source, the license, and the privacy policy, and CI is green.
10. Nothing in the non-goals list was shipped.
