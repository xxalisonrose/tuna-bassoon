# Passport and Avatar System

## Passport

The user-facing Collection tab is presented as Passport. The existing `/collection` route remains in place for compatibility, but its screen serves as the visitor's broader exploration record.

Passport begins with an explorer card showing the signed-in user's saved avatar and a Customize Avatar action. It summarizes visited places, earned badges, and total earned badge levels before preserving the existing badge filters, progress cards, and visited-place history.

The same saved look appears as the player's marker on the native map. The marker immediately falls back to the Traditional Explorer while profile data is unavailable, so customization never blocks the map.

The visible navigation label is Passport on native and web. Existing links and bookmarks to `/collection` continue working.

## Layered avatar selection

Avatar customization is stored per signed-in Clerk user in the `userProfiles` table. The first working wardrobe stores stable IDs for:

- top
- bottom
- shoes
- neck accessory
- face accessory

Every saved selection renders by stacking full-canvas transparent assets over the neutral cow reference. The neutral reference currently contains the Trail Tank and Trail Shorts. Explorer clothing is supplied as separate overlay layers. This is a prototype constraint; final art should eventually move every base garment into a dedicated layer.

Existing profiles remain compatible. A saved `explorer` preset becomes the complete Explorer item selection, while `trail_basics` becomes the Trail Basics selection. Older clients may still submit `avatarPresetId`; the mutation translates that preset into item-level fields. New clients submit a full `selection` object.

The schema retains `avatarPresetId` as a derived convenience value. It is `explorer` or `trail_basics` when all equipped items match a preset, and `custom` for mixed looks.

## Customization screen

`/collection/avatar` is a screen in the Passport tab's nested stack. It provides:

- a live layered preview
- Outfits, Tops, Bottoms, Shoes, Neck, and Face categories
- accessible single-selection item cards
- quick application of Traditional Explorer or Trail Basics
- a visible unsaved-state label and Undo Changes action
- persistent saving to Convex
- error handling and a return action

Coat patterns, hats, backpacks, and handheld items remain planned categories. Their stable IDs and aligned artwork can be added without changing the existing saved slot names.

## Placeholder artwork

The five Explorer item overlays are registered AI-assisted placeholders. They use the same 1254 × 1254 transparent prototype canvas as the current neutral reference. Production replacements should use the canonical art template, preserve the stable item IDs, and be tested together at Passport and map-preview sizes.

## Future expansion

- Move the baked-in Trail Tank and Trail Shorts out of the neutral body reference and into independent layers.
- Add coat patterns, hats, backpacks, and handheld categories.
- Add unlock requirements without hiding or deleting a user's currently equipped item.
- Add additional Passport sections for saved stories, favorites, themed trails, and personal notes.
- Test avatar presentation and selection on physical iOS and Android devices.
