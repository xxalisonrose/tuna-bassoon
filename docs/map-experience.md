# Map Experience

## Current direction

The map uses a warm, storybook-inspired presentation while preserving the location pins, location details, accessible location list, and check-in workflow. It opens at a 55-degree angle so parks, water, pedestrian areas, and the available OpenStreetMap building heights read as a small navigable world instead of a flat utility map.

The temporary player marker is intentionally built as a replaceable component. It gives the current GPS position a character-like focal point now without deciding the later avatar system's artwork, customization, storage, or animation model.

## Interaction modes

The eye control leads a vertical stack of map controls and switches between two map behaviors:

- **Look Around** keeps the player centered. A one-finger swipe in any direction rotates the view around the player, while pinch zoom remains available. Dragging right or down turns the view left; dragging left or up turns it right. The angled pitch stays fixed.
- **Explore** leaves the player at their live GPS position and returns one-finger swipes to normal map panning. The eye's pupil moves from side to side to show that the map is in browsing mode.
- Pressing the eye again returns to Look Around, recenters on the player when location is available, restores the angled camera, and faces north.

The eye carries a red north arrow around its edge. The arrow is updated directly by the circular rotation gesture so it continues to point toward map north at every viewing angle. While a Look Around gesture is actively turning the view, a traditional cardinal-direction compass and two-color needle briefly replace the eye in the same position. It fades away after the gesture ends, revealing the eye again. The map does not automatically reorient when the compass fades.

The magnifying-glass, location-list, and recenter controls sit directly below the eye in that order. The three primary controls share the same warm paper and green palette. The magnifying-glass control provides a player-centered zoom. Tapping it opens a frame-synchronized vertical zoom slider. Holding it and dragging upward or downward zooms directly without opening the slider. Double-tap and double-tap-hold map zoom are disabled so there is no one-way shortcut that unexpectedly changes the view. The location-list button uses a list icon visually and the screen-reader name **Locations list**.

The existing recenter button remains separate. In Explore mode it flies back to the player's current position without leaving Explore mode. This lets someone find themselves and then continue browsing freely.

Look Around behaves like a circular click wheel centered on the player. Moving clockwise around the player keeps turning the view left, and moving counterclockwise keeps turning it right. Rotation continues across every position on the wheel, including the wrap past 9 o'clock, and only reverses when the finger's circular direction reverses. Camera updates are synchronized with rendered frames to keep longer turns smooth.

## Location updates and fallbacks

After foreground location permission is granted, the map reads the current position and then subscribes to balanced-accuracy updates. The player marker moves as new positions arrive. The camera follows those updates only in Look Around mode; it does not pull the map away from an area someone is examining in Explore mode.

Harvard Yard remains the starting fallback when the current position is unavailable. Location-permission and service messages remain visible, and the accessible location list does not depend on gesture mode.

## Admin test GPS

Signed-in administrators have a red circular **TEST** control beneath the standard map controls. Turning it on places the test player in the center of Harvard Yard without changing the device's real GPS reading. The four arrow buttons walk the test player 10 meters at a time in the direction shown on the screen, accounting for the map's current rotation. The center coordinate button accepts decimal latitude and longitude for testing another area.

While Test GPS is active, location details, distance checks, and check-ins use the simulated position. The location card shows an **Admin Test GPS** notice because a successful test check-in is saved to the administrator's account and can award progress. Turning Test GPS off returns the map and check-ins to the device location when one is available.

The expanded Test GPS panel also offers **Reset Test Progress**. After destructive confirmation, it deletes the signed-in administrator's check-ins, calculated badge progress, and earned badge awards so badge celebrations can be retested from Level 1. The reset never targets another account.

**Award Test Badge** awards the next level of an active repeatable badge directly to the signed-in administrator. After a reset, the first tap queues the Level 1 full-screen celebration and the second tap queues the Level 2 banner. It does not create a location visit. Moving the simulated player preserves the current zoom instead of returning to the standard zoom level.

Checked-in locations remain on the map. Their pin changes to the visited treatment rather than disappearing, so completed places can still be opened and revisited. Location pins now render from a persistent GeoJSON source and style layers. Checking in updates a feature's visited property instead of destroying and recreating a native marker, eliminating the annotation cleanup race.

The built-in MapLibre information ornament is hidden from the control area. Required map-data credit remains visible as unobtrusive plain text on the map and is repeated at the end of the Locations list without opening MapLibre options.

The recenter control uses a direct eased camera move with zero viewport padding. In both Look Around and Explore modes, it places the active real or simulated player coordinate at the visual center of the map.

## Future visual passes

The next map passes can add repeating grass and pavement patterns, richer building surfaces, seasonal color variants, and updated location markers. Those treatments should be tested on physical iOS and Android devices for legibility and frame rate before becoming the default.

The later avatar system can replace the temporary player marker with character artwork and animation while keeping the same live-location, Look Around, Explore, and recenter behavior.
