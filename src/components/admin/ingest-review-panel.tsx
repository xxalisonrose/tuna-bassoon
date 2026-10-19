import { useMutation, useQuery } from 'convex/react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import {
  createBadgeProposalEdit,
  createLocationProposalEdit,
  IngestProposalEditor,
  type BadgeProposalEdit,
  type LocationProposalEdit,
} from '@/components/admin/ingest-proposal-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, PortalContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  parseBadgeWordDocument,
  parseLocationWordDocument,
  type ImportConfidence,
  type ParsedBadgeDraft,
  type ParsedLocationDraft,
} from '@/lib/content-ingest';
import { pickAndReadWordDocument } from '@/lib/word-document-import';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type IngestContentType = 'location' | 'badge';
type ImportMode = IngestContentType | 'mixed';
type ReviewQueue =
  | 'community_submissions'
  | 'location_imports'
  | 'badge_imports';
type ReviewStatus =
  | 'ready'
  | 'needs_attention'
  | 'possible_duplicate'
  | 'suggested_edit'
  | 'already_published'
  | 'published'
  | 'kept_existing'
  | 'dismissed'
  | 'rejected_by_filter';
type StatusFilter =
  | 'new_entries'
  | 'possible_duplicates'
  | 'suggested_edits'
  | 'filtered'
  | 'history';

type PendingImport = {
  mode: ImportMode;
  fileName: string;
  warnings: string[];
  locationDrafts: ParsedLocationDraft[];
  badgeDrafts: ParsedBadgeDraft[];
};

type ReviewCard = {
  id: string;
  contentType: IngestContentType;
  name: string;
  key: string;
  status: ReviewStatus;
  importConfidence?: ImportConfidence;
  suggestionNotes: string[];
  issues: string[];
  sourceName: string;
  sourceType?: 'document' | 'user_submission';
  sourceOrdinal?: number;
  sourceText: string;
  matchName?: string;
  matchKey?: string;
  matchDistanceMeters?: number;
  proposalDetails: { label: string; value: string }[];
  matchDetails: { label: string; value: string }[];
  changedLabels: string[];
  moderationFlags: string[];
  publishable: boolean;
  locationEdit?: LocationProposalEdit;
  badgeEdit?: BadgeProposalEdit;
};

const statusLabels: Record<ReviewStatus, string> = {
  ready: 'Ready to Review',
  needs_attention: 'Needs Attention',
  possible_duplicate: 'Possible Duplicate',
  suggested_edit: 'Suggested Edit',
  already_published: 'Suggested Edit',
  published: 'Published',
  kept_existing: 'Kept Existing',
  dismissed: 'Dismissed',
  rejected_by_filter: 'Rejected by Filter',
};

const confidenceLabels: Record<ImportConfidence, string> = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
};

const openStatuses = new Set<ReviewStatus>([
  'ready',
  'needs_attention',
  'possible_duplicate',
  'suggested_edit',
  'already_published',
]);

const finalizedStatuses = new Set<ReviewStatus>([
  'published',
  'kept_existing',
  'dismissed',
  'rejected_by_filter',
]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isHistoryStatus(status: ReviewStatus) {
  return finalizedStatuses.has(status) && status !== 'rejected_by_filter';
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'string'
  ) {
    return error.data;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return 'Not provided';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.join(', ') || 'None';
  }
  return String(value);
}

