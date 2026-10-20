# Content Submission Workflow

Tuna Bassoon lets a limited group suggest new locations without giving that
group access to the Content Portal or permission to publish content.

## Roles

- **Administrator:** Can submit locations and review, edit, approve, merge, or
  dismiss every proposal.
- **Regional Moderator:** A manually granted role for trusted future regional
  review. It currently includes Community Contributor submission access but
  does not yet grant review or publishing controls.
- **Community Contributor:** Can submit locations and view the status of their
  own recent proposals. This role does not grant publishing or Content Portal
  access.
- **Explorer:** Cannot see the submission button or use the submission mutation
  until all Contributor requirements are complete.

Community Contributor access is earned when all three requirements are met:

- the account has at least seven days of recorded app activity;
- the explorer has checked into ten unique locations; and
- the explorer has earned three different badges.

The earliest saved profile, visit, or badge-award timestamp establishes the
recorded account age. Repeat visits and additional levels on one badge do not
inflate the unique-place or different-badge counts.

Administrators are configured with `ADMIN_CLERK_USER_IDS`. Ordinary manual
Contributor and Regional Moderator grants are managed in **Content Portal →
Users** by username or private email and retained in an audit history. The
`COMMUNITY_CONTRIBUTOR_CLERK_USER_IDS` override and the earlier
`TRUSTED_CONTRIBUTOR_CLERK_USER_IDS` name remains supported during migration.
`REGIONAL_MODERATOR_CLERK_USER_IDS` remains an emergency override. Submission
access can be suspended with `COMMUNITY_SUBMISSION_BLOCKED_CLERK_USER_IDS`.

Both the Settings button and the server mutation check permission. Hiding the
button is therefore not the security boundary.

## Contributor Experience

Settings shows every Explorer's progress toward the three requirements but
does not display the submission button before access is earned. On earning
access, a one-time app-wide popup explains the review process, source and map
pin expectations, submission limits, safety checks, and the distinction
between suggesting and publishing. A question-mark button beside **Submit a
Location** opens the same explanation again at any time.

An eligible user opens **Settings → Content Contributions → Submit a
Location** and provides:

- location name;
- description;
- source information;
- an optional fun fact;
- a required map pin selected by tapping the map, using the current device
  location, or resolving an address, place name, or Google Maps link;
- optional landmark, entrance, or direction notes; and
- whether the entry includes lore or legend.

The map starts at the contributor's current position when foreground location
permission is already available. Otherwise it starts at Harvard Yard without
selecting a pin. **Use My Current Location** can request permission, and a
contributor can always tap the map instead. Raw latitude and longitude fields
are intentionally not shown.

Address and place-name searches are resolved through OpenStreetMap Nominatim.
Recognized Google Maps URLs are expanded on the server and their coordinates
are extracted when available; the server rejects unrelated URLs. The resolved
pin is always shown before submission so the contributor can correct it.

The page explains that submissions remain private until reviewed. It also
shows the contributor's own recent submissions and friendly statuses, without
exposing another contributor's work or the private admin queue.

On iOS, the form measures the focused field and deliberately scrolls its label
and input above the onscreen keyboard. Interactive keyboard dismissal lets a
contributor drag downward to recover more of the form without losing the
current entry. Device-location failures use a short recovery message instead
of exposing the native exception or call stack to the contributor.

## Automatic Processing

The server creates a `user_submission` batch and uses the same private ingest
tables as Word-document imports. It automatically:

- creates a stable-key suggestion;
- suggests a controlled category and map-pin type;
- suggests only badge tags that already exist;
- checks published locations for name, stable-key, and nearby-coordinate
  matches;
- skips an exact copy of published content;
- rejects an exact copy already in the review queue; and
- limits each contributor to three unresolved submissions at once and five
  submissions per hour.

Submissions appear in the administrator portal under **Submissions → Community
Submissions**, separate from Word-document location and badge imports. They are
then organized as **New Entries**, **Possible Duplicates**, or **Suggested
Edits**. They can be edited and compared with the current published location
before approval.

## Content-Safety Filter

Submission text is normalized and checked on the server for a conservative
starter list of profanity and slurs. Extra project-specific terms can be added
with the comma-separated `CONTENT_BLOCKED_TERMS` Convex environment variable.

Flagged submissions are not deleted. They enter **Rejected by Filter**, remain
private, and cannot be published directly. An administrator can inspect a
flagged proposal, choose **Review Anyway**, edit it, and then return it to the
normal review flow. This protects against obvious abuse while preserving a
path for false positives.

The keyword filter is only a first moderation layer. It does not determine
historical accuracy, source quality, safety, copyright status, or whether a
submission is appropriate for the project. Human review remains required for
every proposal.

## Map and Navigation Safety

The browser map renders the avatar through a small secondary React root. Its
cleanup is deferred until Expo Router finishes changing screens, preventing a
React race warning when moving from the Map to Settings or the submission
page.

For a non-offensive filter test in development, temporarily add a distinctive
test phrase to `CONTENT_BLOCKED_TERMS`, deploy the Convex functions, submit a
location containing that phrase, and remove the test term afterward.

## Future Extensions

- User-submitted badge concepts.
- Photos with licensing and provenance fields.
- Visible reviewer notes and resubmission requests.
- Regional Moderator review permissions, audit history, and geographic scope.
