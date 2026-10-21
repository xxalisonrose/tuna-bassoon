# Convex usage and storage

This document records the current Convex usage review and the safeguards used
to keep the development deployment within the available plan limits.

## October 21, 2026 audit

- Database storage: 5.02 MB of 3 GB.
- File storage: 14.47 MB of 6 GB.
- Stored artwork: 51 PNG files totaling 15,175,521 bytes.
- Every stored file is referenced by a badge definition. No orphaned files are
  safe to delete.
- Two pairs of referenced files have identical content. Consolidating those
  pairs would save only 492,093 bytes, so they remain untouched unless storage
  pressure makes a data migration worthwhile.
- Database I/O, rather than storage capacity, is the resource to watch. The
  largest historical reader was the personalized Passport badge-progress
  query, followed by the location-import review query.

## Current safeguards

- The Passport loads the shared badge catalog separately from the signed-in
  user's small progress record. This allows the catalog result to be reused
  across users and prevents every progress update from rereading the full
  catalog.
- The legacy combined badge-progress query remains available for older builds
  during the migration.
- Import-review queries fetch each shared import batch and each matched
  published record once per query rather than once for every proposal.
- Replacing or removing badge artwork deletes the old file only after confirming
  that no other badge definition references it.
- Administrators have a read-only artwork-storage audit query that reports
  referenced files, unreferenced files, and exact-content duplicates. It never
  deletes files automatically.

## Follow-up if usage grows

1. Watch the Convex usage dashboard after normal Passport and content-portal
   use so the new query costs can be measured against the historical baseline.
2. Paginate import history or move large original-document text into a separate
   detail table if import-review I/O remains significant.
3. Add an upload size limit and client-side image resizing for future badge
   artwork. Keep existing working artwork unchanged unless file storage becomes
   a meaningful constraint.
4. Consolidate exact duplicate files only through a reviewed migration that
   rewires every badge reference before deleting the redundant copy.