function comparableText(value: string | undefined) {
  return (value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function sameText(left: string | undefined, right: string | undefined) {
  return comparableText(left) === comparableText(right);
}

function sameStringList(left: string[], right: string[]) {
  const normalize = (values: string[]) =>
    values
      .map((value) => comparableText(value).toLowerCase())
      .filter(Boolean)
      .sort();

  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function importedMessagesMatch(imported: string[], published: string[]) {
  return imported.every(
    (message, index) =>
      comparableText(message) === comparableText(published[index]),
  );
}

function getChangedLabels(values: [string, boolean][]) {
  return values.filter(([, changed]) => changed).map(([label]) => label);
}

function matchesStatusFilter(card: ReviewCard, filter: StatusFilter) {
  if (filter === 'new_entries') {
    return card.status === 'ready' || card.status === 'needs_attention';
  }
  if (filter === 'possible_duplicates') {
    return card.status === 'possible_duplicate';
  }
  if (filter === 'suggested_edits') {
    return (
      card.status === 'suggested_edit' || card.status === 'already_published'
    );
  }
  if (filter === 'filtered') {
    return card.status === 'rejected_by_filter';
  }

  return isHistoryStatus(card.status);
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

export function IngestReviewPanel({
  visible,
}: {
  visible: boolean;
}) {
  const theme = useTheme();
  const [reviewQueue, setReviewQueue] = useState<ReviewQueue>(
    'community_submissions',
  );
  const contentType: IngestContentType =
    reviewQueue === 'badge_imports' ? 'badge' : 'location';
  const locationDrafts = useQuery(
    api.adminIngest.getLocationDrafts,
    visible ? {} : 'skip',
  );
  const badgeDrafts = useQuery(
    api.adminIngest.getBadgeDrafts,
    visible ? {} : 'skip',
  );
  const adminLocations = useQuery(
    api.adminLocations.getLocationsForAdmin,
    visible ? {} : 'skip',
  );
  const adminBadges = useQuery(
    api.adminBadges.getBadgesForAdmin,
    visible ? {} : 'skip',
  );
  const createBatch = useMutation(api.adminIngest.createBatch);
  const stageLocationDrafts = useMutation(api.adminIngest.stageLocationDrafts);
  const stageBadgeDrafts = useMutation(api.adminIngest.stageBadgeDrafts);
  const discardEmptyBatch = useMutation(api.adminIngest.discardEmptyBatch);
  const reviewLocationDraft = useMutation(api.adminIngest.reviewLocationDraft);
  const reviewBadgeDraft = useMutation(api.adminIngest.reviewBadgeDraft);
  const updateLocationDraft = useMutation(api.adminIngest.updateLocationDraft);
  const updateBadgeDraft = useMutation(api.adminIngest.updateBadgeDraft);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('new_entries');
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(
    null,
  );
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);
  const [confirmReplaceId, setConfirmReplaceId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const cards = useMemo<ReviewCard[]>(() => {
    if (contentType === 'location') {
      return (locationDrafts ?? []).map((draft) => {
        const match = draft.matchedLocation;
        const publishable = Boolean(
          draft.name.trim() &&
          slugPattern.test(draft.key) &&
          draft.description.trim() &&
          draft.latitude !== undefined &&
          draft.longitude !== undefined &&
          draft.category &&
          draft.mapPinType &&
          draft.badges.length > 0,
        );

        return {
          id: draft._id,
          contentType,
          name: draft.name,
          key: draft.key,
          status: draft.status,
          importConfidence: draft.importConfidence,
          suggestionNotes: draft.suggestionNotes ?? [],
          issues: draft.issues,
          sourceName: draft.batch?.sourceName ?? 'Imported document',
          sourceType: draft.batch?.sourceType,
          sourceOrdinal: draft.sourceOrdinal,
          sourceText: draft.sourceText,
          matchName: match?.name,
          matchKey: match?.key,
          matchDistanceMeters: draft.matchDistanceMeters,
          proposalDetails: [
            { label: 'Name', value: draft.name },
            { label: 'Stable Key', value: draft.key },
            { label: 'Category', value: formatValue(draft.category) },
            { label: 'Badge Tags', value: formatValue(draft.badges) },
            { label: 'Description', value: formatValue(draft.description) },
            { label: 'Fun Fact', value: formatValue(draft.funFact) },
            { label: 'Source', value: formatValue(draft.source) },
            { label: 'Includes Lore', value: formatValue(draft.isLore) },
            {
              label: 'Coordinates',
              value:
                draft.latitude === undefined || draft.longitude === undefined
                  ? 'Not provided'
                  : `${draft.latitude}, ${draft.longitude}`,
            },
            { label: 'Map Pin', value: formatValue(draft.mapPinType) },
            ...(draft.submittedLocationInput
              ? [
                  {
                    label: 'Submitted Address or Map Link',
                    value: draft.submittedLocationInput,
                  },
                ]
              : []),
            ...(draft.submitterLocationNotes
              ? [
                  {
                    label: 'Additional Location Details',
                    value: draft.submitterLocationNotes,
                  },
                ]
              : []),
          ],
          matchDetails: match
            ? [
                { label: 'Name', value: match.name },
                { label: 'Stable Key', value: formatValue(match.key) },
                { label: 'Category', value: formatValue(match.category) },
                { label: 'Badge Tags', value: formatValue(match.badges) },
                { label: 'Description', value: match.description },
                { label: 'Fun Fact', value: formatValue(match.funFact) },
                { label: 'Source', value: formatValue(match.source) },
                { label: 'Includes Lore', value: formatValue(match.isLore) },
                {
                  label: 'Coordinates',
                  value: `${formatValue(match.latitude)}, ${formatValue(match.longitude)}`,
                },
                { label: 'Map Pin', value: formatValue(match.mapPinType) },
              ]
            : [],
          changedLabels: match
            ? getChangedLabels([
                ['Name', !sameText(draft.name, match.name)],
                ['Stable Key', !sameText(draft.key, match.key)],
                ['Category', !sameText(draft.category, match.category)],
                ['Badge Tags', !sameStringList(draft.badges, match.badges)],
                [
                  'Description',
                  !sameText(draft.description, match.description),
                ],
                ['Fun Fact', !sameText(draft.funFact, match.funFact)],
                ['Source', !sameText(draft.source, match.source)],
                [
                  'Includes Lore',
                  (draft.isLore === true) !== (match.isLore === true),
                ],
                [
                  'Coordinates',
                  draft.latitude !== match.latitude ||
                    draft.longitude !== match.longitude,
                ],
                ['Map Pin', !sameText(draft.mapPinType, match.mapPinType)],
              ])
            : [],
          moderationFlags: draft.moderationFlags ?? [],
          publishable,
          locationEdit: createLocationProposalEdit(draft),
        };
      });
    }

    return (badgeDrafts ?? []).map((draft) => {
      const match = draft.matchedBadge;
      const publishable = Boolean(
        draft.name.trim() &&
        draft.description.trim() &&
        slugPattern.test(draft.key) &&
        slugPattern.test(draft.tag) &&
        Number.isInteger(draft.requiredVisits) &&
        draft.requiredVisits > 0 &&
        (draft.classification !== 'theme' || draft.requiredVisits === 2) &&
        ((draft.classification !== 'special_place' &&
          draft.classification !== 'seasonal') ||
          draft.requiredVisits === 1) &&
        draft.levelsEnabled ===
          (draft.classification === 'general' ||
            draft.classification === 'theme') &&
        draft.congratulationsMessages.length > 0 &&
        draft.congratulationsMessages.every(
          (message) => message.trim().length > 0 && message.length <= 160,
        ),
      );

      return {
        id: draft._id,
        contentType,
        name: draft.name,
        key: draft.key,
        status: draft.status,
        importConfidence: draft.importConfidence,
        suggestionNotes: draft.suggestionNotes ?? [],
        issues: draft.issues,
        sourceName: draft.batch?.sourceName ?? 'Imported document',
        sourceType: draft.batch?.sourceType,
        sourceOrdinal: draft.sourceOrdinal,
        sourceText: draft.sourceText,
        matchName: match?.name,
        matchKey: match?.key,
        proposalDetails: [
          { label: 'Name', value: draft.name },
          { label: 'Stable Key', value: draft.key },
          { label: 'Tag', value: draft.tag },
          { label: 'Classification', value: draft.classification },
          { label: 'Required Visits', value: String(draft.requiredVisits) },
          { label: 'Leveling', value: draft.levelsEnabled ? 'On' : 'Off' },
          { label: 'Description', value: draft.description },
          {
            label: 'Congratulations',
            value: formatValue(draft.congratulationsMessages),
          },
        ],
        matchDetails: match
          ? [
              { label: 'Name', value: match.name },
              { label: 'Stable Key', value: formatValue(match.key) },
              { label: 'Tag', value: match.tag },
              {
                label: 'Classification',
                value: formatValue(match.classification),
              },
              {
                label: 'Required Visits',
                value: String(match.requiredVisits),
              },
              {
                label: 'Leveling',
                value: match.levelsEnabled ? 'On' : 'Off',
              },
              { label: 'Description', value: match.description },
              {
                label: 'Congratulations',
                value: formatValue(match.congratulationsMessages),
              },
            ]
          : [],
        changedLabels: match
          ? getChangedLabels([
              ['Name', !sameText(draft.name, match.name)],
              ['Stable Key', !sameText(draft.key, match.key)],
              ['Tag', !sameText(draft.tag, match.tag)],
              [
                'Classification',
                draft.classification !== (match.classification ?? 'general'),
              ],
              [
                'Required Visits',
                draft.requiredVisits !== match.requiredVisits,
              ],
              [
                'Leveling',
                draft.levelsEnabled !== (match.levelsEnabled === true),
              ],
              ['Description', !sameText(draft.description, match.description)],
              [
                'Congratulations',
                !importedMessagesMatch(
                  draft.congratulationsMessages,
                  match.congratulationsMessages ?? [],
                ),
              ],
            ])
          : [],
        moderationFlags: [],
        publishable,
        badgeEdit: createBadgeProposalEdit({
          name: draft.name,
          key: draft.key,
          tag: draft.tag,
          description: draft.description,
          classification: draft.classification,
          requiredVisits: String(draft.requiredVisits),
          levelsEnabled: draft.levelsEnabled,
          congratulationsMessages: draft.congratulationsMessages,
        }),
      };
    });
  }, [badgeDrafts, contentType, locationDrafts]);

  const queueCards = useMemo(
    () =>
      cards.filter((card) =>
        reviewQueue === 'community_submissions'
          ? card.sourceType === 'user_submission'
          : card.sourceType === 'document',
      ),
    [cards, reviewQueue],
  );
  const reviewableCards = useMemo(
    () =>
      queueCards.filter(
        (card) =>
          !(
            (card.status === 'suggested_edit' ||
              card.status === 'already_published') &&
            card.changedLabels.length === 0
          ),
      ),
    [queueCards],
  );
  const filteredCards = useMemo(
    () => reviewableCards.filter((card) => matchesStatusFilter(card, statusFilter)),
    [reviewableCards, statusFilter],
  );
  const statusCounts = useMemo(
    () =>
      (
        [
          'new_entries',
          'possible_duplicates',
          'suggested_edits',
          'filtered',
          'history',
        ] as StatusFilter[]
      ).reduce<Record<StatusFilter, number>>(
        (counts, filter) => ({
          ...counts,
          [filter]: reviewableCards.filter((card) =>
            matchesStatusFilter(card, filter),
          ).length,
        }),
        {
          new_entries: 0,
          possible_duplicates: 0,
          suggested_edits: 0,
          filtered: 0,
          history: 0,
        },
      ),
    [reviewableCards],
  );
  const importWarnings = useMemo(() => {
    if (reviewQueue === 'community_submissions') {
      return [];
    }
    const drafts = contentType === 'location' ? locationDrafts : badgeDrafts;

    return Array.from(
      new Set((drafts ?? []).flatMap((draft) => draft.batch?.warnings ?? [])),
    );
  }, [badgeDrafts, contentType, locationDrafts, reviewQueue]);
  const savedTagCatalog = useMemo(
    () =>
      adminLocations && adminBadges
        ? Array.from(
            new Set([
              ...adminLocations.flatMap((location) => location.badges),
              ...adminBadges.map((badge) => badge.tag),
            ]),
          ).sort((left, right) => left.localeCompare(right))
        : undefined,
    [adminBadges, adminLocations],
  );
  const availableTags = savedTagCatalog ?? [];
  const pendingSummary = useMemo(() => {
    if (!pendingImport) {
      return null;
    }

    const drafts = [
      ...pendingImport.locationDrafts,
      ...pendingImport.badgeDrafts,
    ];
    const confidenceCounts = drafts.reduce(
      (counts, draft) => {
        counts[draft.importConfidence] += 1;
        return counts;
      },
      { high: 0, medium: 0, low: 0 },
    );
    const needsAttention = drafts.filter(
      (draft) => draft.issues.length > 0,
    ).length;
    const markedComplete = drafts.filter(
      (draft) => draft.sourceWasMarkedComplete,
    ).length;
    const previousImports = [
      ...(pendingImport.locationDrafts.length > 0 ? locationDrafts ?? [] : []),
      ...(pendingImport.badgeDrafts.length > 0 ? badgeDrafts ?? [] : []),
    ].filter(
      (draft) =>
        draft.batch?.sourceType === 'document' &&
        draft.batch.sourceName === pendingImport.fileName,
    ).length;

    return {
      total: drafts.length,
      confidenceCounts,
      needsAttention,
      markedComplete,
      previousImports: previousImports ?? 0,
    };
  }, [badgeDrafts, locationDrafts, pendingImport]);

  if (!visible) {
    return null;
  }

  const importDocument = async (mode: ImportMode) => {
    setIsImporting(true);
    setStatusMessage('');

    try {
      const document = await pickAndReadWordDocument();

      if (!document) {
        return;
      }

      const locations =
        mode === 'location' || mode === 'mixed'
          ? parseLocationWordDocument(document.paragraphs, {
              availableBadgeTags: savedTagCatalog,
            })
          : { drafts: [], warnings: [] };
      const badges =
        mode === 'badge' || mode === 'mixed'
          ? parseBadgeWordDocument(document.paragraphs)
          : { drafts: [], warnings: [] };
      const warnings = Array.from(
        new Set([
          ...locations.warnings.map((warning) =>
            mode === 'mixed' ? `Locations: ${warning}` : warning,
          ),
          ...badges.warnings.map((warning) =>
            mode === 'mixed' ? `Badges: ${warning}` : warning,
          ),
        ]),
      );

      setPendingImport({
        mode,
        fileName: document.fileName,
        warnings,
        locationDrafts: locations.drafts,
        badgeDrafts: badges.drafts,
      });

      setStatusMessage(
        `Preview ready for ${document.fileName}. Nothing has been added or published yet.`,
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  };

  const addPendingImportToQueue = async () => {
    if (!pendingImport || pendingSummary?.total === 0) {
      return;
    }

    setIsImporting(true);
    setStatusMessage('');

    try {
      let stagedCount = 0;
      let skippedDuplicateCount = 0;
      let suggestedEditCount = 0;

      if (pendingImport.locationDrafts.length > 0) {
        const batchId = await createBatch({
          contentType: 'location',
          sourceType: 'document',
          sourceName: pendingImport.fileName,
          warnings: pendingImport.warnings,
        });
        let locationStagedCount = 0;
        for (const drafts of chunkValues(pendingImport.locationDrafts, 30)) {
          const result = await stageLocationDrafts({ batchId, drafts });
          stagedCount += result.staged;
          locationStagedCount += result.staged;
          skippedDuplicateCount += result.skippedDuplicates;
          suggestedEditCount += result.suggestedEdits;
        }
        if (locationStagedCount === 0) {
          await discardEmptyBatch({ batchId });
        }
      }

      if (pendingImport.badgeDrafts.length > 0) {
        const batchId = await createBatch({
          contentType: 'badge',
          sourceType: 'document',
          sourceName: pendingImport.fileName,
          warnings: pendingImport.warnings,
        });
        let badgeStagedCount = 0;
        for (const drafts of chunkValues(pendingImport.badgeDrafts, 30)) {
          const result = await stageBadgeDrafts({ batchId, drafts });
          stagedCount += result.staged;
          badgeStagedCount += result.staged;
          skippedDuplicateCount += result.skippedDuplicates;
          suggestedEditCount += result.suggestedEdits;
        }
        if (badgeStagedCount === 0) {
          await discardEmptyBatch({ batchId });
        }
      }

      const importedMode = pendingImport.mode;
      setReviewQueue(
        pendingImport.locationDrafts.length > 0
          ? 'location_imports'
          : 'badge_imports',
      );
      setStatusFilter('new_entries');
      setPendingImport(null);
      setStatusMessage(
        stagedCount === 0
          ? `Nothing was added. All ${skippedDuplicateCount} ${importedMode} proposals already exist unchanged in published content or the review queue.`
          : `${stagedCount} proposals were added to the private review queue, including ${suggestedEditCount} suggested ${suggestedEditCount === 1 ? 'edit' : 'edits'}. ${skippedDuplicateCount} exact ${skippedDuplicateCount === 1 ? 'duplicate was' : 'duplicates were'} skipped. Nothing was published.`,
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  };

  const performReview = async (
    card: ReviewCard,
    action:
      | 'publish_new'
      | 'replace_existing'
      | 'merge_missing'
      | 'keep_existing'
      | 'dismiss'
      | 'reopen',
  ) => {
    setBusyDraftId(card.id);
    setStatusMessage('');

    try {
      if (card.contentType === 'location') {
        await reviewLocationDraft({
          draftId: card.id as Id<'locationIngestDrafts'>,
          action,
        });
      } else {
        await reviewBadgeDraft({
          draftId: card.id as Id<'badgeIngestDrafts'>,
          action,
        });
      }

      setConfirmReplaceId(null);
      setStatusMessage(
        action === 'publish_new'
          ? `${card.name} was published.`
          : action === 'replace_existing'
            ? `${card.matchName ?? card.name} was replaced with the reviewed proposal.`
            : action === 'merge_missing'
              ? `Missing information from ${card.name} was added to the existing record.`
              : action === 'keep_existing'
                ? `The existing ${card.name} was kept.`
                : action === 'dismiss'
                  ? `${card.name} was dismissed.`
                  : `${card.name} was returned to the review queue.`,
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setBusyDraftId(null);
    }
  };

  const saveLocationProposal = async (
    card: ReviewCard,
    form: LocationProposalEdit,
  ) => {
    setBusyDraftId(card.id);
    setStatusMessage('');

    try {
      const latitude = form.latitude.trim()
        ? Number(form.latitude.trim())
        : undefined;
      const longitude = form.longitude.trim()
        ? Number(form.longitude.trim())
        : undefined;

      await updateLocationDraft({
        draftId: card.id as Id<'locationIngestDrafts'>,
        name: form.name,
        key: form.key,
        description: form.description,
        funFact: form.funFact || undefined,
        source: form.source || undefined,
        isLore: form.isLore,
        latitude:
          latitude !== undefined && Number.isFinite(latitude)
            ? latitude
            : undefined,
        longitude:
          longitude !== undefined && Number.isFinite(longitude)
            ? longitude
            : undefined,
        category: form.category || undefined,
        mapPinType: form.mapPinType,
        badges: form.badges,
      });
      setEditingDraftId(null);
      setStatusMessage(
        `${form.name || card.name} was saved and checked again for missing information and possible matches.`,
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setBusyDraftId(null);
    }
  };

  const saveBadgeProposal = async (
    card: ReviewCard,
    form: BadgeProposalEdit,
  ) => {
    setBusyDraftId(card.id);
    setStatusMessage('');

    try {
      const requiredVisits = Number(form.requiredVisits);

      await updateBadgeDraft({
        draftId: card.id as Id<'badgeIngestDrafts'>,
        name: form.name,
        key: form.key,
        tag: form.tag,
        description: form.description,
        classification: form.classification,
        requiredVisits:
          Number.isInteger(requiredVisits) && requiredVisits > 0
            ? requiredVisits
            : 0,
        levelsEnabled: form.levelsEnabled,
        congratulationsMessages: form.congratulationsMessages,
      });
      setEditingDraftId(null);
      setStatusMessage(
        `${form.name || card.name} was saved and checked again for missing information and possible matches.`,
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setBusyDraftId(null);
    }
  };

  const currentDrafts =
    contentType === 'location' ? locationDrafts : badgeDrafts;
  const openCount = reviewableCards.filter((card) =>
    openStatuses.has(card.status),
  ).length;
  const currentCount = reviewableCards.filter(
    (card) => !isHistoryStatus(card.status),
  ).length;
  const queueCounts: Record<ReviewQueue, number> = {
    community_submissions: (locationDrafts ?? []).filter(
      (draft) =>
        draft.batch?.sourceType === 'user_submission' &&
        !isHistoryStatus(draft.status),
    ).length,
    location_imports: (locationDrafts ?? []).filter(
      (draft) =>
        draft.batch?.sourceType === 'document' &&
        !isHistoryStatus(draft.status),
    ).length,
    badge_imports: (badgeDrafts ?? []).filter(
      (draft) =>
        draft.batch?.sourceType === 'document' &&
        !isHistoryStatus(draft.status),
    ).length,
  };

  return (
    <ThemedView style={styles.panel}>
      <ThemedView
        type="backgroundElement"
        style={[styles.introCard, { borderColor: theme.border }]}
      >
        <ThemedText accessibilityRole="header" type="subtitle">
          Submissions & Imports
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Import document content or review ideas sent by trusted community
          contributors. Everything remains private until an administrator
          approves it.
        </ThemedText>
        <ThemedView style={styles.importActions}>
          {(
            [
              ['location', 'Import Locations'],
              ['badge', 'Import Badges'],
              ['mixed', 'Import Mixed Document'],
            ] as [ImportMode, string][]
          ).map(([mode, label]) => {
            const needsTagCatalog = mode === 'location' || mode === 'mixed';
            const disabled =
              isImporting ||
              (needsTagCatalog && savedTagCatalog === undefined);

            return (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityLabel={`${label} from Word`}
                disabled={disabled}
                onPress={() => void importDocument(mode)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  disabled && styles.disabled,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.buttonText}>{label}</ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
        <ThemedView style={styles.introActions}>
          {isImporting ? (
            <ActivityIndicator
              accessibilityLabel="Reading Word document"
              color={Palette.ink}
              size="small"
            />
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            Choose the importer that matches the document. Mixed import checks
            the same file for both locations and badges.
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView
        accessibilityRole="tablist"
        accessibilityLabel="Submission review queues"
        style={styles.queueTabs}>
        {(
          [
            ['community_submissions', 'Community Submissions'],
            ['location_imports', 'Location Imports'],
            ['badge_imports', 'Badge Imports'],
          ] as [ReviewQueue, string][]
        ).map(([queue, label]) => (
          <Pressable
            key={queue}
            accessibilityRole="tab"
            accessibilityState={{ selected: reviewQueue === queue }}
            onPress={() => {
              setReviewQueue(queue);
              setStatusFilter('new_entries');
              setEditingDraftId(null);
            }}
            style={({ pressed }) => [
              styles.queueTab,
              reviewQueue === queue && styles.queueTabSelected,
              pressed && styles.pressed,
            ]}>
            <ThemedText
              type="smallBold"
              style={
                reviewQueue === queue ? styles.queueTabTextSelected : undefined
              }>
              {label} ({queueCounts[queue]})
            </ThemedText>
          </Pressable>
        ))}
      </ThemedView>

      <ThemedText type="small" themeColor="textSecondary">
        {openCount} awaiting review · {currentCount} current total (History
        excluded)
      </ThemedText>

      {pendingImport && pendingSummary ? (
        <ThemedView
          type="backgroundElement"
          style={[styles.previewCard, { borderColor: theme.borderStrong }]}
        >
          <ThemedText accessibilityRole="header" type="subtitle">
            Import Preview
          </ThemedText>
          <ThemedText type="smallBold" selectable>
            {pendingImport.fileName}
          </ThemedText>
          <ThemedText>
            {pendingImport.locationDrafts.length} location{' '}
            {pendingImport.locationDrafts.length === 1
              ? 'proposal'
              : 'proposals'}{' '}
            · {pendingImport.badgeDrafts.length} badge{' '}
            {pendingImport.badgeDrafts.length === 1 ? 'proposal' : 'proposals'}
          </ThemedText>
          <ThemedView style={styles.previewStats}>
            <ThemedText type="small">
              High confidence: {pendingSummary.confidenceCounts.high}
            </ThemedText>
            <ThemedText type="small">
              Medium confidence: {pendingSummary.confidenceCounts.medium}
            </ThemedText>
            <ThemedText type="small">
              Low confidence: {pendingSummary.confidenceCounts.low}
            </ThemedText>
            <ThemedText type="small">
              With review notes: {pendingSummary.needsAttention}
            </ThemedText>
            <ThemedText type="small">
              Crossed out in source: {pendingSummary.markedComplete}
            </ThemedText>
          </ThemedView>
          {pendingSummary.previousImports > 0 ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              This filename already has {pendingSummary.previousImports}{' '}
              proposals in the queue. Check the existing batch before adding it
              again.
            </ThemedText>
          ) : null}
          {pendingImport.warnings.map((warning) => (
            <ThemedText key={warning} type="small">
              • {warning}
            </ThemedText>
          ))}
          {pendingSummary.total === 0 ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              No proposals were recognized. Choose a different document or
              importer.
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            Review this summary before adding anything. Importing creates only
            private proposals; it does not publish content.
          </ThemedText>
          <ThemedView style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isImporting || pendingSummary.total === 0}
              onPress={() => void addPendingImportToQueue()}
              style={({ pressed }) => [
                styles.primaryButton,
                (isImporting || pendingSummary.total === 0) &&
                  styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {isImporting ? (
                <ActivityIndicator color={Palette.ink} />
              ) : (
                <ThemedText style={styles.buttonText}>
                  Add to Review Queue
                </ThemedText>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isImporting}
              onPress={() => {
                setPendingImport(null);
                setStatusMessage('Import preview canceled. Nothing was added.');
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                isImporting && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.buttonText}>Cancel Preview</ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      ) : null}

      {statusMessage ? (
        <ThemedText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.statusMessage}
        >
          {statusMessage}
        </ThemedText>
      ) : null}

      {importWarnings.length > 0 ? (
        <ThemedView
          style={[styles.issueBox, { borderColor: theme.borderStrong }]}
        >
          <ThemedText type="smallBold">Import Warnings</ThemedText>
          {importWarnings.map((warning) => (
            <ThemedText key={warning} type="small">
              • {warning}
            </ThemedText>
          ))}
        </ThemedView>
      ) : null}

      <ThemedView
        accessibilityRole="tablist"
        accessibilityLabel="Proposal status filters"
        style={styles.filters}
      >
        {(
          [
            ['new_entries', 'New Entries'],
            ['possible_duplicates', 'Possible Duplicates'],
            ['suggested_edits', 'Suggested Edits'],
            ['filtered', 'Rejected by Filter'],
            ['history', 'History'],
          ] as [StatusFilter, string][]
        ).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: statusFilter === value }}
            onPress={() => setStatusFilter(value)}
            style={({ pressed }) => [
              styles.filterButton,
              statusFilter === value && styles.filterButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.buttonText}>
              {label} ({statusCounts[value]})
            </ThemedText>
          </Pressable>
        ))}
      </ThemedView>

      {currentDrafts === undefined ? (
        <ActivityIndicator accessibilityLabel="Loading import proposals" />
      ) : filteredCards.length === 0 ? (
        <ThemedView
          type="backgroundElement"
          style={[styles.emptyCard, { borderColor: theme.border }]}
        >
          <ThemedText type="smallBold">No proposals in this view.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {reviewQueue === 'community_submissions'
              ? 'New trusted-contributor ideas will appear here as soon as they are submitted.'
              : 'Import a Word document above or select another status filter.'}
          </ThemedText>
        </ThemedView>
      ) : (
        filteredCards.map((card) => {
          const isBusy = busyDraftId === card.id;
          const hasMatch = Boolean(card.matchName);
          const isFinalized = finalizedStatuses.has(card.status);
          const isSuggestedEdit =
            card.status === 'suggested_edit' ||
            card.status === 'already_published';
          const isFiltered = card.status === 'rejected_by_filter';

          return (
            <ThemedView
              key={card.id}
              type="backgroundElement"
              style={[styles.reviewCard, { borderColor: theme.border }]}
            >
              <ThemedView style={styles.cardHeadingRow}>
                <ThemedView style={styles.cardHeadingCopy}>
                  <ThemedText type="subtitle">{card.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {card.sourceName}
                    {card.sourceOrdinal ? ` · Entry ${card.sourceOrdinal}` : ''}
                  </ThemedText>
                </ThemedView>
                <ThemedView
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        isFiltered
                          ? theme.danger
                          : card.status === 'ready' ||
                              card.status === 'published'
                            ? theme.accentSoft
                            : theme.surfaceWarm,
                    },
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={isFiltered ? { color: theme.onDanger } : undefined}>
                    {statusLabels[card.status]}
                  </ThemedText>
                </ThemedView>
                {card.importConfidence ? (
                  <ThemedView
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          card.importConfidence === 'high'
                            ? theme.accentSoft
                            : theme.surfaceWarm,
                      },
                    ]}
                  >
                    <ThemedText type="smallBold">
                      {confidenceLabels[card.importConfidence]}
                    </ThemedText>
                  </ThemedView>
                ) : null}
              </ThemedView>

              {card.suggestionNotes.length > 0 ? (
                <ThemedView style={styles.suggestionBox}>
                  <ThemedText type="smallBold">
                    Automatic Suggestion Notes
                  </ThemedText>
                  {card.suggestionNotes.map((note) => (
                    <ThemedText key={note} type="small">
                      • {note}
                    </ThemedText>
                  ))}
                </ThemedView>
              ) : null}

              {card.moderationFlags.length > 0 ? (
                <ThemedView
                  style={[styles.issueBox, { borderColor: theme.danger }]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>
                    Automatic Content-Safety Filter
                  </ThemedText>
                  {card.moderationFlags.map((flag) => (
                    <ThemedText key={flag} type="small">
                      • {flag}
                    </ThemedText>
                  ))}
                  <ThemedText type="small" themeColor="textSecondary">
                    This proposal cannot be published unless an administrator
                    reopens and edits it.
                  </ThemedText>
                </ThemedView>
              ) : null}

              {card.issues.length > 0 ? (
                <ThemedView
                  style={[styles.issueBox, { borderColor: theme.borderStrong }]}
                >
                  <ThemedText type="smallBold">Review Notes</ThemedText>
                  {card.issues.map((issue) => (
                    <ThemedText key={issue} type="small">
                      • {issue}
                    </ThemedText>
                  ))}
                </ThemedView>
              ) : null}

              {editingDraftId === card.id && card.locationEdit ? (
                <IngestProposalEditor
                  key={`${card.id}-location-editor`}
                  contentType="location"
                  initialValue={card.locationEdit}
                  availableTags={availableTags}
                  saving={isBusy}
                  onCancel={() => setEditingDraftId(null)}
                  onSave={(form) => void saveLocationProposal(card, form)}
                />
              ) : editingDraftId === card.id && card.badgeEdit ? (
                <IngestProposalEditor
                  key={`${card.id}-badge-editor`}
                  contentType="badge"
                  initialValue={card.badgeEdit}
                  availableTags={availableTags}
                  saving={isBusy}
                  onCancel={() => setEditingDraftId(null)}
                  onSave={(form) => void saveBadgeProposal(card, form)}
                />
              ) : null}

              <ThemedView style={styles.comparisonRow}>
                <ThemedView
                  type="backgroundSelected"
                  style={[
                    styles.comparisonColumn,
                    { borderColor: theme.border },
                  ]}
                >
                  <ThemedText type="smallBold">PROPOSED</ThemedText>
                  {card.proposalDetails.map((detail) => {
                    const isChanged =
                      isSuggestedEdit &&
                      card.changedLabels.includes(detail.label);

                    return (
                      <ThemedView
                        key={detail.label}
                        style={[
                          styles.detailRow,
                          isChanged && styles.changedDetailRow,
                          isChanged && {
                            backgroundColor: theme.surfaceWarm,
                            borderColor: theme.accent,
                          },
                        ]}
                      >
                        <ThemedView style={styles.changedDetailHeading}>
                          <ThemedText type="smallBold">
                            {detail.label}
                          </ThemedText>
                          {isChanged ? (
                            <ThemedText
                              type="smallBold"
                              style={{ color: theme.link }}
                            >
                              Suggested Change
                            </ThemedText>
                          ) : null}
                        </ThemedView>
                        <ThemedText type="small" selectable>
                          {detail.value}
                        </ThemedText>
                      </ThemedView>
                    );
                  })}
                </ThemedView>

                {hasMatch ? (
                  <ThemedView
                    type="backgroundSelected"
                    style={[
                      styles.comparisonColumn,
                      { borderColor: theme.border },
                    ]}
                  >
                    <ThemedText type="smallBold">
                      CURRENTLY PUBLISHED
                    </ThemedText>
                    <ThemedText type="smallBold">{card.matchName}</ThemedText>
                    {card.matchDistanceMeters !== undefined &&
                    card.matchDistanceMeters > 0 ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Approximately {Math.round(card.matchDistanceMeters)}{' '}
                        meters from the proposed coordinates
                      </ThemedText>
                    ) : null}
                    {card.matchDetails.map((detail) => (
                      <ThemedView key={detail.label} style={styles.detailRow}>
                        <ThemedText type="smallBold">{detail.label}</ThemedText>
                        <ThemedText type="small" selectable>
                          {detail.value}
                        </ThemedText>
                      </ThemedView>
                    ))}
                  </ThemedView>
                ) : null}
              </ThemedView>

              <ThemedView style={styles.sourceBox}>
                <ThemedText type="smallBold">
                  {card.sourceType === 'user_submission'
                    ? 'Original Submission'
                    : 'Original Document Text'}
                </ThemedText>
                <ThemedText type="small" selectable>
                  {card.sourceText}
                </ThemedText>
              </ThemedView>

              <ThemedView style={styles.actions}>
                {isFinalized ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => performReview(card, 'reopen')}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      isBusy && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText style={styles.buttonText}>
                      {isFiltered ? 'Review Anyway' : 'Reopen'}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        expanded: editingDraftId === card.id,
                      }}
                      disabled={isBusy}
                      onPress={() =>
                        setEditingDraftId((current) =>
                          current === card.id ? null : card.id,
                        )
                      }
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        isBusy && styles.disabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText style={styles.buttonText}>
                        {editingDraftId === card.id
                          ? 'Close Editor'
                          : 'Edit Proposal'}
                      </ThemedText>
                    </Pressable>

                    {hasMatch ? (
                      <>
                        <Pressable
                          accessibilityRole="button"
                          disabled={isBusy}
                          onPress={() => performReview(card, 'keep_existing')}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            isBusy && styles.disabled,
                            pressed && styles.pressed,
                          ]}
                        >
                          <ThemedText style={styles.buttonText}>
                            Keep Existing
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={isBusy || !card.publishable}
                          onPress={() => performReview(card, 'merge_missing')}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            (isBusy || !card.publishable) && styles.disabled,
                            pressed && styles.pressed,
                          ]}
                        >
                          <ThemedText style={styles.buttonText}>
                            Add Missing Information
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={isBusy || !card.publishable}
                          onPress={() => {
                            if (confirmReplaceId === card.id) {
                              void performReview(card, 'replace_existing');
                            } else {
                              setConfirmReplaceId(card.id);
                            }
                          }}
                          style={({ pressed }) => [
                            styles.warningButton,
                            (isBusy || !card.publishable) && styles.disabled,
                            pressed && styles.pressed,
                          ]}
                        >
                          <ThemedText style={styles.warningButtonText}>
                            {confirmReplaceId === card.id
                              ? 'Confirm Replace'
                              : 'Replace Existing'}
                          </ThemedText>
                        </Pressable>
                      </>
                    ) : null}

                    <Pressable
                      accessibilityRole="button"
                      disabled={isBusy || !card.publishable}
                      onPress={() => performReview(card, 'publish_new')}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        (isBusy || !card.publishable) && styles.disabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText style={styles.buttonText}>
                        {hasMatch ? 'Create Separate' : 'Approve & Publish'}
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      disabled={isBusy}
                      onPress={() => performReview(card, 'dismiss')}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        isBusy && styles.disabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText style={styles.buttonText}>Dismiss</ThemedText>
                    </Pressable>
                  </>
                )}
              </ThemedView>

              {!card.publishable && !isFinalized ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  This proposal stays private because required information is
                  missing or invalid. Choose Edit Proposal to complete it before
                  approval.
                </ThemedText>
              ) : null}
            </ThemedView>
          );
        })
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    maxWidth: PortalContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  introCard: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  introActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
  },
  importActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  queueTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  queueTab: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  queueTabSelected: {
    backgroundColor: Palette.lightBronze,
  },
  queueTabTextSelected: {
    color: Palette.ink,
  },
  statusMessage: {
    paddingHorizontal: Spacing.one,
  },
  previewCard: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderWidth: 2,
    borderRadius: Spacing.three,
  },
  previewStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  filterButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  filterButtonSelected: {
    backgroundColor: Palette.lightBronze,
  },
  emptyCard: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  reviewCard: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  cardHeadingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardHeadingCopy: {
    flex: 1,
    minWidth: 220,
    gap: Spacing.one,
  },
  statusPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  issueBox: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  suggestionBox: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  comparisonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  comparisonColumn: {
    flex: 1,
    minWidth: 280,
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  detailRow: {
    gap: Spacing.half,
  },
  changedDetailRow: {
    padding: Spacing.two,
    borderWidth: 2,
    borderRadius: Spacing.two,
  },
  changedDetailHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sourceBox: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.lightBronze,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  warningButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.danger,
  },
  buttonText: {
    color: Palette.ink,
    textAlign: 'center',
  },
  warningButtonText: {
    color: Palette.onDanger,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
