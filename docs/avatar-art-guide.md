# Avatar Art Kit

## Purpose

This kit defines the proportions, alignment, layer order, naming, and export rules for Lorcal avatar artwork. New clothing and accessories should fit this template so placeholder art can be replaced without changing saved avatar selections or repositioning every item.

The approved character is a friendly upright cow with slightly lanky proportions, a long cow muzzle, prominent ears, short visible horns, a dark hair tuft, and black-and-cream markings. The default outfit is a traditional explorer ensemble with an olive utility vest, cream field shirt, tan cargo shorts, brown walking boots, a rust-red neckerchief, round sunglasses, and a tan backpack.

## Included references

- `assets/images/avatar/concepts/explorer-cow-concept-v1.png` is the approved visual-direction sheet.
- `assets/images/avatar/references/avatar-neutral-reference.png` is the transparent neutral fitting reference.
- `assets/images/avatar/references/avatar-explorer-reference.png` is the transparent default explorer reference.
- `assets/images/avatar/templates/avatar-proportion-guide.svg` is the editable, non-AI blank mannequin and measurement template.

The generated PNGs are visual placeholders and references. The SVG establishes the reusable geometry. Future artists should use the guide's measurements and the approved references while deliberately redrawing final art rather than treating generated pixels as finished production artwork.

## Canonical canvas

| Property | Requirement |
| --- | --- |
| Master canvas | 2048 × 2048 pixels |
| App export | 1024 × 1024 transparent PNG |
| Small preview | 256 × 256 transparent PNG |
| Color space | sRGB |
| Origin | Top-left, `(0, 0)` |
| Character centerline | `x = 1024` |
| Ground baseline | `y = 1920` |
| Full-avatar safe zone | `x = 256–1792`, `y = 96–1940` |
| Small-map readability zone | `x = 452–1596`, `y = 210–1870` |

Never crop an individual item to its visible pixels. Every exported layer must retain the complete square canvas, transparent unused space, and the same origin. This makes every item align without per-item offsets.

## Proportion and attachment guides

| Guide | Coordinate |
| --- | ---: |
| Headwear top | `y = 180` |
| Face anchor | `(1024, 400)` |
| Neck anchor | `(1024, 570)` |
| Shoulder line | `y = 650` |
| Back anchor | `(1270, 760)` |
| Waist anchor | `(1024, 1050)` |
| Hip line | `y = 1160` |
| Hand line | `y = 1260` |
| Left-hand anchor | `(676, 1260)` |
| Right-hand anchor | `(1372, 1260)` |
| Knee line | `y = 1515` |
| Ankle line | `y = 1800` |
| Ground baseline | `y = 1920` |

The blank mannequin intentionally contains no character styling. It is a proportion and placement reference that can remain beneath a drawing at low opacity. The neutral cow PNG provides the more detailed fitting reference.

## Supported slots and layer order

Render layers from back to front in this order:

1. `backpack-rear` — pack body and anything behind the cow
2. `body` — coat, hair, horns, ears, tail, and neutral base
3. `bottom` — shorts, pants, skirts, or other lower clothing
4. `shoes` — boots, shoes, or hoof accessories
5. `top` — shirts, sweaters, coats, and vests
6. `backpack-front` — shoulder straps and front-facing pack details
7. `neck` — scarves, ties, necklaces, and neckerchiefs
8. `face` — glasses and face accessories
9. `headwear` — hats and head accessories; horns should remain visible unless intentionally designed otherwise
10. `handheld` — objects attached to the left- or right-hand anchor
11. `foreground` — intentional effects or details that must sit above every other layer

A backpack should normally be supplied as a coordinated rear/front pair so the cow appears to stand inside its straps. A single item may occupy more than one file while keeping one stable item ID.

## Stable IDs and filenames

Use lowercase letters, numbers, and hyphens. IDs describe the slot and item without including version numbers or artist names.

Examples:

```text
avatar-body-black-cream
avatar-top-explorer-vest
avatar-bottom-tan-cargo-shorts
avatar-shoes-brown-walking-boots
avatar-neck-rust-neckerchief
avatar-face-round-glasses
avatar-headwear-field-cap
avatar-backpack-tan-field-pack
avatar-handheld-field-notebook
```

Future application data should save these stable IDs. Replacing placeholder artwork should keep the same ID and final path whenever possible, allowing every saved avatar to receive the improved art automatically.

Recommended final-art folders:

```text
assets/images/avatar/items/body/
assets/images/avatar/items/top/
assets/images/avatar/items/bottom/
assets/images/avatar/items/shoes/
assets/images/avatar/items/neck/
assets/images/avatar/items/face/
assets/images/avatar/items/headwear/
assets/images/avatar/items/backpack/
assets/images/avatar/items/handheld/
```

## Drawing workflow

