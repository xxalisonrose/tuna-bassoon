# Settings System

## Purpose

Settings contains account, permission, accessibility, and technical information. Passport remains the user's exploration record: avatar, visits, badges, and levels.

The first release intentionally avoids switches that do not control a working feature.

## Current sections

### Account

- Shows the signed-in display name and email when available.
- Shows the public username and opens the username editor.
- Keeps account email private while allowing username changes once every seven
  days.
- Identifies administrator accounts without exposing administrative controls to ordinary users.
- Owns the Sign Out action. Passport no longer duplicates account management.

### Content Contributions

- Shows every Explorer's progress toward earned Community Contributor access.
- Opens the submission form for Administrators, Regional Moderators, and
  earned or manually approved Community Contributors.
- Opens the private **Submit a Location** form.
- Explains that every suggestion requires administrator review before it can
  appear on the map.
- Is backed by the same server-side permission check, so hiding the button is
  not the security boundary.

### Location & Privacy

- Reports the current foreground-location permission state.
- Requests foreground access when it has not been granted.
- Opens the app's device settings on iOS and Android.
- Explains how to review site permissions on the web.
- Explains that location supports the player marker and nearby check-ins.
- Clarifies that Admin Test GPS affects only the administrator's active testing session.

### Accessibility & Appearance

- Confirms that appearance follows the device light or dark setting.
- Confirms that text follows the device's preferred text size.
- Shows platform-appropriate paths for changing those preferences as plain guidance instead of unsupported deep-link buttons.
- Keeps screen-reader naming expectations visible while the accessibility pass continues.

### Build Information

- Reuses the version, source revision, branch, platform, run type, and source-status panel.
- Gives testers one consistent place to find the revision needed for a problem report.

## Add only when supported

These settings should appear after their underlying systems exist and have been tested:

1. Reduced motion for map flights, badge celebrations, and avatar animation.
2. Sound effects, music, and narrated-story controls.
3. Push-notification categories and quiet hours.
4. Downloaded or offline map and story data management.
5. Language, measurement units, and voice-selection controls.
6. Data export and account-deletion workflows.

## Acceptance checks

1. Settings is visible only after authentication and appears in native bottom navigation and web navigation.
2. Account information matches the active Clerk identity.
3. Sign Out returns to the isolated authentication screen.
4. Location status updates after a permission request and after returning from device settings.
5. Permission denial does not block ordinary map browsing.
6. The build panel reports the same source revision as the Content Portal.
7. Passport contains exploration content and no longer duplicates Sign Out.
8. Re-selecting the active Passport or Settings tab on iOS scrolls its page back to the top.
9. Username changes enforce uniqueness, safety rules, and the seven-day
   cooldown on the server.
