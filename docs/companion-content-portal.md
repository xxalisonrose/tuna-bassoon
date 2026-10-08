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

### Inline field help

Location and badge editors group their guidance behind a question-mark button in each major section heading, so related explanations can be reviewed together without repeating help controls throughout the form. Seasonal-availability controls continue to provide contextual help through their input headings.

Help panels appear inside the form, support keyboard and screen-reader navigation, and never alter unsaved input. Stable-key help warns that the generated internal identifier should normally remain unchanged after content is in use. Story and region keys are hidden inside the collapsed Advanced Grouping Fields section and explain that they should remain blank unless an intentional story- or region-based badge rule is being configured.

Static instructional copy is consolidated into this contextual help to keep long forms easier to scan. Current selections, empty-state notices, validation errors, upload status, and save-state messages remain visible without opening help.

### Stable-key safeguards

A stable key is the permanent lowercase, hyphenated identifier used internally to connect content even when its public name changes. New location and badge forms automatically suggest a stable key from the name. The suggestion continues following the name until an administrator edits the key directly, and a Use suggested key action can restore the generated value.

Existing location and badge keys are locked by default. Changing one requires opening a warning and deliberately unlocking the field. The form keeps the original key visible and offers a one-click restore before saving. This safeguard reduces accidental changes that could disconnect location-based badge rules, links, progress, awards, or annual editions; it does not change any existing keys automatically.

### Location management

Administrators can search and browse locations, create new locations, and edit all location fields:

- Location name
- Stable location key
- Description
- Optional fun fact
- Optional source citation, publication, or URL
- Lore or legend marker
- Category
- Latitude
- Longitude
- Badge tags
- Optional story key
- Optional region key

The forms validate required fields, coordinate ranges, stable-key format, badge tags, optional story and region keys, and the length of optional fun facts and sources. When a location cannot be saved, a high-contrast alert appears beside the Save controls and each affected field is outlined in red with a short explanation. Every location must have at least one badge tag. The picker prevents removing the final tag until a replacement is selected, and server validation independently rejects a location with no normalized tags. Server validation remains authoritative, including duplicate-key protection and administrator authorization.

### Standardized location categories

Every location has one required, broad public-facing category selected from a fixed list. Category answers “What general kind of place or story is this?” Narrower subjects belong in badge tags, so a Public Art location uses the Culture & Arts category while retaining `public-art` as a tag.

| Category | Use for |
| --- | --- |
| History & Heritage | Historic events, artifacts, memorials, transportation, and heritage |
| Culture & Arts | Art, public art, museums, and cultural expression |
| Literature & Libraries | Books, libraries, writers, poets, and literary history |
| People & Community | People, civic life, neighborhoods, and community stories |
| Science & Nature | Science, natural features, gardens, and the environment |
| Architecture & Places | Notable buildings, historic homes, landmarks, and built spaces |
| Weird & Curious | Oddities, folklore, legends, mysteries, and unusual discoveries |

The portal uses a single-select category dropdown instead of free text. Convex independently rejects values outside this list, preventing spelling, capitalization, and singular/plural duplicates.

The category selector uses the same compact dropdown pattern as the badge editor: it shows the saved choice while closed and expands to display the available categories when opened. Typing in the expanded selector highlights the closest matching category without hiding the rest of the controlled list. Location section-help question marks sit directly beside their headings, field labels remain visible for clarity, and repetitive explanatory copy stays inside the relevant help panel.

The administrator-only `previewLocationCategoryStandardization` query reports every proposed legacy-category change and any value that is not recognized. The `applyLocationCategoryStandardization` mutation refuses to run while unknown values remain, then updates recognized values without changing any other location content.

Locations and badges share a searchable badge-tag dropdown populated from the location and badge content already loaded in the portal. Administrators can reuse an existing tag or add a new lowercase, hyphenated tag. Locations support multiple selected tags, while each badge selects one tag.

Removing a selected tag requires an explicit confirmation and only changes the location or badge currently being edited. Other locations, badges, progress, and awards are not changed.

Optional fun facts and sources appear in the mobile map's location details when present. Blank fields remain hidden.

### Lore and legend labeling

