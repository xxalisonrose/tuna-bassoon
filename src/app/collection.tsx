import {
    useConvexAuth,
    useQuery,
} from 'convex/react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    BottomTabInset,
    MaxContentWidth,
    Spacing,
} from '@/constants/theme';
import { api } from '../../convex/_generated/api';

export default function CollectionScreen() {
  const {
    isAuthenticated,
    isLoading: isAuthenticationLoading,
  } = useConvexAuth();

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
          accessibilityLabel="Loading stamps and badges"
          size="large"
        />

        <ThemedText themeColor="textSecondary">
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heading}>
            <ThemedText type="title">
              Your Collection
            </ThemedText>

            <ThemedText themeColor="textSecondary">
              Track your Harvard location stamps and unlock
              badges as you explore.
            </ThemedText>
          </View>

          <ThemedView
            type="backgroundElement"
            style={styles.summaryCard}>
            <View style={styles.summaryItem}>
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

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
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

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
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

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <ThemedText type="subtitle">
                Badges
              </ThemedText>

              <ThemedText
                type="small"
                themeColor="textSecondary">
                {earnedBadgeCount} of {badgeProgress.length} earned
              </ThemedText>
            </View>

            {badgeProgress.map((badge) => {
              const progressWidth =
                `${Math.round(badge.progress * 100)}%` as `${number}%`;

              return (
                <ThemedView
                  key={badge._id}
                  type="backgroundElement"
                  style={[
                    styles.badgeCard,
                    badge.earned && styles.earnedBadgeCard,
                  ]}>
                  <View style={styles.badgeHeader}>
                    <View style={styles.badgeTitleContainer}>
                      <ThemedText type="subtitle">
                        {badge.name}
                      </ThemedText>

                      <ThemedText
                        type="small"
                        themeColor="textSecondary">
                        {badge.tag}
                      </ThemedText>
                    </View>

                    {badge.earned && (
                      <View style={styles.earnedPill}>
                        <ThemedText
                          type="small"
                          style={styles.earnedPillText}>
                          Earned
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  <ThemedText themeColor="textSecondary">
                    {badge.description}
                  </ThemedText>

                  <View
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityLabel={`${badge.name} progress`}
                    accessibilityValue={{
                      min: 0,
                      max: badge.requiredVisits,
                      now: badge.completedVisits,
                      text: `${badge.completedVisits} of ${badge.requiredVisits} locations`,
                    }}
                    style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        badge.earned &&
                          styles.progressFillEarned,
                        {
                          width: progressWidth,
                        },
                      ]}
                    />
                  </View>

                  <ThemedText
                    type="small"
                    themeColor="textSecondary">
                    {badge.completedVisits} of{' '}
                    {badge.requiredVisits} locations
                  </ThemedText>
                </ThemedView>
              );
            })}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <ThemedText type="subtitle">
                Location Stamps
              </ThemedText>

              <ThemedText
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
              sortedVisits.map((visit) => (
                <ThemedView
                  key={visit._id}
                  type="backgroundElement"
                  style={styles.stampCard}>
                  <View style={styles.stampIcon}>
                    <ThemedText
                      accessible={false}
                      style={styles.stampIconText}>
                      ✓
                    </ThemedText>
                  </View>

                  <View style={styles.stampContent}>
                    <ThemedText type="subtitle">
                      {visit.locationName}
                    </ThemedText>

                    <ThemedText
                      type="small"
                      themeColor="textSecondary">
                      Collected{' '}
                      {new Date(
                        visit.visitedAt,
                      ).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </ThemedText>

                    {visit.badgeTags.length > 0 && (
                      <View style={styles.tagList}>
                        {visit.badgeTags.map((tag) => (
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
              ))
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
  earnedPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    backgroundColor: '#18864B',
    borderRadius: 999,
  },
  earnedPillText: {
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