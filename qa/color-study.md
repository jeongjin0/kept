# Color study · 0.6.0

The accent before 0.6.0 was #FF4D2E. Measured in OKLCH it sits at lightness 0.65 and chroma 0.23, about twice the chroma of any color around it, so the on state, the active preset and the skip chip shouted on the dark surface. Earlier candidates (0.5.x review pages) were mixed by eye and differed in strength, so they could not be compared fairly.

## Method

Nine hues were compared at one lightness and one chroma, so no candidate is stronger than another to the eye: lightness 0.76, chroma 0.10, hue 28 (coral), 58 (copper), 88 (sand), 125 (moss), 158 (green), 190 (teal), 232 (sky), 272 (indigo) and 322 (orchid). The page also let the chroma move between 0.075, 0.10 and 0.135 and the lightness between 0.70, 0.76 and 0.82. The surfaces, the text and the border are the same hue at a chroma of 0.008 to 0.022, so the dark theme leans toward the accent without coloring it.

## Choice

Teal, hue 190, lightness 0.76, chroma 0.10, is the default of 0.6.0.

| Role | Value | OKLCH |
| --- | --- | --- |
| Background | #0D1414 | 0.185, 0.012 |
| Surface | #131E1D | 0.225, 0.016 |
| Raised surface | #1C2B2A | 0.275, 0.020 |
| Text | #EEF5F4 | 0.965, 0.008 |
| Muted text | #99ACAB | 0.73, 0.022 |
| Accent | #59C5BF | 0.76, 0.10 |
| Accent hover | #6AD6CF | 0.81, 0.10 |
| Ink on the accent | #031A19 | 0.20, 0.03 |

Why teal: it is the quietest of the hues that still reads as a switch that is on, it keeps the skip chip visible on a dark and on a bright video, and it is not the color of YouTube (red) or Instagram (an orange to purple gradient). It is close to the cyan in TikTok's logo, which is a mild overlap. Sky and indigo are also calm; sky is the most common color for a tool, and indigo is dimmer on dark videos.

The accent lives in a handful of CSS variables in src/ui/app.css and in one block of the chip's stylesheet, so changing the hue is one edit in each place.

## Not established

Contrast of the chip over a very bright video was looked at on one YouTube Short and one TikTok video, not on every video. The accent was judged on a monitor in a lit room, not on other displays.
