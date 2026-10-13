import { useMutation, useQuery } from 'convex/react';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';

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
} from '@/lib/content-ingest';
import { pickAndReadWordDocument } from '@/lib/word-document-import';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type IngestContentType = 'location' | 'badge';
type ReviewStatus =
  | 'ready'
  | 'needs_attention'
  | 'possible_duplicate'
  | 'already_published'
  | 'published'
  | 'kept_existing'
  | 'dismissed';
type StatusFilter = ReviewStatus | 'open' | 'all';

type ReviewCard = {
  id: string;
  contentType: IngestContentType;
  name: string;
  key: string;
  status: ReviewStatus;
  issues: string[];
  sourceName: string;
  sourceOrdinal?: number;
  sourceText: string;
  matchName?: string;
  matchKey?: string;
  matchDistanceMeters?: number;
  proposalDetails: { label: string; value: string }[];
  matchDetails: { label: string; value: string }[];
  publishable: boolean;
  locationEdit?: LocationProposalEdit;
  badgeEdit?: BadgeProposalEdit;
};

const statusLabels: Record<ReviewStatus, string> = {
  ready: 'Ready to Review',
  needs_attention: 'Needs Attention',
  possible_duplicate: 'Possible Duplicate',
  already_published: 'Already Published',
  published: 'Published',
  kept_existing: 'Kept Existing',
  dismissed: 'Dismissed',
};

const openStatuses = new Set<ReviewStatus>([
  'ready',
  'needs_attention',
  'possible_duplicate',
  'already_published',
]);