Location editors can mark a story as Lore or legend when it includes folklore, oral tradition, legendary material, or details that are not historically confirmed. The marker is optional and defaults to off, so all existing locations continue to be treated as factual unless an administrator deliberately changes them.

Marked locations display a Lore / legend label in the administrator list. In the mobile location details, a prominent Lore & legend notice appears before the description and explains that the story may include material that is not historically confirmed. The marker labels the editorial nature of the content; it does not change check-ins, badge progress, retirement, or location availability.

Location deletion is intentionally not included. Removing a location could break visits, badge progress, or awards that reference it.

### Location retirement

Administrators can filter the location list by All, Active, or Retired status. Active locations can be retired through an explicit confirmation flow, and retired locations remain visible and editable to administrators.

Retiring a location records the retirement time, removes the location from the public map, and rejects new check-ins. It does not delete the location or rewrite existing history. Previous visits remain in user collections, existing badge progress remains eligible, and earned awards remain permanent.

Retired locations can be reactivated through a separate confirmation flow. Reactivation returns the location to the public map and permits new check-ins again.

Administrator and non-administrator retirement access tests passed. The public location query, direct check-in protection, retirement persistence, and reactivation flow were also tested.

### Portal list and grid views

The Locations and Badges workspaces each support List and Grid views. List remains the default. Grid uses wider information cards in a responsive two-column layout at the portal's full width and wraps to one column on narrower screens. Badge descriptions are limited to two lines with an ellipsis in Grid view, and card actions stay aligned at the bottom.

Workspace headings place Add New Location or Add New Badge directly beneath the section name. The redundant Home button and introductory toolbar copy are removed. Search areas begin with a single Search for a Location or Search for a Badge field, followed by the relevant filters and view controls.

### Gemini drafting

Gemini drafting is optional and lives inside the location create/edit form. It uses the current unsaved name, category, and description as context, along with optional editorial notes.

Gemini only updates the local Description field. It never saves or publishes automatically. The administrator must explicitly create the location or press Save changes before the draft is stored.

Provider failures and 120-second client-side timeouts display safe messages near the Gemini controls. Duplicate Gemini submissions are prevented while a request is active. Closing the Gemini tools does not remove a generated description.

### Badge management

Administrators can search and browse badge definitions, create badges, and edit existing badges. The badge list can be filtered by General, Theme, Seasonal, or Special Place classification.

Badge forms support:

- Badge name
- Stable badge key
- Tag
- Description
- Classification
- Classification-controlled visit requirements and leveling behavior
- A badge-specific congratulations message pool
- Bundled or uploaded badge artwork
- Progress rule

Classification applies a consistent starting configuration:

| Classification | Required visits | Repeatable levels | Starting congratulations pool | Availability |
| --- | ---: | --- | ---: | --- |
| General | 5 | On | 10 messages | Always available unless retired |
| Theme | 2 | On | 10 messages | Always available unless retired |
| Special Place | 1 | Off | 1 message | Always available unless retired |
| Seasonal | 1 | Off | 1 message | Optional scheduled availability windows |

General starts at five required visits, but an administrator can adjust that value for a badge that needs a shorter or longer progression. Theme is fixed at two visits per level. Special Place and Seasonal remain fixed at one visit and do not use repeatable levels.
The congratulations count is a starting preset rather than a permanent
limit: after the classification is applied, administrators can add,
edit, or remove messages while keeping at least one message in the pool.
Changing classification immediately reapplies the visit, leveling, and
starting-message settings.

The supported progress rules are:

- Tag
- Specific location
- Any location
- Specific story
- Specific region
- Same story
- Same region

Specific Location is hidden from the Progress Rule menu while General or Theme is selected. If an existing one-time badge using that rule is changed to General or Theme, its rule returns to Tag automatically.

Specific-location rules include a searchable location selector, so the content team does not need to memorize location keys.

The badge backend validates required fields, classification presets, slug formats, unique badge keys, unique tags, and rule-specific values. Specific-location rules must reference an existing location and use the Special Place or Seasonal classification.

Existing badge definitions can be normalized through the guarded
classification-preset migration. Its preview reports every before/after
change, any congratulations messages that would be removed, and any
classification/rule conflicts. The apply step refuses to run until all
reported conflicts are resolved. It preserves badge names, descriptions,
tags, artwork, rules, availability windows, progress, and awards.

