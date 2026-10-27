# Beta Testing

## Google Play build profile

The private testing build uses the EAS profile named `beta`. It extends the
production build settings and records `beta` in the embedded Build Information,
which lets the app enable testing support without exposing it in a normal
production build.

Create the next Android App Bundle with:

```sh
eas build --platform android --profile beta
```

Build and publish it directly to the existing Google Play internal testing
track with:

```sh
eas build --platform android --profile beta --auto-submit-with-profile beta
```

The `beta` submission profile completes the release on the internal testing
track after the App Bundle passes Google Play processing. Use the production
submission profile only for a deliberate production release.

Automated submission also requires a Google Play service-account key configured
for the app in EAS. Until that key is available, let the beta build finish,
download its `.aab` artifact from Expo, and upload it through the Internal
testing release form in Google Play Console.

The beta profile uses the production EAS environment, so its Clerk and Convex
variables must remain configured there. For local iOS and Android testing, run
`npm run start:beta` and then press `i` or `a`. A normal `npm start` session is
intentionally treated as local development and does not create beta starter
pins, even when the same beta-tester account signs in.

## Sideloadable Android build

The `beta-apk` profile produces a signed APK for a tester who installs apps
directly instead of through Google Play:

```sh
eas build --platform android --profile beta-apk
```

It inherits the production EAS environment and all private beta behavior, uses
the current `com.Lorcalapp` application ID, and does not advance the shared
Google Play version code. Share only a current `beta-apk` artifact; the older
development APKs use the retired application ID and do not contain the current
beta work.

## Private starter content

After a signed-in beta build receives a usable position, it creates five small
private tutorial stops around that point. If device location is unavailable for
eight seconds, Harvard Yard is used as a testing fallback and the map explains
that private beta tutorial mode is active.

The stops are Beta Base Camp and four directional Beta Trail stops. Checking in
at all five earns the private **Beta Pathfinder** badge, which is enough to
exercise the tutorial's check-in and badge requirements. Avatar customization
remains the tester's third tutorial action.

Starter creation is safe to repeat. The same account reuses the existing five
stops after reopening or reinstalling the app, while a different tester receives
their own set. Private starter locations are excluded from the admin Locations
editor, document imports, community review, and non-beta map queries. A normal
production build neither creates nor displays them.

## Release smoke test

Before uploading the replacement App Bundle:

1. Confirm Build Information reports the `beta` profile.
2. Sign in with a fresh invited tester account.
3. Deny or disable location once and confirm the five starter pins appear near
   the Harvard fallback after the short wait.
4. Re-enable location and confirm live positioning remains the preferred source.
5. Save and remove a location from **Want to Visit** in both the details card
   and Locations list.
6. Use the **Want to Visit** filter, reopen the app, and confirm the saved
   locations still appear there.
7. Check in at all five starter stops and confirm Beta Pathfinder and the
   tutorial badge step complete.
8. Save an avatar customization and confirm the tutorial completes.
9. Reopen the app and confirm no duplicate starter pins were created.
10. [x] Repeat the core map overlay checks on a physical Android device before
    promoting the build in Google Play Console.