const finalizedStatuses = new Set<ReviewStatus>([
  'published',
  'kept_existing',
  'dismissed',
]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

export function IngestReviewPanel({
  contentType,
  visible,
}: {
  contentType: IngestContentType;
  visible: boolean;
}) {
  const theme = useTheme();
  const locationDrafts = useQuery(
    api.adminIngest.getLocationDrafts,
    visible && contentType === 'location' ? {} : 'skip',
  );
  const badgeDrafts = useQuery(
    api.adminIngest.getBadgeDrafts,
    visible && contentType === 'badge' ? {} : 'skip',
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
  const stageLocationDrafts = useMutation(
    api.adminIngest.stageLocationDrafts,
  );
  const stageBadgeDrafts = useMutation(api.adminIngest.stageBadgeDrafts);
  const reviewLocationDraft = useMutation(
    api.adminIngest.reviewLocationDraft,
  );
  const reviewBadgeDraft = useMutation(api.adminIngest.reviewBadgeDraft);
  const updateLocationDraft = useMutation(
    api.adminIngest.updateLocationDraft,
  );
  const updateBadgeDraft = useMutation(api.adminIngest.updateBadgeDraft);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [isImporting, setIsImporting] = useState(false);
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
          issues: draft.issues,
          sourceName: draft.batch?.sourceName ?? 'Imported document',
          sourceOrdinal: draft.sourceOrdinal,
          sourceText: draft.sourceText,
          matchName: match?.name,
          matchKey: match?.key,
          matchDistanceMeters: draft.matchDistanceMeters,
          proposalDetails: [
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
          ],
          matchDetails: match
            ? [
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
        issues: draft.issues,
        sourceName: draft.batch?.sourceName ?? 'Imported document',
        sourceOrdinal: draft.sourceOrdinal,
        sourceText: draft.sourceText,
        matchName: match?.name,
        matchKey: match?.key,
        proposalDetails: [
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

  const filteredCards = useMemo(
    () =>
      cards.filter((card) => {
        if (statusFilter === 'all') {
          return true;
        }
        if (statusFilter === 'open') {
          return openStatuses.has(card.status);
        }
        return card.status === statusFilter;
      }),
    [cards, statusFilter],
  );
  const importWarnings = useMemo(() => {
    const drafts = contentType === 'location' ? locationDrafts : badgeDrafts;

    return Array.from(
      new Set(
        (drafts ?? []).flatMap((draft) => draft.batch?.warnings ?? []),
      ),
    );
  }, [badgeDrafts, contentType, locationDrafts]);
  const availableTags = useMemo(
    () =>
      Array.from(
        new Set([
          ...(adminLocations ?? []).flatMap((location) => location.badges),
          ...(adminBadges ?? []).map((badge) => badge.tag),
        ]),
      ).sort((left, right) => left.localeCompare(right)),
    [adminBadges, adminLocations],
  );

  if (!visible) {
    return null;
  }

  const importDocument = async () => {
    setIsImporting(true);
    setStatusMessage('');

    try {
      const document = await pickAndReadWordDocument();

      if (!document) {
        return;
      }

      if (contentType === 'location') {
        const parsed = parseLocationWordDocument(document.paragraphs);
        const batchId = await createBatch({
          contentType,
          sourceType: 'document',
          sourceName: document.fileName,
          warnings: parsed.warnings,
        });

        for (const drafts of chunkValues(parsed.drafts, 30)) {
          await stageLocationDrafts({ batchId, drafts });
        }

        setStatusMessage(
          `${parsed.drafts.length} location proposals were added to the private review queue. Nothing was published.`,
        );
      } else {
        const parsed = parseBadgeWordDocument(document.paragraphs);
        const batchId = await createBatch({
          contentType,
          sourceType: 'document',
          sourceName: document.fileName,
          warnings: parsed.warnings,
        });

        for (const drafts of chunkValues(parsed.drafts, 30)) {
          await stageBadgeDrafts({ batchId, drafts });
        }

        setStatusMessage(
          `${parsed.drafts.length} badge proposals were added to the private review queue. Nothing was published.`,
        );
      }
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

  const currentDrafts = contentType === 'location' ? locationDrafts : badgeDrafts;
  const openCount = cards.filter((card) => openStatuses.has(card.status)).length;

  return (
    <ThemedView style={styles.panel}>
      <ThemedView
        type="backgroundElement"
        style={[styles.introCard, { borderColor: theme.border }]}>
        <ThemedText accessibilityRole="header" type="subtitle">
          Import & Review {contentType === 'location' ? 'Locations' : 'Badges'}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Upload a Word document to create private proposals. Review each one
          before it can appear in the app. This queue is also designed to hold
          future user-submitted ideas.
        </ThemedText>
        <ThemedView style={styles.introActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Import ${contentType === 'location' ? 'locations' : 'badges'} from Word`}
            disabled={isImporting}
            onPress={importDocument}
            style={({ pressed }) => [
              styles.primaryButton,
              isImporting && styles.disabled,
              pressed && styles.pressed,
            ]}>
            {isImporting ? (
              <ActivityIndicator color={Palette.ink} />
            ) : (
              <ThemedText style={styles.buttonText}>
                Import Word Document
              </ThemedText>
            )}
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary">
            {openCount} awaiting review · {cards.length} total proposals
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {statusMessage ? (
        <ThemedText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.statusMessage}>
          {statusMessage}
        </ThemedText>
      ) : null}

      {importWarnings.length > 0 ? (
        <ThemedView
          style={[styles.issueBox, { borderColor: theme.borderStrong }]}>
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
        style={styles.filters}>
        {(
          [
            ['open', 'Open'],
            ['needs_attention', 'Needs Attention'],
            ['possible_duplicate', 'Possible Duplicates'],
            ['already_published', 'Already Published'],
            ['published', 'Published'],
            ['all', 'All'],
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
            ]}>
            <ThemedText style={styles.buttonText}>{label}</ThemedText>
          </Pressable>
        ))}
      </ThemedView>

      {currentDrafts === undefined ? (
        <ActivityIndicator accessibilityLabel="Loading import proposals" />
      ) : filteredCards.length === 0 ? (
        <ThemedView
          type="backgroundElement"
          style={[styles.emptyCard, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">No proposals in this view.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Import a Word document or select another status filter.
          </ThemedText>
        </ThemedView>
      ) : (
        filteredCards.map((card) => {
          const isBusy = busyDraftId === card.id;
          const hasMatch = Boolean(card.matchName);
          const isFinalized = finalizedStatuses.has(card.status);

          return (
            <ThemedView
              key={card.id}
              type="backgroundElement"
              style={[styles.reviewCard, { borderColor: theme.border }]}>
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
                        card.status === 'ready' || card.status === 'published'
                          ? theme.accentSoft
                          : theme.surfaceWarm,
                    },
                  ]}>
                  <ThemedText type="smallBold">
                    {statusLabels[card.status]}
                  </ThemedText>
                </ThemedView>
              </ThemedView>

              {card.issues.length > 0 ? (
                <ThemedView
                  style={[styles.issueBox, { borderColor: theme.borderStrong }]}>
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
                  style={[styles.comparisonColumn, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold">PROPOSED</ThemedText>
                  {card.proposalDetails.map((detail) => (
                    <ThemedView key={detail.label} style={styles.detailRow}>
                      <ThemedText type="smallBold">{detail.label}</ThemedText>
                      <ThemedText type="small" selectable>
                        {detail.value}
                      </ThemedText>
                    </ThemedView>
                  ))}
                </ThemedView>

                {hasMatch ? (
                  <ThemedView
                    type="backgroundSelected"
                    style={[styles.comparisonColumn, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold">CURRENTLY PUBLISHED</ThemedText>
                    <ThemedText type="smallBold">{card.matchName}</ThemedText>
                    {card.matchDistanceMeters !== undefined &&
                    card.matchDistanceMeters > 0 ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Approximately {Math.round(card.matchDistanceMeters)} meters
                        from the proposed coordinates
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
                <ThemedText type="smallBold">Original Document Text</ThemedText>
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
                    ]}>
                    <ThemedText style={styles.buttonText}>Reopen</ThemedText>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: editingDraftId === card.id }}
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
                      ]}>
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
                          ]}>
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
                          ]}>
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
                          ]}>
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
                      ]}>
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
                      ]}>
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
  statusMessage: {
    paddingHorizontal: Spacing.one,
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
