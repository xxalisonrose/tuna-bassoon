# Map Experience

## Current direction

The map uses a warm, storybook-inspired presentation while preserving the location pins, location details, accessible location list, and check-in workflow. It opens at a 55-degree angle so parks, water, pedestrian areas, and the available OpenStreetMap building heights read as a small navigable world instead of a flat utility map.

The player marker renders the signed-in user's saved layered cow avatar at the active real or simulated GPS position. The avatar is intentionally larger than the location markers and stands on a layered, foreshortened explorer disk with a ground shadow, visible side wall, and concentric save-spot rings. The hooves overlap the center of the disk so it reads as a platform on the map floor instead of a bar beneath the character. The marker rests near the lower third of the screen when the camera follows or recenters on it, leaving more of the world visible ahead. While an avatar profile is loading or has never been saved, the Traditional Explorer selection provides a stable fallback so the map never loses its player focal point.

The initial Look Around view now opens at zoom 17.7 so nearby streets, pins, and
the player feel immediately relevant on a phone. Ordinary location updates keep
the tester's chosen zoom, while an intentional recenter returns to this closer
framing.

## Want to Visit

Every signed-in explorer can save a location to a personal **Want to Visit**
list from either the location details card or its row in the Locations list.
The heart control is independent from check-in status: visiting a place does not
remove it, and only the explorer can add or remove it. A count on the list filter
shows how many places are saved, and choosing that filter hides unsaved places
without hiding their map markers. Wishlist state is stored with the account and
is shared by native and web builds. The Locations panel includes a text search
across names, categories, descriptions, and badge tags so an explorer can find
and save a destination even when it is nowhere near their current position.
Published locations can also store a city and state. When that structured
geography is available, it is included in text search and the Locations panel
adds State and City filters on native and web. Older records without geography
remain visible under the All filters until an administrator fills in those
fields; the feature never hides legacy content by default.

## Web testing companion

The web build now includes a functional companion map for faster browser testing. It reads the same live Convex locations, visits, avatar profile, and badge-test tools as the native experience. Testers can pan, rotate, pitch, and zoom the map; open the searchable Locations list; select red or green location markers; read location details; and complete eligible check-ins without opening an iOS or Android simulator.

Browser location is used when permission is available. Browsers normally allow precise location only from a secure page or from localhost, so a hosted test build must use HTTPS. Administrators can use the same Harvard Yard Test GPS controls when real browser location is unavailable or when a repeatable test position is preferable.

The web controls intentionally follow familiar desktop map behavior rather than duplicating every touch-specific native gesture. Native iOS and Android retain the circular Look Around interaction, compass behavior, zoom slider, and mobile control layout described below.

## Interaction modes

The eye control leads a vertical stack of map controls and switches between two map behaviors:

- **Look Around** keeps the player anchored near the lower third of the screen. A one-finger swipe in any direction rotates the view around the player, while pinch zoom remains available. Dragging right or down turns the view left; dragging left or up turns it right. The angled pitch stays fixed.
- **Explore** leaves the player at their live GPS position and returns one-finger swipes to normal map panning. The eye's pupil moves from side to side to show that the map is in browsing mode.
- Pressing the eye again returns to Look Around, recenters on the player when location is available, restores the angled camera, and faces north.

The eye carries a red north arrow around its edge. The arrow is updated directly by the circular rotation gesture so it continues to point toward map north at every viewing angle. While a Look Around gesture is actively turning the view, a traditional cardinal-direction compass and two-color needle briefly replace the eye in the same position. It fades away after the gesture ends, revealing the eye again. The map does not automatically reorient when the compass fades.

The magnifying-glass, location-list, and recenter controls sit directly below the eye in that order. The three primary controls share the same warm paper and green palette. The magnifying-glass control provides a player-centered zoom. Tapping it opens a frame-synchronized vertical zoom slider. Holding it and dragging upward or downward zooms directly without opening the slider. Double-tap and double-tap-hold map zoom are disabled so there is no one-way shortcut that unexpectedly changes the view. The location-list button uses a list icon visually and the screen-reader name **Locations list**.

The existing recenter button remains separate. In Explore mode it flies back to the player's current position without leaving Explore mode. This lets someone find themselves and then continue browsing freely.

Look Around behaves like a circular click wheel centered on the player. Moving clockwise around the player keeps turning the view left, and moving counterclockwise keeps turning it right. Rotation continues across every position on the wheel, including the wrap past 9 o'clock, and only reverses when the finger's circular direction reverses. Camera updates are synchronized with rendered frames to keep longer turns smooth.

