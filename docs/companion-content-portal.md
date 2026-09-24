# Companion Content Portal

## Purpose

The companion content portal is the web interface for managing Tuna Bassoon content. It is an administration tool for the project’s content team, not a public-facing website.

The portal is available at `/admin` in the Expo web app. Clerk handles sign-in, and Convex verifies administrator access on the server before protected functions run. Changes saved through the portal are read by the mobile app without requiring a new app build.

## Completed Work

### Access and authorization

- Clerk handles administrator sign-in.
- Convex checks administrator access on the server.
- Non-administrators cannot use portal functions, even if they call Convex directly.
- The web navigation and signed-in home screen show the portal link only to administrators.
- The old `/editor` route redirects to `/admin`, so existing bookmarks and links continue to work.
- Administrator and non-administrator access tests have passed.

### Portal sections

The portal has separate Locations and Badges sections. Administrators can switch between them without losing an unfinished badge form.

The location and Gemini workflows continue to work after adding badge management.

### Location management

Administrators can search and browse locations, create new locations, and edit all location fields:

- Location name
- Stable location key
- Description
- Category
- Latitude
- Longitude
- Badge tags
- Optional story key
- Optional region key

The forms validate required fields, coordinate ranges, stable-key format, badge tags, and optional story and region keys. Server validation remains authoritative, including duplicate-key protection and administrator authorization.

Location deletion is intentionally not included. Removing a location could break visits, badge progress, or awards that reference it.

### Gemini drafting

Gemini drafting is optional and lives inside the location create/edit form. It uses the current unsaved name, category, and description as context, along with optional editorial notes.

Gemini only updates the local Description field. It never saves or publishes automatically. The administrator must explicitly create the location or press Save changes before the draft is stored.

Provider failures and 120-second client-side timeouts display safe messages near the Gemini controls. Duplicate Gemini submissions are prevented while a request is active. Closing the Gemini tools does not remove a generated description.

### Badge management

Administrators can search and browse badge definitions, create badges, and edit existing badges.

Badge forms support:

- Badge name
- Stable badge key
- Tag
- Description
- Required visit count
- Classification
- Optional image key
- Progress rule

The supported classifications are:

- General
- Special place
- Seasonal

The supported progress rules are:

- Tag
- Specific location
- Any location
- Specific story
- Specific region
- Same story
- Same region

Specific-location rules include a searchable location selector, so the content team does not need to memorize location keys.

The badge backend validates required fields, required visit counts, slug formats, unique badge keys, unique tags, and rule-specific values. Specific-location rules must reference an existing location.

Seasonal badges can be created and edited. Availability dates are not yet configurable in the portal. Under the current backend rules, a seasonal badge without availability windows remains available.

### Badge retirement

Badges are retired rather than deleted. Retirement requires an explicit confirmation step.

Retiring a badge records the retirement time and stops new progress after that point. Existing eligible progress and awards remain, and earned awards are permanent.

Retired badges can be reactivated through a separate confirmation flow. Reactivation allows progress to be calculated again.

The portal does not delete badge definitions, progress records, or awards.

## Security

Every portal create or update operation checks administrator access through `requireAdmin(ctx)` on the Convex server. Hiding a portal link or screen is not treated as authorization.

The browser does not receive secret keys. Clerk publishable configuration and the Convex URL use the project’s existing client configuration. Administrator IDs, Gemini credentials, and other private values remain in the Convex environment.

The portal follows the credential rules in `AGENTS.md`.

## Current Routes

- `/admin` contains the Locations and Badges management sections.
- `/editor` is retained only as a compatibility redirect to `/admin`.

Badge management is part of the existing content portal rather than a separate public route.

## Future Work

The following work is intentionally deferred:

- Badge availability-window management
- Location retirement controls
- Media and asset management
- Draft and publishing states beyond the current local Gemini draft flow
- Bulk import
- Audit and change history
- Final deletion policies
- Production configuration and deployment

These additions must preserve server-side authorization, existing awards and progress, and the credential rules in `AGENTS.md`.

## Server Rendering

Server-side rendering is not required for the current portal. It is an authenticated, interactive form application that relies on JavaScript.

Static or server-rendered pages can be reconsidered if Tuna Bassoon later adds a public informational website.