1. Open `avatar-proportion-guide.svg` on a 2048 × 2048 artboard.
2. Keep the guide in a locked layer and reduce its opacity if needed.
3. Optionally place `avatar-neutral-reference.png` above it, scale it to the full artboard, and reduce its opacity.
4. Draw the new item on a separate named layer without moving the artboard or centerline.
5. Check overlaps at the neck, waist, wrists, horns, ears, backpack straps, and boots.
6. Hide the guides and reference art before export.
7. Export the item on the full transparent 2048 × 2048 canvas.
8. Produce the 1024 × 1024 app export and 256 × 256 preview from that master.
9. Test the item over the neutral cow and at small map size.
10. Add or update its provenance entry before committing it.

## Readability rules

- Preserve a clear silhouette at 48–64 display pixels.
- Avoid essential details thinner than eight pixels in the 1024 export.
- Keep strong contrast between clothing and adjacent coat markings.
- Do not rely on color alone to distinguish selected, locked, or unavailable items in the interface.
- Check light and dark backgrounds before accepting final art.
- Keep the cow's eyes and muzzle readable unless an accessory intentionally covers them.
- Test headwear against both horns and ears.
- Keep handheld items close enough to the body that they do not disappear outside the map-safe zone.

## Placeholder replacement

The approved concept and reference PNGs were generated from Dan's original hand-drawn concept and are registered as AI-assisted placeholders. They may be used for prototyping, fitting, and visual comparison. When a human-created or commissioned replacement is ready:

1. Preserve the canvas, anchor positions, stable ID, and layer slot.
2. Replace the relevant runtime file without changing saved avatar data.
3. Test the Avatar page, home preview, and map presentation.
4. Record the artist, creation date, permission or license, and replacement path in `docs/artwork-provenance.md`.
5. Move the superseded entry out of the active-placeholder section only after the replacement is live and verified.


## Current prototype wardrobe layers

The item-level prototype uses the neutral reference as its base and stacks full-canvas transparent overlays. The Explorer set includes:

- `items/top/avatar-top-explorer-field.png`
- `items/bottom/avatar-bottom-explorer-cargo.png`
- `items/shoes/avatar-shoes-explorer-boots.png`
- `items/neck/avatar-neck-rust-neckerchief.png`
- `items/face/avatar-face-explorer-goggles.png`

The Cozy Winter set adds:

- `items/top/avatar-top-winter-polka-sweater.png`
- `items/bottom/avatar-bottom-winter-charcoal-pants.png`
- `items/shoes/avatar-shoes-winter-snow-boots.png`
- `items/neck/avatar-neck-winter-cream-scarf.png`
- `items/headwear/avatar-headwear-winter-knit-beanie.png`

The Cowboy sets add:

- `items/top/avatar-top-cowboy-sheriff-shirt.png`
- `items/bottom/avatar-bottom-cowboy-western-pants.png`
- `items/bottom/avatar-bottom-cowboy-western-shorts.png`
- `items/shoes/avatar-shoes-cowboy-brown-boots.png`
- `items/shoes/avatar-shoes-cowboy-red-boots.png`
- `items/neck/avatar-neck-cowboy-red-bandana.png`
- `items/headwear/avatar-headwear-cowboy-sheriff-hat.png`

The Pink Princess set adds:

- `items/top/avatar-top-princess-puff-bodice.png`
- `items/bottom/avatar-bottom-princess-ballgown-skirt.png`
- `items/headwear/avatar-headwear-princess-crown.png`
- `items/handheld/avatar-handheld-princess-star-wand.png`

The Trail Tank and Trail Shorts remain baked into the neutral reference during this prototype. Final production artwork should split those garments from the body layer while preserving the current stable item IDs.

## Admin fitting workflow

The Content Portal includes an administrator-only **Avatar** workspace for
calibrating prototype layers against the neutral cow. The fitting lab uses the
same placement registry as every player-facing avatar preview, so its values
describe the actual runtime result instead of a separate mockup.

1. Open **Content Portal → Avatar** and choose a slot and item.
2. Leave the grid visible for the first pass. Drag anywhere on the large
   preview to position the selected layer.
3. Use the Horizontal, Vertical, Width, Height, and Rotation controls for
   one-percent and one-degree adjustments.
4. Inspect the 92-pixel map-size preview before accepting a fit. Fine details
   that disappear there should be strengthened in the artwork rather than
   solved with more scaling.
5. Share the fitting screenshot or selectable fit-values line for review.
   The lab intentionally does not alter saved avatars or publish temporary
   values by itself.
6. Commit approved values in `src/lib/avatar-fit.ts`, then recheck the custom
   wardrobe preview, complete looks, Passport preview, and map marker.

The fitting registry is a prototype bridge for the AI-assisted source sheets.
Final production layers should still use the complete canonical canvas and
anchors above. A layer that cannot align without distorting the cow, exposing
the base clothing, or covering the wrong body parts needs a redraw or a proper
foreground/background split; placement controls cannot repair incompatible
art geometry.
