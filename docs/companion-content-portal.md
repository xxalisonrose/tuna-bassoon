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
- Optional fun fact
- Optional source citation, publication, or URL
- Category
- Latitude
- Longitude
- Badge tags
- Optional story key
- Optional region key

The forms validate required fields, coordinate ranges, stable-key format, badge tags, optional story and region keys, and the length of optional fun facts and sources. Server validation remains authoritative, including duplicate-key protection and administrator authorization.

Locations and badges share a searchable badge-tag dropdown populated from the location and badge content already loaded in the portal. Administrators can reuse an existing tag or add a new lowercase, hyphenated tag. Locations support multiple selected tags, while each badge selects one tag.

Removing a selected tag requires an explicit confirmation and only changes the location or badge currently being edited. Other locations, badges, progress, and awards are not changed.

Optional fun facts and sources appear in the mobile map's location details when present. Blank fields remain hidden.

Location deletion is intentionally not included. Removing a location could break visits, badge progress, or awards that reference it.

### Location retirement

Administrators can filter the location list by All, Active, or Retired status. Active locations can be retired through an explicit confirmation flow, and retired locations remain visible and editable to administrators.

Retiring a location records the retirement time, removes the location from the public map, and rejects new check-ins. It does not delete the location or rewrite existing history. Previous visits remain in user collections, existing badge progress remains eligible, and earned awards remain permanent.

Retired locations can be reactivated through a separate confirmation flow. Reactivation returns the location to the public map and permits new check-ins again.

Administrator and non-administrator retirement access tests passed. The public location query, direct check-in protection, retirement persistence, and reactivation flow were also tested.

### Gemini drafting

Gemini drafting is optional and lives inside the location create/edit form. It uses the current unsaved name, category, and description as context, along with optional editorial notes.

Gemini only updates the local Description field. It never saves or publishes automatically. The administrator must explicitly create the location or press Save changes before the draft is stored.

Provider failures and 120-second client-side timeouts display safe messages near the Gemini controls. Duplicate Gemini submissions are prevented while a request is active. Closing the Gemini tools does not remove a generated description.

### Badge management

Administrators can search and browse badge definitions, create badges, and edit existing badges. The badge list can be filtered by General, Seasonal, or Special place classification.

Badge forms support:

- Badge name
- Stable badge key
- Tag
- Description
- Required visit count
- Classification
- Optional repeatable levels for non-seasonal badges
- Bundled or uploaded badge artwork
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

### Repeatable badge levels

General and Special place badges can optionally use repeatable levels. When enabled, every complete set of qualifying visits earns the next permanent level. For example, a badge requiring three visits reaches Level 1 after three qualifying locations; a fourth qualifying location displays Level 1 with one of three visits toward Level 2.

Levels have no configured maximum. Progress uses distinct qualifying locations, and each earned level is stored as a separate permanent award. Existing one-time awards are treated as Level 1 when leveling is enabled, so prior history is preserved. Disabling leveling stops additional levels without deleting levels that were already earned.

Specific-location badges remain one-time awards because each location can only be collected once. Seasonal badges also remain one-time awards and cannot enable levels.

### Badge artwork

Administrators can choose from artwork bundled with the application or upload custom artwork while creating or editing a badge. The form previews the selected artwork before saving, and the badge details and artwork are published through the same save action.

Custom artwork supports PNG, JPEG, and WebP files up to 5 MB. Uploaded artwork takes priority over bundled artwork. Badges without matching artwork use a letter fallback rather than displaying a broken image.

Artwork appears in the administrator badge list, the user Collection, and earned-badge celebrations. Removing uploaded artwork restores the selected bundled artwork or letter fallback. Future annual editions inherit the current edition's artwork initially, while each generated edition remains independently editable. Shared uploaded files are retained while another edition still references them.

### Seasonal badge availability

Administrators can schedule availability windows directly inside a seasonal badge form. When a new or existing badge is changed to Seasonal, the first availability window can be entered and saved with the badge in one action.

Each window includes an event period title, local start time, and local end time. Titles are converted to lowercase stable keys, so an entry such as `Halloween 2027` is stored as `halloween-2027`.

Seasonal availability follows these rules:

- Availability windows can only belong to seasonal badges.
- A seasonal badge without windows remains available year-round.
- Windows for the same badge cannot overlap or reuse the same key.
- Future windows can be edited or removed.
- Active windows cannot be edited or deleted, but administrators can end them early through an explicit confirmation step.
- Ending an active window records its new end time, stops new qualifying progress, and preserves existing progress and window history.
- Past windows remain locked to preserve progress history.
- A badge with availability history cannot be changed away from Seasonal in a way that would invalidate that history.

The portal labels windows as Upcoming, Active, or Past and uses the administrator’s local time for entry and display.

### Annual seasonal badge editions

Seasonal badges can optionally repeat yearly. Enabling Repeat yearly creates an annual series that links separate, independently earnable badge editions.

The annual-edition system follows these rules:

- Each year is stored as a separate badge definition with its own progress and awards.
- The original badge becomes the first edition in the series.
- The next edition copies the badge content and shifts its availability windows forward by one calendar year.
- Series names and stable keys identify the recurring event across editions.
- Existing editions remain available for separate editing, including future edition-specific artwork.
- Pausing yearly repetition preserves the series identity, editions, progress, and awards.
- Returning a remembered badge to Seasonal can resume its existing series.
- Repeated saves, resumes, and scheduled maintenance runs do not create duplicate editions.
- Automatic generation cannot advance the series more than one calendar year beyond the current year.
- A scheduled Convex job prepares the next annual edition when it enters the configured generation period.

Earned awards remain attached to their original edition. A user can therefore earn separate awards for editions such as Christmas 2026 and Christmas 2027 without rewriting prior history.

Seasonal editions never use badge levels. In the Collection, earned editions from the same annual series are grouped together and ordered by edition year, so a 2027 award appears directly after its earned 2026 edition.

### Badge retirement

Badges are retired rather than deleted. Retirement requires an explicit confirmation step.

Retiring a badge records the retirement time and stops new progress after that point. Existing eligible progress and awards remain, and earned awards are permanent.

Retired badges can be reactivated through a separate confirmation flow. Reactivation allows progress to be calculated again.

The portal does not delete badge definitions, progress records, or awards.

## Security

Every portal create or update operation checks administrator access through `requireAdmin(ctx)` on the Convex server. Hiding a portal link or screen is not treated as authorization.

Badge artwork upload URLs, attachment changes, replacements, and removals also require administrator access. Badge artwork is public application content, so its generated display URL can be returned to signed-in users without exposing private information.

The browser does not receive secret keys. Clerk publishable configuration and the Convex URL use the project’s existing client configuration. Administrator IDs, Gemini credentials, and other private values remain in the Convex environment.

The portal follows the credential rules in `AGENTS.md`.

## Current Routes

- `/admin` contains the Locations and Badges management sections.
- `/editor` is retained only as a compatibility redirect to `/admin`.

Badge management is part of the existing content portal rather than a separate public route.

## Future Work

The following work is intentionally deferred:

- Location artwork and broader media/asset management
- Draft and publishing states beyond the current local Gemini draft flow
- Bulk import
- Audit and change history
- Final deletion policies
- Production configuration and deployment

These additions must preserve server-side authorization, existing awards and progress, and the credential rules in `AGENTS.md`.

## Server Rendering

Server-side rendering is not required for the current portal. It is an authenticated, interactive form application that relies on JavaScript.

Static or server-rendered pages can be reconsidered if Tuna Bassoon later adds a public informational website.
