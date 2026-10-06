import {
  useConvexAuth,
  useMutation,
  useQuery,
} from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BadgeArtwork } from '@/components/badge-artwork';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';
import { api } from '../../convex/_generated/api';

type BadgeFilter =
  | 'all'
  | 'earned'
  | 'in_progress'
  | 'available'
  | 'unavailable';

type BadgeClassificationFilter =
  | 'all'
  | 'general'
  | 'seasonal'
  | 'special_place';

type BadgeDisplayStatus =
  | 'earned'
  | 'in_progress'
  | 'available'
  | 'locked'
  | 'retired';

const badgeFilterLabels: Record<BadgeFilter, string> = {
  all: 'All',
  earned: 'Earned',
  in_progress: 'In progress',
  available: 'Available',
  unavailable: 'Unavailable',
};

const badgeClassificationFilterLabels: Record<
  BadgeClassificationFilter,
  string
> = {
  all: 'All types',
  general: 'General',
  seasonal: 'Seasonal',
  special_place: 'Special place',
};

const badgeStatusLabels: Record<BadgeDisplayStatus, string> = {
  earned: 'Earned',
  in_progress: 'In progress',
  available: 'Available',
  locked: 'Locked',
  retired: 'Retired',
};

const classificationLabels = {
  general: 'General',
  special_place: 'Special place',
  seasonal: 'Seasonal',
} as const;