## Location updates and fallbacks

After foreground location permission is granted, the map reads the current position and then subscribes to balanced-accuracy updates. The player marker moves as new positions arrive. The camera follows those updates only in Look Around mode; it does not pull the map away from an area someone is examining in Explore mode.

Harvard Yard remains the starting fallback when the current position is unavailable. Location-permission and service messages remain visible, and the accessible location list does not depend on gesture mode.

Google Play beta builds add a private testing fallback. After waiting briefly
for live location, the beta creates five clearly labeled tutorial stops around
the tester's position; if no position is available, it uses Harvard Yard. Those
stops and their Beta Pathfinder badge belong only to that account, survive
reinstalling or reopening the build, and never appear in the public catalog,
content-review tools, or another tester's map. Production builds do not create
or request this starter content.

## Admin test GPS

Signed-in administrators have a red circular **TEST** control beneath the standard map controls. Turning it on places the test player in the center of Harvard Yard without changing the device's real GPS reading. The four arrow buttons walk the test player 10 meters at a time in the direction shown on the screen, accounting for the map's current rotation. The center coordinate button accepts decimal latitude and longitude for testing another area.

While Test GPS is active, location details, distance checks, and check-ins use the simulated position. The location card shows an **Admin Test GPS** notice because a successful test check-in is saved to the administrator's account and can award progress. Turning Test GPS off returns the map and check-ins to the device location when one is available.

The expanded Test GPS panel temporarily hides the native bottom navigation and takes its place as a wide bottom dock. The movement pad stays centered, **Off** sits on the left, and the test-badge and reset actions sit on the right. This keeps the map and player visible above the controls while preventing accidental tab changes. Turning Test GPS off restores the bottom navigation immediately.

The expanded Test GPS panel also offers **Reset Test Progress**. After destructive confirmation, it deletes the signed-in administrator's check-ins, calculated badge progress, earned badge awards, and saved tutorial mission progress. Badge celebrations can then be retested from Level 1, and the tutorial introduction appears again after the app is reopened. The reset never targets another account.

The dock uses at least 48-point movement controls and expanded touch targets for its actions. On Android, its interactive content also clears the full native tab-bar touch region so the complete Down and Reset buttons respond even while the tab bar is visually hidden. Android maps use MapLibre's texture-backed view because Lorcal layers location details, the location list, and testing controls over the map; this prevents the native map surface from flashing when those overlays open or close.

**Award Test Badge** awards the next level of an active repeatable badge directly to the signed-in administrator. After a reset, the first tap queues the Level 1 full-screen celebration and the second tap queues the Level 2 banner. It does not create a location visit. Moving the simulated player preserves the current zoom instead of returning to the standard zoom level.

Checked-in locations remain on the map. Their pin changes to the visited treatment rather than disappearing, so completed places can still be opened and revisited. Location pins now render from a persistent GeoJSON source and style layers. Checking in updates a feature's visited property instead of destroying and recreating a native marker, eliminating the annotation cleanup race.

Prototype category artwork is shared by the native and web maps. Historic Sites use closed and open books, Monuments & Public Art use covered and revealed cow statues, Mystery & Lore uses red and green question emblems, and Noteworthy People uses red and green silhouette medallions. Noteworthy People locations with a women's-history tag automatically use the woman medallion pair. Other Discoveries remains the red and green gem fallback, so missing or unknown categories always retain a usable marker.

Native artwork layers are explicitly placed above the red and green fallback
circles. This preserves the visited green gem and other completed-state artwork
on iOS instead of exposing the plain fallback dot after a check-in.

The built-in MapLibre information ornament is hidden from the control area. Required map-data credit remains visible as unobtrusive plain text on the map and is repeated at the end of the Locations list without opening MapLibre options.

The recenter control uses a direct eased camera move. In both Look Around and Explore modes, it places the active real or simulated player near the lower third of the map so the forward view remains visible above the avatar.

## Future visual passes

The next map passes can add repeating grass and pavement patterns, richer building surfaces, seasonal color variants, and updated location markers. Those treatments should be tested on physical iOS and Android devices for legibility and frame rate before becoming the default.

Future animation can build on the saved player marker while keeping the same live-location, Look Around, Explore, and recenter behavior.

AI-generated and other temporary visual assets are tracked in `docs/artwork-provenance.md` so they can be deliberately replaced with final artwork rather than becoming permanent by accident.
