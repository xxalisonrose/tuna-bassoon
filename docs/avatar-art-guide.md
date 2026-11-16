# Avatar Art Kit

## Purpose

This kit defines the proportions, alignment, layer order, naming, and export rules for Lorcal avatar artwork. New clothing and accessories should fit this template so placeholder art can be replaced without changing saved avatar selections or repositioning every item.

The production character is Dan's hand-drawn Scout: a friendly upright cow with slightly lanky proportions, a long cow muzzle, prominent ears, short visible horns, a dark hair tuft, and black-and-white markings. Clothing, glasses, accessories, and hats are exported from the same Photoshop canvas.

## Included references

- `assets/images/avatar/references/avatar-neutral-base-no-clothes.png` is the production neutral Scout body.
- `assets/images/avatar/items/` contains the production full-canvas clothing and accessory layers.
- `assets/images/avatar/map/` contains 384 × 384 downsampled copies for the map marker.
- The owner's `New Avatar Assets/Photoshop Files` folder contains the editable 1254 × 1254 source templates.

The 1254 × 1254 production PNGs define the reusable geometry. New artwork should use the supplied Photoshop templates and retain the complete canvas.

## Canonical canvas

| Property | Requirement |
| --- | --- |
| Master canvas | 1254 × 1254 pixels |
| App export | 1254 × 1254 transparent PNG |
| Map preview | 384 × 384 transparent PNG, generated from the app export |
| Color space | sRGB |
| Origin | Top-left, `(0, 0)` |
| Character centerline | `x = 627` |

Never crop an individual item to its visible pixels. Every exported layer must retain the complete square canvas, transparent unused space, and the same origin. This makes every item align without per-item offsets.

## Proportion and attachment guides

| Guide | Coordinate |
| --- | ---: |
| Headwear top | `y = 110` |
| Face anchor | `(627, 245)` |
| Neck anchor | `(627, 349)` |
| Shoulder line | `y = 398` |
| Back anchor | `(778, 465)` |
| Waist anchor | `(627, 643)` |
| Hip line | `y = 710` |
| Hand line | `y = 772` |
| Left-hand anchor | `(414, 772)` |
| Right-hand anchor | `(840, 772)` |
| Knee line | `y = 928` |
| Ankle line | `y = 1102` |
| Ground baseline | `y = 1175` |

The blank mannequin intentionally contains no character styling. It is a proportion and placement reference that can remain beneath a drawing at low opacity. The neutral cow PNG provides the more detailed fitting reference.

## Supported slots and layer order

Render layers from back to front in this order:

1. `backpack-rear` — pack body and anything behind the cow
2. `body` — coat, hair, horns, ears, tail, and neutral base
3. `shoes` — boots, shoes, or hoof accessories
4. `bottom` — shorts, pants, skirts, or other lower clothing
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

1. Open the matching PSD template on its existing 1254 × 1254 canvas.
2. Keep the Scout guide in a locked layer and reduce its opacity if needed.
3. Do not resize or reposition the canvas or guide.
4. Draw the new item on a separate named layer without moving the artboard or centerline.
5. Check overlaps at the neck, waist, wrists, horns, ears, backpack straps, and boots.
6. Hide the guides and reference art before export.
7. Export the item on the full transparent 1254 × 1254 canvas.
8. Let the app build produce the 384 × 384 map copy from that master.
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


## Current human-created wardrobe layers

The production wardrobe stacks Dan's 1254 × 1254 transparent layers over the neutral Scout body. It currently includes nine tops, five pants, one pair of boots, goggles, glasses, six beanies, and three cowboy hats. The superseded generated wardrobe IDs and fit defaults have been removed.

## Admin fitting workflow

The Content Portal includes an administrator-only **Avatar** workspace.
Correct 1254 × 1254 layers all start at left 0%, top 0%, width 100%, height
100%, and rotation 0°. The editor and player-facing renderer use those same
defaults, so correctly exported clothing appears at the same size everywhere.

1. Choose an item. The Fire Tee is the first adjustment test case.
2. Drag inside its outline to move it, drag the handles to resize it, or use
   the fine adjustment controls.
3. Check the 92-pixel map preview.
4. Press **Save Fit**. The adjustment is stored directly and becomes the
   runtime fit without an export or code change.
5. Use **Reset to 1254 Template** to delete an exception and restore the
   full-canvas default.

The mask-painting and ZIP-export workflows have been removed. Placement
controls remain an exception path for a file that was not exported correctly;
new artwork should normally need no adjustment.
