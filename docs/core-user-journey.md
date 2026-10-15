# Core User Journey

Block 5 of the capstone roadmap establishes one uninterrupted visitor path:

> Sign in → view or customize explorer → open map → find location → read story → check in → earn progress or badge → view result in Passport.

## Authentication entry

- A signed-out visitor sees only the Tuna Bassoon authentication screen.
- Map, Passport, and content-management navigation are unavailable until Clerk and Convex both confirm the session.
- A short branded loading screen covers session restoration and the Clerk-to-Convex handoff.
- A new sign-in, a new account, and a restored native session open directly on the Map.
- Web links to an authenticated portal page remain usable for an already signed-in editor.
- The signed-in navigation contains Map, Passport, and Settings; the former Home tab is removed.
- Settings owns account information, location permission controls, build details, and Sign Out.
- Sign Out returns to the isolated authentication screen.

## Explorer and map

- The native map renders the user's saved layered cow avatar at the active GPS coordinate.
- Traditional Explorer is the fallback while a profile is missing or loading.
- The marker works with real GPS and administrator Test GPS.
- Look Around, Explore, recenter, zoom, and Locations list retain their existing behavior.
- Checked-in locations remain visible with their visited treatment.

## Progress and Passport

- A successful check-in updates badge progress without administrator intervention.
- Level 1 uses the full-screen celebration; later repeatable levels use the banner.
- Passport shows the saved avatar, visited places, earned badges, and badge levels.
- Retired and unavailable content remains labeled and does not become a new active goal.

## Acceptance pass

Test the complete path on the iOS simulator, then repeat the essential path on a physical Android device:

1. Sign out and confirm no tabs or protected content remain visible.
2. Sign in and confirm the Map opens after the loading handoff.
3. Confirm a previously signed-in cold launch opens the Map.
4. Customize and save at least one avatar item.
5. Return to the Map and confirm the saved look appears at real or Test GPS.
6. Rotate, explore, recenter, zoom, and open the Locations list.
7. Open a location, read its story, and check in.
8. Confirm the location pin remains visible as visited.
9. Confirm progress or a celebration appears correctly.
10. Open Passport and confirm the avatar, visit, badge, and level results.
11. Open Settings and confirm account, location, accessibility, and build information are available.
12. Sign out from Settings and confirm the login-only screen returns.

Block 5 is complete after this path passes without a manual database repair on both the primary iOS test environment and Android.
