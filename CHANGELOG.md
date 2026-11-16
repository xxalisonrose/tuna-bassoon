# Lorcal changelog

## Beta 5 — November 16, 2026

- Request navigation-grade foreground location updates about every meter and second, then ease the map between updates so walking feels more accurate and less jerky.
- Let explorers preview a complete outfit and buy only the missing pieces in one confirmed Lorcoin purchase.
- Keep the Android keyboard from covering the beta feedback field and scroll the active field into view while typing.
- Let beta testers attach up to three screenshots to Lorcal feedback and show those images with the report in the admin panel.
- Keep older beta binaries from crashing when the new screenshot picker is unavailable; text feedback and sign-in remain usable until the next native build is installed.
- Open Clerk's native sign-in and account-creation screens inside Lorcal instead of relying on the hosted browser page that could appear blank on Android.
- Replace the generated avatar wardrobe and tutorial Scout images with Dan's aligned hand-drawn artwork, and start every avatar in the standard white shirt, blue pants, and boots.
- Add the Pretty Pretty Princess gown, heels, crown, and wand as individual pieces and a Complete Look.
- Replace the tutorial clothing reward with the Beta Tester Shirt while preserving access for people who earned the earlier reward.
- Keep glasses and goggles visible above hats, and render handheld accessories above the complete outfit.
- Simplify the clothing-fit editor to save adjustments directly, remove ZIP and hidden-mask tools, and display correctly exported 1254-pixel art at its true size.

## Beta 4 — November 10, 2026

- Rewrote the visual tutorial with Scout artwork, clearer map controls, separate tap/hold/check-in demonstrations, an expanded Passport walkthrough, and a replay option in Settings.
- Rewrote the FAQ and reorganized Settings into clearer FAQ, Promo Codes, Replay Tour, account, privacy, accessibility, and Community Contributions sections.
- Make a quick tap select the closest pin while reserving the press-and-slide selector for a deliberate hold, including single-pin holds.
- Keep the press-and-slide selector open while the finger moves between nearby choices and open the highlighted location on release.
- Remove a place from Want to Visit after a successful check-in and replace the redundant move-closer card with a clearer distance-aware check-in button.
- Standardize check-in distances at 250 feet and make unavailable check-ins visually obvious without requiring users to scroll.
- Add Beta Pathfinder badge artwork and make the badge available in the content tools.
- Hide build information from general accounts while keeping it available to administrators.
- Improve clothing masks and layer order so pants cover legs correctly, boots sit behind pants, gowns preserve boots and visible markings, and hidden base clothes do not show through.
- Remove the unwanted rectangle behind the map avatar and switch to a compact avatar marker when zoomed far out.
- Recenter the map reliably when it opens and keep Look Around rotation smooth through unlimited full turns.

- Make live walking updates feel more responsive by shortening the map's follow animation.
- Pause live GPS tracking whenever the Map tab is not active.
- Avoid rebuilding unchanged map pins and avatar artwork on every GPS update.
- Reuse the map's location lookup instead of rebuilding it for every pin tap.
- Stop rendering flat building footprints underneath the 3D buildings at close zoom.
- Virtualize the Passport badge collection so only the visible badge cards are mounted while scrolling.
- Keep the Passport's draggable scrollbar, filters, expandable badge details, and tutorial navigation working with the virtualized list.
- Consolidate duplicate root Convex subscriptions for the signed-in user and pending badge celebrations without changing screens or modal behavior.
- Load 384-pixel avatar layers on the map while keeping the full-resolution artwork in the Passport and wardrobe.
- Wait for the measured map height before positioning the player camera so the avatar starts in the correct lower-screen position without needing a tap.
- Patch Expo Router 57's Android initial-link race after dependency installs so development launches no longer attempt a React state update before the router mounts.
- Keep Look Around rotation on a continuous bearing so a full-circle finger drag stays fluid across the ±180-degree boundary.
- Teach pin interactions in separate tutorial steps: tap a pin, hold and slide through a cluster, and check in when nearby.
- Show animated examples for tapping a pin, choosing from a cluster, and earning a stamp and Lorcoins from a check-in.
- Let a deliberate long press open the location flag even when only one pin is nearby.
- Replace placeholder Beta Trail names with private nearby landmark examples, including the Eiffel Tower, Louvre Museum, Stonehenge, Shakespeare’s Globe, and Great Barrier Reef.
- Give the beta landmarks real descriptions, fun facts, categories, and varied map-pin artwork while keeping them near each tester for check-in testing.

## Beta 3 — November 4, 2026

- Added the visual app tutorial and its Passport and Settings continuation.
- Added press-and-slide selection for overlapping map pins.
- Made a quick tap choose the nearest location instead of opening the cluster selector.
- Added promo-code redemption for Lorcoins.
- Improved avatar clothing fit and layer order.
- Improved Passport readability and corrected outdated login branding.