### Repeatable badge levels

General and Theme badges use repeatable levels. General starts at five qualifying visits per level and can be adjusted for an individual badge. Theme uses two qualifying visits per level. For example, a third qualifying Theme location displays Level 1 with one of two visits toward Level 2. Special Place and Seasonal badges are one-time awards and do not use levels.

Levels have no configured maximum. Progress uses distinct qualifying locations, and each earned level is stored as a separate permanent award. Existing one-time awards are treated as Level 1 when a badge is normalized as General, so prior history is preserved. Changing a badge to Special Place or Seasonal stops additional levels without deleting levels that were already earned.

Each badge has its own pool of congratulations messages. The pool stays tucked behind Manage Congratulations inside that badge's create or edit form. An administrator can add messages, edit them, and delete messages with confirmation. General and Theme badges start with ten messages; Special Place and Seasonal badges start with one. These can be replaced with badge-specific wording, and at least one message must remain in each pool.

The collapsed congratulations area shows only Manage Congratulations. While editing, each numbered message displays a live character count beside its label and is limited to 160 characters; the numbered labels do not open separate help panels.

Whenever a badge is first earned or a repeatable badge reaches another level, its in-app celebration popup randomly chooses one message from that badge's pool. The selected message is only used for that popup and is not stored with the award after dismissal. Adding or deleting messages therefore changes future popup choices without rewriting existing awards. Badge levels remain unlimited and do not need level-specific message ranges. New annual seasonal editions inherit the preceding edition's message pool and can then be edited independently.

Specific-location badges remain one-time awards because each location can only be collected once, so they must use the Special Place or Seasonal classification.

### Badge celebration preference

Collection includes a Use Quick Banner Celebrations toggle. Full-screen celebrations remain the default. When the toggle is on, newly earned badges and levels appear in a compact banner at the top of the app instead of covering the screen. The banner can be dismissed immediately and otherwise closes after six seconds. The preference is stored on the current device and browser.

### Badge artwork

New badges use a neutral automatic letter badge based on the badge name unless an administrator chooses custom artwork. The automatic fallback is implicit rather than shown as a selectable artwork card: with no image selected, the editor displays a single Choose image button. When real uploaded or preserved bundled artwork exists, its preview appears beside the Choose/Replace image button. Badge details and artwork are published through the same save action.

Classification and Progress rule use compact dropdowns. Each dropdown uses a consistent compact size while closed, shows the saved selection, and can expand to fit its longest choice when opened. Classification-controlled required visits and repeatable-level status remain visible beneath the classification selector. Section-help question marks sit directly beside their headings so the relationship is visually clear.

The older America 250 and Ghost Stories images remain registered so badges already using them continue to render correctly, but they are not offered as permanent example choices for new badges. When editing one of those existing badges, its current bundled artwork is previewed and can be kept, removed to use the automatic letter fallback, or replaced with an upload.

Custom artwork supports PNG, JPEG, and WebP files up to 5 MB. Uploaded artwork takes priority over preserved bundled artwork. Badges without uploaded or preserved bundled artwork use the automatic letter badge rather than displaying a broken image.

Artwork appears in the administrator badge list, the user Collection, and earned-badge celebrations. Removing uploaded artwork restores preserved bundled artwork when one is still selected, or the automatic letter badge otherwise. Future annual editions inherit the current edition's artwork initially, while each generated edition remains independently editable. Shared uploaded files are retained while another edition still references them.

### Seasonal badge availability

Administrators can schedule availability windows directly inside a seasonal badge form. When a new or existing badge is changed to Seasonal, the first availability window can be entered and saved with the badge in one action.

Each window includes an event period title, local start time, and local end time. On the web portal, separate calendar and time controls replace manual timestamp entry. The controls follow the computer's locale, and the selected range is previewed in a human-readable local format before saving. The application combines the selections into precise timestamps internally. Native builds retain the manual local date-and-time field as a fallback.

Titles are converted to lowercase stable keys, so an entry such as `Halloween 2027` is stored as `halloween-2027`.

Seasonal availability follows these rules:

- Availability windows can only belong to seasonal badges.
- A seasonal badge without windows remains available year-round.
- Windows for the same badge cannot overlap or reuse the same key.
- The end date and time must occur after the start date and time.
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
