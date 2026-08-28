# Winter Ride Window — visual thesis

## Direction: a commuter's botanical field guide

Winter riding is a practice of noticing small, local signals: a silvered leaf,
dark pavement, a crosswind in an open cutting. The interface borrows the calm,
annotated precision of a field guide rather than the authority of a warning
dashboard. Forecast facts sit beside the rider's own limits like observations
in a specimen notebook. This makes uncertainty visible and keeps judgment with
the rider.

The product is intentionally a single light treatment: warm, fibrous paper is
part of the field-guide metaphor, while deep ink surfaces create focused result
areas. It paints every background explicitly. Dark mode is not added because a
near-black reinterpretation would undermine the paper/specimen identity; night
conditions are represented within the same legible guide.

## Palette

- `paper #F3EEDC` — warm field-note stock; page background.
- `paper-light #FBF8ED` — lifted writing and form surfaces.
- `ink #17372E` — spruce writing ink; primary text and result surface.
- `ink-soft #456057` — secondary text (checked at 4.5:1 on paper).
- `lichen #BFD09B` — botanical highlight and selected controls.
- `ice #BFDCE0` — forecast/daylight observations.
- `berry #B94E36` — exceedance and focus accents, always paired with text/icons.
- `ochre #A26722` — caution/unknown; never used as the only state signal.
- `white #FFFDF6` — text on ink and compact highlights.

All state badges pair color with a label and simple authored symbol. Core text
meets 4.5:1 contrast; large decorative rules are not information-bearing.

## Type

- Display and section titles: Georgia, Cambria, `Times New Roman`, serif. The
  shaped, bookish forms carry the naturalist-guide voice without a font fetch.
- Interface and body: system sans (`Inter` where installed, then ui-sans-serif,
  Segoe UI, sans-serif) for fast scanning in cold, bright conditions.
- Forecast values use tabular numerals. The scale is 14, 16, 18, 24, 36, and
  clamp(44–72) px. Body is never below 16 px.

No runtime or bundled font files are needed, keeping the product private and
fast while preserving a deliberate serif/sans pairing.

## Spacing and composition

The base unit is 4 px; the working rhythm is 8, 12, 16, 24, 32, 48, 64, and
96 px. Content width is 1180 px. The opening is an asymmetrical specimen plate:
copy on the left, illustrated route habitat on the right. Form sections are
numbered like field observations and grouped by proximity instead of a sea of
cards. Results use a dark pinned field-note surface and an edge-to-edge hourly
strip. At 390 px, ornament recedes, controls stack, and hourly slots become a
horizontal, labeled scroll region.

## Interaction grammar

- Underlined text links and outlined, 44 px controls feel annotated and tactile.
- Primary actions fill with spruce ink; active choices receive a lichen wash
  and a small ink dot.
- Results arrive from the submitted notebook section and focus moves to the
  result heading. Every hourly condition expands as a native `details` element,
  making mouse and keyboard behavior predictable.
- Loading, offline, error, and first-use states each explain the next action.

## Motion policy

One 220 ms opacity/translate reveal is used when results replace the empty
state. Controls change color in 160 ms. No animation loops, weather particles,
or parallax. With `prefers-reduced-motion: reduce`, all transitions and smooth
scrolling are removed and state changes are instant.

## Asset plan and provenance

The hero is an original AI-generated horizontal botanical plate: a riderless
winter commuter bicycle beside a winding path, with frost-tipped yarrow,
rowan, pine, wind and daylight annotations rendered as specimen-like visual
marks. It communicates route exposure—not guaranteed conditions—and contains no
real people, brand, text, logo, or map.

Prompt sheet: “Editorial botanical field-guide plate, riderless practical
commuter bicycle resting beside a winding winter cycle path, foreground
frosted yarrow seed heads and rowan twigs, open field transitioning to sheltered
spruce edge, subtle low winter sun and wind cues, hand-painted gouache and
colored-pencil texture on warm ivory paper, restrained spruce green, lichen,
ice blue and muted berry palette, calm precise natural-history composition,
ample quiet margins, no people, no text, no letters, no numbers, no logos, no
watermark, no recognizable brands, no photorealism, no UI, no frame.”

Generation: factory Azure OpenAI image deployment via
`/opt/fleet/lib/gen-image.sh`, 2026-08-28. The selected asset is original to this
product. Source PNG and prompt sidecar live in `assets/src/`; optimized WebP and
AVIF derivatives ship from `public/assets/`. UI symbols and the route-exposure
diagram are hand-authored CSS/SVG-style primitives and carry the repository's
MIT license.
