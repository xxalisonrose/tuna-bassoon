# Companion Content Portal

## Purpose

The companion content portal will give Dan and Ali a clean web interface for managing Tuna Bassoon content.

The portal will use the project’s existing Clerk authentication, Convex backend, and administrator allowlist. Changes saved through the website should appear in the mobile app without requiring a new app build.

This is an administration tool, not a public-facing website.

## First Release

The first release will focus on location management.

Administrators will be able to:

- Sign in using the existing Clerk authentication flow.
- View and search existing locations.
- Create a location.
- Edit an existing location.
- Review validation errors before saving.
- Confirm that saved changes appear in the mobile app.
- Open the existing Gemini description Editor.

Deleting locations will not be included in the first release. This avoids accidentally breaking visits, badge progress, or awards that reference an existing location.

## Location Form

The location form should include:

- Location name
- Stable location key
- Description
- Category
- Latitude
- Longitude
- Badge tags
- Story key
- Region key

Badge tags should be entered through a repeatable field or tag control rather than as raw JSON.

The form should distinguish required fields from optional fields and preserve entered information when validation fails.

## Validation

The server must validate all submitted data.

Validation should include:

- Trimming text fields.
- Requiring a location name.
- Requiring a non-empty description.
- Requiring valid latitude and longitude values.
- Preventing duplicate stable location keys.
- Removing empty and duplicate badge tags.
- Limiting unreasonable text lengths.
- Confirming that the authenticated user is an administrator.

Client-side validation may provide faster feedback, but it does not replace server validation.

## Security

Every create or update operation must call `requireAdmin(ctx)` on the Convex server.

Hiding the portal or its navigation is not authorization. A non-admin user must be rejected even if they call a Convex function directly.

The browser must not receive secret keys. Clerk publishable configuration and the Convex URL may use the project’s existing client configuration. Administrator IDs, Gemini credentials, and other private values remain in the Convex environment.

The portal must follow the credential rules in `AGENTS.md`.

## Proposed Routes

- `/admin` for the dashboard
- `/admin/locations` for location search and management
- `/admin/locations/new` for creating a location
- `/admin/locations/[locationId]` for editing a location
- `/editor` for the existing Gemini description workflow

Admin navigation should appear on the web experience only. Server authorization must still protect every operation.

## Proposed Convex Functions

A dedicated module should provide administrator functions such as:

- `getLocationsForAdmin`
- `createLocation`
- `updateLocation`

These functions should use explicit argument validators and return useful success or validation results.

Existing seed and maintenance functions should remain internal.

## Future Forms

After location management is stable, the portal may add:

- Badge definition management
- Badge availability windows
- Retirement controls
- Image and asset management
- Draft and publishing states
- Bulk import
- Change history

These are not required for the first release.

## Server Rendering

Server-side rendering is not required for the first release. The portal is an authenticated, interactive form application and will rely on JavaScript.

Static or server-rendered pages can be reconsidered later if Tuna Bassoon adds a public informational website.

## Definition of Done

The first release is complete when:

1. Dan and Ali can access the portal.
2. A non-admin account cannot view or submit the forms.
3. An administrator can create a valid location.
4. An administrator can edit an existing location.
5. Invalid coordinates and missing required fields are rejected.
6. Duplicate location keys are rejected.
7. Saved changes appear in the mobile app.
8. TypeScript and repository validation pass.
9. The portal works with keyboard navigation and basic screen-reader semantics.
10. The implementation and setup are documented and committed to Git.