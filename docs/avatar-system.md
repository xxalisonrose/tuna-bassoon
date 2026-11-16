# Passport and Avatar System

## Passport

The user-facing Collection tab is presented as Passport. Its explorer card shows the signed-in user's saved avatar and a Customize Avatar action. The same saved look appears as the player's marker on the native map.

## Current avatar catalog

The production catalog contains only Dan's hand-drawn 1254 × 1254 artwork:

- eleven tops
- six pants and skirts
- Scout's boots and pink heels
- goggles and glasses
- six beanies, three cowboy hats, and a princess crown
- a heart wand

The previous Explorer, Winter, Cowboy, and Princess prototype catalogs and their generated-art defaults have been removed. The hand-drawn Pretty Pretty Princess set is now available as both individual pieces and a Complete Look.

Every account starts the current catalog with the same standard selection: White Tee, Blue Pants, Scout's Boots, and no hat or face accessory. Profiles from an earlier catalog are reset to this standard the next time the account syncs. The avatarCatalogVersion field prevents that reset from repeating after the player saves a new look.

The Beta Tester Tee is visible but locked until the Welcome to Lorcal tutorial is complete. People who earned the earlier shirt reward retain access to the new reward. All other purchase rules continue to use Lorcoins.

## Layering

Every item keeps the complete square canvas and stacks over the neutral Scout body. Runtime order is:

1. body
2. shoes
3. pants
4. top
5. hat
6. glasses or goggles
7. handheld accessory

Face accessories intentionally render after hats so goggles remain visible. Handheld accessories render last so the wand remains visible.

## Customization screen

The avatar customization screen provides:

- a live layered preview
- Complete Looks, Tops, Pants, Shoes, Glasses & Goggles, Hats & Crowns, and Accessories
- accessible single-selection item cards
- Lorcoin purchase confirmation for paid pieces
- a visible unsaved-state label and Undo Changes action
- persistent saving to Convex
- error handling and a return action

## Clothing fit editor

The administrator Avatar workspace starts every item at the same 100% full-canvas fit. Correctly exported 1254 × 1254 files therefore appear at exactly the same size in the editor and app.

An incorrectly exported item can be moved, resized, or rotated. **Save Fit** writes that item's values directly to Convex, and every avatar preview uses the saved adjustment immediately. **Reset to 1254 Template** removes the exception and restores the full-canvas default.

There is no ZIP export, local fitting batch, or hidden-area mask workflow.

## Future expansion

- Add the 1254 × 1254 clothing uploader for administrators.
- Add more Complete Looks as finished themed artwork becomes available.
- Add coat patterns and backpack categories when final artwork exists.
- Test avatar presentation and selection on physical iOS and Android devices.
