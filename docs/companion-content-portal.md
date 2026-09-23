# Companion Content Portal

## Purpose

The companion content portal is the web interface for managing Tuna Bassoon location content. It is an administration tool, not a public-facing website.

The portal is available at `/admin` in the Expo web app. Clerk handles sign-in, and Convex verifies administrator access server-side before portal functions run. Saved changes are read by the mobile app without requiring a new app build.

## Completed Work

### Access and authorization

- Clerk handles sign-in.
- Convex checks administrator access on the server.
- Non-administrators cannot use the portal functions, even if they call Convex directly.
- The web navigation and signed-in home screen show the portal link only to administrators.
- The old `/editor` route redirects to `/admin`, so existing bookmarks and links continue to work.

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

The forms validate required fields, coordinate ranges, stable key format, badge tags, and optional story and region keys. Server validation remains authoritative, including duplicate stable-key protection and administrator authorization.

### Gemini drafting

Gemini drafting is optional and lives inside the same create/edit form. It uses the current unsaved form values for the name, category, and description as context, along with optional editorial notes.

Gemini only updates the local Description field. It never saves or publishes automatically. The administrator must explicitly create the new location or press Save changes before the draft is stored.

Provider failures and 120-second client-side timeouts display safe messages in the form. Duplicate Gemini submissions are prevented while a request is active. Closing the Gemini tools does not remove a generated description.

Location deletion is intentionally not included. This avoids accidentally breaking visits, badge progress, or awards that reference an existing location.

## Security

Every create or update operation calls `requireAdmin(ctx)` on the Convex server. Hiding the portal or its navigation is not authorization.

The browser must not receive secret keys. Clerk publishable configuration and the Convex URL use the project’s existing client configuration. Administrator IDs, Gemini credentials, and other private values remain in the Convex environment.

The portal follows the credential rules in `AGENTS.md`.

## Current Route

- `/admin` is the location management portal.
- `/editor` is retained only as a compatibility redirect to `/admin`.

There are no separate location-management routes yet. The current create and edit workflows live in the `/admin` screen.

## Future Work

The following work is intentionally deferred:

- Badge definition management
- Badge availability-window management
- Location retirement controls
- Media and asset management
- Draft and publishing states beyond the current local Gemini draft flow
- Bulk import
- Audit history and change history
- Production deployment

These additions should preserve server-side authorization and the existing credential rules.

## Server Rendering

Server-side rendering is not required for the current portal. It is an authenticated, interactive form application that relies on JavaScript. Static or server-rendered pages can be reconsidered if Tuna Bassoon later adds a public informational website.
