# Next Beta Work

These notes capture the product pass prepared for the next Google Play beta.
The three feature slices below are implemented, and the Android emulator and
physical-device smoke tests are complete.

## 1. Start the map closer

The map should load with a slightly closer default view so the avatar and nearby
locations feel immediately relevant on a phone. Keep the existing zoom control,
free map movement, and recenter behavior.

Acceptance checks:

1. [x] A fresh map launch is visibly closer than the previous default.
2. [x] Nearby markers, the player avatar, and surrounding streets remain readable.
3. [x] Recenter returns to the intended close view without changing a tester's zoom
   during ordinary simulated movement.
4. [x] Verify the framing on Android beta hardware.
5. [ ] Verify the framing on the iOS simulator before the next iOS release.

## 2. Location wishlist

Add a personal wishlist for places a user wants to visit. This gives map
exploration and the Locations list a planning purpose even when the user is not
close enough to check in.

Initial scope:

- [x] Add or remove a location from the wishlist from its map details and list entry.
- [x] Save wishlist membership to the signed-in user's account.
- [x] Clearly distinguish **Want to Visit** from **Visited**.
- [x] Provide a focused list or filter for saved locations.
- [x] Preserve wishlist items after check-in, unless the user chooses to remove
  them.
- [x] Include accessible labels and state announcements for the save control.

Future extension:

- Let users arrange saved locations into a route or day plan.
- Support user-submitted routes between locations after the basic wishlist has
  been tested and the moderation model is defined.

## 3. Beta starter content

Invited beta testers need enough test content to complete the tutorial even if
they are not physically near a published Lorcal location.

Implemented behavior:

- On a tester's first beta login, create a private starter set associated with
  that tester rather than publishing duplicate real locations globally.
- Provide at least five clearly labeled beta locations so the tester can finish
  the tutorial's five-check-in goal.
- Place the starter locations within practical testing distance of the tester's
  initial location, or provide a clearly identified beta testing mode when live
  positioning is unavailable.
- Include a beta badge whose rules can be completed with those locations.
- Let the tester retain the resulting beta visits, badge progress, and awards
  for the duration of beta testing.
- Keep beta content out of the public catalog, document-import queue, community
  submission queue, and production analytics.
- Make creation idempotent: reopening the app or reinstalling a build must not
  generate duplicate starter locations or badges for the same account.
- Mark all starter content as test material so it cannot be mistaken for a real
  historical place or public achievement.

Acceptance checks:

1. [x] A newly invited tester can complete the five-check-in and badge tutorial
   goals without traveling to
   Harvard.
2. [x] A returning tester sees the same starter content and progress, not a second
   copy.
3. [x] Normal users and other testers cannot see another tester's private starter
   pins.
4. [x] Production builds do not generate beta starter content.
5. [x] Administrators can reset beta progress without altering published content or
   another tester's account.

## Release order

1. [x] Implement and test the closer map framing.
2. [x] Implement the first wishlist slice and verify account persistence.
3. [x] Add beta-channel starter content and test the map and wishlist on an
   Android emulator without live GPS.
4. [x] Run final lint, type checking, and one physical Android
   smoke test.
5. [x] Commit and push the accumulated fixes, build a new Android App Bundle, and
   publish it to the existing Google Play internal testing track.