function formatAvailabilityTime(value: number) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CollectionScreen() {
  const {
    isAuthenticated,
    isLoading: isAuthenticationLoading,
  } = useConvexAuth();

  const syncMyAwards = useMutation(api.badges.syncMyAwards);
  const hasSyncedAwards = useRef(false);
  const [badgeFilter, setBadgeFilter] =
    useState<BadgeFilter>('all');
  const [badgeClassificationFilter, setBadgeClassificationFilter] =
    useState<BadgeClassificationFilter>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      hasSyncedAwards.current = false;
      return;
    }

    if (hasSyncedAwards.current) {
      return;
    }

    hasSyncedAwards.current = true;

    void syncMyAwards().catch(() => {
      hasSyncedAwards.current = false;
    });
  }, [isAuthenticated, syncMyAwards]);

  const visits = useQuery(
    api.visits.getMyVisits,
    isAuthenticated ? {} : 'skip',
  );

  const badgeProgress = useQuery(
    api.badges.getMyBadgeProgress,
    isAuthenticated ? {} : 'skip',
  );

  if (isAuthenticationLoading) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ActivityIndicator
          accessibilityLabel="Loading your collection"
          accessibilityRole="progressbar"
          size="large"
        />
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.signedOutSafeArea}>
          <ThemedView
            type="backgroundElement"
            style={styles.signedOutCard}>
            <ThemedText
              accessibilityRole="header"
              type="title"
              style={styles.centeredText}>
              Your Collection
            </ThemedText>

            <ThemedText
              themeColor="textSecondary"
              style={styles.centeredText}>
              Sign in from the Home tab to view your collected
              location stamps and badge progress.
            </ThemedText>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (
    visits === undefined ||
    badgeProgress === undefined
  ) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ActivityIndicator
          accessible={false}
          importantForAccessibility="no"
          size="large"
        />

        <ThemedText
          accessibilityLiveRegion="polite"
          themeColor="textSecondary">
          Loading your collection...
        </ThemedText>
      </ThemedView>
    );
  }

  const sortedVisits = [...visits].sort(
    (firstVisit, secondVisit) =>
      secondVisit.visitedAt - firstVisit.visitedAt,
  );

  const earnedBadgeCount = badgeProgress.filter(
    (badge) => badge.earned,
  ).length;

  const getBadgeDisplayStatus = (
    badge: (typeof badgeProgress)[number],
  ): BadgeDisplayStatus => {
    if (badge.earned) return 'earned';
    if (badge.retired) return 'retired';
    if (badge.locked) return 'locked';
    if (badge.inProgress) return 'in_progress';
    return 'available';
  };

  const statusPriority: Record<BadgeDisplayStatus, number> = {
    in_progress: 0,
    available: 1,
    earned: 2,
    locked: 3,
    retired: 4,
  };

  const visibleBadges = badgeProgress
    .filter((badge) => {
      if (
        badgeClassificationFilter !== 'all' &&
        badge.classification !== badgeClassificationFilter
      ) {
        return false;
      }

      const status = getBadgeDisplayStatus(badge);

      if (badgeFilter === 'all') return true;
      if (badgeFilter === 'unavailable') {
        return status === 'locked' || status === 'retired';
      }

      return status === badgeFilter;
    })
    .sort((firstBadge, secondBadge) => {
      const statusDifference =
        statusPriority[getBadgeDisplayStatus(firstBadge)] -
        statusPriority[getBadgeDisplayStatus(secondBadge)];

      return statusDifference ||
        firstBadge.name.localeCompare(secondBadge.name);
    });

  const collectionSummary =
    `Collection summary. ${visits.length} location ` +
    `${visits.length === 1 ? 'stamp' : 'stamps'} collected. ` +
    `${earnedBadgeCount} of ${badgeProgress.length} badges earned.`;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heading}>
            <ThemedText
              accessibilityRole="header"
              type="title">
              Your Collection
            </ThemedText>

            <ThemedText themeColor="textSecondary">
              Track your Harvard location stamps and unlock
              badges as you explore.
            </ThemedText>
          </View>

          <View
            accessible
            accessibilityLabel={collectionSummary}>
            <ThemedView
              type="backgroundElement"
              style={styles.summaryCard}>
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={styles.summaryItem}>
                <ThemedText type="title">
                  {visits.length}
                </ThemedText>

                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.centeredText}>
                  Stamps
                </ThemedText>
              </View>

              <View
                accessible={false}
                importantForAccessibility="no"
                style={styles.summaryDivider}
              />

              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={styles.summaryItem}>
                <ThemedText type="title">
                  {earnedBadgeCount}
                </ThemedText>

                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.centeredText}>
                  Earned
                </ThemedText>
              </View>

              <View
                accessible={false}
                importantForAccessibility="no"
                style={styles.summaryDivider}
              />

              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={styles.summaryItem}>
                <ThemedText type="title">
                  {badgeProgress.length}
                </ThemedText>

                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.centeredText}>
                  Badges
                </ThemedText>
              </View>
            </ThemedView>
          </View>

          <View style={styles.section}>
            <View
              accessible
              accessibilityRole="header"
              accessibilityLabel={
                `Badges. ${earnedBadgeCount} of ` +
                `${badgeProgress.length} earned.`
              }
              style={styles.sectionHeading}>
              <ThemedText
                accessible={false}
                type="subtitle">
                Badges
              </ThemedText>

              <ThemedText
                accessible={false}
                type="small"
                themeColor="textSecondary">
                {earnedBadgeCount} of {badgeProgress.length} earned
              </ThemedText>
            </View>

            <View style={styles.badgeFilterGroup}>
              <ThemedText type="smallBold">Type</ThemedText>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Filter badges by classification"
                style={styles.badgeFilterRow}>
                {(
                  Object.keys(
                    badgeClassificationFilterLabels,
                  ) as BadgeClassificationFilter[]
                ).map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={
                      badgeClassificationFilterLabels[value]
                    }
                    accessibilityState={{
                      selected: badgeClassificationFilter === value,
                    }}
                    onPress={() => setBadgeClassificationFilter(value)}
                    style={({ pressed }) => [
                      styles.badgeFilterButton,
                      badgeClassificationFilter === value &&
                        styles.badgeFilterButtonSelected,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="small"
                      style={
                        badgeClassificationFilter === value
                          ? styles.badgeFilterTextSelected
                          : undefined
                      }>
                      {badgeClassificationFilterLabels[value]}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.badgeFilterGroup}>
              <ThemedText type="smallBold">Status</ThemedText>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Filter badges by status"
                style={styles.badgeFilterRow}>
                {(Object.keys(badgeFilterLabels) as BadgeFilter[]).map(
                  (value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityLabel={badgeFilterLabels[value]}
                      accessibilityState={{
                        selected: badgeFilter === value,
                      }}
                      onPress={() => setBadgeFilter(value)}
                      style={({ pressed }) => [
                        styles.badgeFilterButton,
                        badgeFilter === value &&
                          styles.badgeFilterButtonSelected,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        type="small"
                        style={
                          badgeFilter === value
                            ? styles.badgeFilterTextSelected
                            : undefined
                        }>
                        {badgeFilterLabels[value]}
                      </ThemedText>
                    </Pressable>
                  ),
                )}
              </View>
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              Showing {visibleBadges.length} of {badgeProgress.length} badges
            </ThemedText>

            {visibleBadges.length === 0 ? (
              <ThemedView
                type="backgroundElement"
                style={styles.emptyCard}>
                <ThemedText type="subtitle" style={styles.centeredText}>
                  No badges in this view
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  style={styles.centeredText}>
                  Choose another type or status filter to see more badges.
                </ThemedText>
              </ThemedView>
            ) : visibleBadges.map((badge) => {
              const displayStatus = getBadgeDisplayStatus(badge);
              const progressWidth =
                `${Math.round(badge.progress * 100)}%` as `${number}%`;
              const classification =
                classificationLabels[badge.classification];
              const editionText = badge.editionYear === undefined
                ? null
                : `${badge.editionYear} edition`;
              const metadata = [classification, editionText]
                .filter(Boolean)
                .join(' · ');
              const availabilityMessage = badge.earned
                ? 'Badge earned.'
                : badge.retired
                  ? 'No longer available. Existing progress is preserved.'
                  : badge.activeWindowEndsAt !== undefined
                    ? `Available now through ${formatAvailabilityTime(badge.activeWindowEndsAt)}.`
                    : badge.locked && badge.nextWindowStartsAt !== undefined
                      ? `Available starting ${formatAvailabilityTime(badge.nextWindowStartsAt)}.`
                      : badge.locked
                        ? 'Not currently available.'
                        : badge.classification === 'seasonal'
                          ? 'Available year-round.'
                          : 'Available to earn.';

              const badgeAnnouncement =
                `${badge.name}. ` +
                `${metadata}. ` +
                `${badge.tag} badge. ` +
                `${badge.description} ` +
                `${badge.funFact ? `Fun fact: ${badge.funFact}. ` : ''}` +
                `${badge.source ? `Source: ${badge.source}. ` : ''}` +
                `${badgeStatusLabels[displayStatus]}. ` +
                `${availabilityMessage} ` +
                `Progress: ${badge.completedVisits} of ` +
                `${badge.requiredVisits} locations.`;

              return (
                <View
                  key={badge._id}
                  accessible
                  accessibilityLabel={badgeAnnouncement}>
                  <ThemedView
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    type="backgroundElement"
                    style={[
                      styles.badgeCard,
                      displayStatus === 'earned' && styles.earnedBadgeCard,
                      displayStatus === 'in_progress' && styles.inProgressBadgeCard,
                      displayStatus === 'locked' && styles.lockedBadgeCard,
                      displayStatus === 'retired' && styles.retiredBadgeCard,
                    ]}>
                    <View style={styles.badgeHeader}>
                      <BadgeArtwork
                        earned={badge.earned}
                        imageKey={badge.imageKey}
                        imageUrl={badge.imageUrl}
                        name={badge.name}
                      />

                      <View style={styles.badgeTitleContainer}>
                        <ThemedText type="subtitle">
                          {badge.name}
                        </ThemedText>

                        <ThemedText
                          type="small"
                          themeColor="textSecondary">
                          {metadata}
                        </ThemedText>

                        <ThemedText
                          type="small"
                          themeColor="textSecondary">
                          {badge.tag}
                        </ThemedText>
                      </View>

                      <View
                        style={[
                          styles.badgeStatusPill,
                          displayStatus === 'earned' && styles.badgeStatusEarned,
                          displayStatus === 'in_progress' && styles.badgeStatusInProgress,
                          displayStatus === 'available' && styles.badgeStatusAvailable,
                          displayStatus === 'locked' && styles.badgeStatusLocked,
                          displayStatus === 'retired' && styles.badgeStatusRetired,
                        ]}>
                        <ThemedText
                          type="small"
                          style={styles.badgeStatusText}>
                          {badgeStatusLabels[displayStatus]}
                        </ThemedText>
                      </View>
                    </View>

                    <ThemedText themeColor="textSecondary">
                      {badge.description}
                    </ThemedText>

                    {badge.funFact ? (
                      <View>
                        <ThemedText type="smallBold">
                          Fun fact
                        </ThemedText>
                        <ThemedText themeColor="textSecondary">
                          {badge.funFact}
                        </ThemedText>
                      </View>
                    ) : null}

                    {badge.source ? (
                      <View>
                        <ThemedText type="smallBold">
                          Source
                        </ThemedText>
                        <ThemedText
                          type="small"
                          themeColor="textSecondary">
                          {badge.source}
                        </ThemedText>
                      </View>
                    ) : null}

                    <ThemedText
                      type="smallBold"
                      themeColor="textSecondary">
                      {availabilityMessage}
                    </ThemedText>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          badge.earned && styles.progressFillEarned,
                          { width: progressWidth },
                        ]}
                      />
                    </View>

                    <ThemedText
                      type="small"
                      themeColor="textSecondary">
                      {badge.completedVisits} of{' '}
                      {badge.requiredVisits}{' '}
                      {badge.requiredVisits === 1 ? 'location' : 'locations'}
                    </ThemedText>
                  </ThemedView>
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <View
              accessible
              accessibilityRole="header"
              accessibilityLabel={
                `Location stamps. ${visits.length} ` +
                `${
                  visits.length === 1
                    ? 'stamp'
                    : 'stamps'
                } collected.`
              }
              style={styles.sectionHeading}>
              <ThemedText
                accessible={false}
                type="subtitle">
                Location Stamps
              </ThemedText>

              <ThemedText
                accessible={false}
                type="small"
                themeColor="textSecondary">
                {visits.length} collected
              </ThemedText>
            </View>

            {sortedVisits.length === 0 ? (
              <ThemedView
                type="backgroundElement"
                style={styles.emptyCard}>
                <ThemedText
                  accessibilityRole="header"
                  type="subtitle"
                  style={styles.centeredText}>
                  No stamps yet
                </ThemedText>

                <ThemedText
                  themeColor="textSecondary"
                  style={styles.centeredText}>
                  Visit a location on the Map tab and check in
                  while you are within 80 meters.
                </ThemedText>
              </ThemedView>
            ) : (
              sortedVisits.map((visit) => {
                const collectedDate = new Date(
                  visit.visitedAt,
                ).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                const uniqueBadgeTags = [
                  ...new Set(visit.badgeTags),
                ];

                const badgeCategoryText =
                  uniqueBadgeTags.length > 0
                    ? ` Badge categories: ${uniqueBadgeTags.join(', ')}.`
                    : '';

                const stampLabel =
                  `${visit.locationName}. ` +
                  `Collected ${collectedDate}.` +
                  badgeCategoryText;

                return (
                  <View
                    key={visit._id}
                    accessible
                    accessibilityLabel={stampLabel}>
                    <ThemedView
                      type="backgroundElement"
                      style={styles.stampCard}>
                      <View
                        accessible={false}
                        importantForAccessibility="no-hide-descendants"
                        style={styles.stampIcon}>
                        <ThemedText
                          style={styles.stampIconText}>
                          ✓
                        </ThemedText>
                      </View>

                      <View
                        accessible={false}
                        importantForAccessibility="no-hide-descendants"
                        style={styles.stampContent}>
                        <ThemedText type="subtitle">
                          {visit.locationName}
                        </ThemedText>

                        <ThemedText
                          type="small"
                          themeColor="textSecondary">
                          Collected {collectedDate}
                        </ThemedText>

                        {uniqueBadgeTags.length > 0 && (
                          <View style={styles.tagList}>
                            {uniqueBadgeTags.map((tag) => (
                              <View
                                key={tag}
                                style={styles.tagChip}>
                                <ThemedText
                                  type="small"
                                  style={styles.tagChipText}>
                                  {tag}
                                </ThemedText>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </ThemedView>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  signedOutSafeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  scrollContent: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  heading: {
    gap: Spacing.two,
  },
  signedOutCard: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  centeredText: {
    textAlign: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 48,
    backgroundColor: '#999999',
    opacity: 0.45,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  badgeCard: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Spacing.four,
  },
  earnedBadgeCard: {
    borderColor: '#18864B',
  },
  inProgressBadgeCard: {
    borderColor: '#A51C30',
  },
  lockedBadgeCard: {
    borderColor: '#667085',
  },
  retiredBadgeCard: {
    borderColor: '#912018',
  },
  badgeFilterGroup: {
    gap: Spacing.one,
  },
  badgeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  badgeFilterButton: {
    alignItems: 'center',
    backgroundColor: '#E0E1E6',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  badgeFilterButtonSelected: {
    backgroundColor: '#A51C30',
  },
  badgeFilterTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  badgeTitleContainer: {
    flex: 1,
    gap: Spacing.one,
  },
  badgeStatusPill: {
    borderRadius: 999,
    flexShrink: 0,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  badgeStatusEarned: {
    backgroundColor: '#18864B',
  },
  badgeStatusInProgress: {
    backgroundColor: '#A51C30',
  },
  badgeStatusAvailable: {
    backgroundColor: '#175CD3',
  },
  badgeStatusLocked: {
    backgroundColor: '#667085',
  },
  badgeStatusRetired: {
    backgroundColor: '#912018',
  },
  badgeStatusText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressTrack: {
    width: '100%',
    height: 10,
    overflow: 'hidden',
    backgroundColor: '#D8D8D8',
    borderRadius: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A51C30',
    borderRadius: 5,
  },
  progressFillEarned: {
    backgroundColor: '#18864B',
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  stampCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  stampIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18864B',
    borderRadius: 21,
  },
  stampIconText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  stampContent: {
    flex: 1,
    gap: Spacing.one,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  tagChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    backgroundColor: '#FFF2CC',
    borderRadius: 999,
  },
  tagChipText: {
    color: '#6B3E00',
    fontWeight: '600',
  },
});
