import {
  useConvexAuth,
  useMutation,
  useQuery,
} from 'convex/react';
import { type Href, useRouter, useScrollToTop } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarPreview } from '@/components/avatar-preview';
import { BadgeArtwork } from '@/components/badge-artwork';
import { DraggableScrollView } from '@/components/draggable-scroll-view';
import {
  MissionDetailModal,
  type MissionDetail,
} from '@/components/mission-detail-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  Palette,
  Spacing,
} from '@/constants/theme';
import { api } from '../../../convex/_generated/api';

const avatarRoute = '/collection/avatar' as Href;

type BadgeFilter =
  | 'all'
  | 'earned'
  | 'in_progress'
  | 'available'
  | 'unavailable';

type BadgeClassificationFilter =
  | 'all'
  | 'general'
  | 'theme'
  | 'seasonal'
  | 'special_place'
  | 'mission';

type BadgeDisplayStatus =
  | 'earned'
  | 'in_progress'
  | 'available'
  | 'locked'
  | 'retired';

const badgeFilterLabels: Record<BadgeFilter, string> = {
  all: 'All',
  earned: 'Earned',
  in_progress: 'In Progress',
  available: 'Available',
  unavailable: 'Unavailable',
};

const badgeClassificationFilterLabels: Record<
  BadgeClassificationFilter,
  string
> = {
  all: 'All Types',
  general: 'General',
  theme: 'Theme',
  seasonal: 'Seasonal',
  special_place: 'Special Place',
  mission: 'Mission',
};

const badgeStatusLabels: Record<BadgeDisplayStatus, string> = {
  earned: 'Earned',
  in_progress: 'In Progress',
  available: 'Available',
  locked: 'Locked',
  retired: 'Retired',
};

const classificationLabels = {
  general: 'General',
  theme: 'Theme',
  special_place: 'Special Place',
  seasonal: 'Seasonal',
  mission: 'Mission',
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

function getBadgeSeriesCandidateName(badge: {
  name: string;
  annualSeriesId?: string;
}) {
  return badge.annualSeriesId === undefined
    ? badge.name
    : badge.name.replace(/\s+\d{4}$/, '');
}

export default function PassportScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);
  const {
    isAuthenticated,
    isLoading: isAuthenticationLoading,
  } = useConvexAuth();

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );
  const avatarProfile = useQuery(
    api.users.getMyAvatarProfile,
    isAuthenticated ? {} : 'skip',
  );

  const syncMyAwards = useMutation(api.badges.syncMyAwards);
  const hasSyncedAwards = useRef(false);
  const [badgeFilter, setBadgeFilter] =
    useState<BadgeFilter>('all');
  const [badgeClassificationFilter, setBadgeClassificationFilter] =
    useState<BadgeClassificationFilter>('all');
  const [expandedBadgeIds, setExpandedBadgeIds] = useState<
    Set<string>
  >(() => new Set());
  const [selectedMissionKey, setSelectedMissionKey] =
    useState<string | null>(null);
  const [badgeEvaluationTime] = useState(() => Date.now());

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

  const badgeCatalog = useQuery(
    api.badges.getBadgeCatalog,
    isAuthenticated ? {} : 'skip',
  );
  const badgeProgressState = useQuery(
    api.badges.getMyBadgeProgressState,
    isAuthenticated ? {} : 'skip',
  );
  const badgeProgress = useMemo(() => {
    if (
      badgeCatalog === undefined ||
      badgeProgressState === undefined
    ) {
      return undefined;
    }

    const progressByBadge = new Map(
      badgeProgressState.progress.map((record) => [
        record.badgeDefinitionId,
        record,
      ]),
    );
    const highestAwardedLevelByBadge = new Map(
      badgeProgressState.highestAwardedLevels.map((record) => [
        record.badgeDefinitionId,
        record.level,
      ]),
    );
    const now = badgeEvaluationTime;

    return badgeCatalog.map((badge) => {
      const progressRecord = progressByBadge.get(badge._id);
      const completedVisits =
        progressRecord?.completedVisits ?? 0;
      const missionBadge = badge.classification === 'mission';
      const calculatedLevel = missionBadge || badge.requiredVisits < 1
        ? 0
        : badge.levelsEnabled
          ? Math.floor(completedVisits / badge.requiredVisits)
          : completedVisits >= badge.requiredVisits
            ? 1
            : 0;
      const highestAwardedLevel =
        highestAwardedLevelByBadge.get(badge._id) ?? 0;
      const displaysLevel =
        badge.classification !== 'seasonal' &&
        (badge.levelsEnabled || highestAwardedLevel > 1);
      const currentLevel = missionBadge
        ? highestAwardedLevel
        : badge.classification === 'seasonal'
          ? highestAwardedLevel > 0 || calculatedLevel > 0
            ? 1
            : 0
          : Math.max(calculatedLevel, highestAwardedLevel);
      const earned = currentLevel > 0;
      const levelProgressVisits =
        badge.levelsEnabled && badge.requiredVisits > 0
          ? completedVisits % badge.requiredVisits
          : Math.min(completedVisits, badge.requiredVisits);
      const activeWindowRecord = badge.availabilityWindows.find(
        (window) =>
          now >= window.startsAt && now < window.endsAt,
      );
      const nextWindow = badge.availabilityWindows
        .filter((window) => window.startsAt > now)
        .sort(
          (firstWindow, secondWindow) =>
            firstWindow.startsAt - secondWindow.startsAt,
        )[0];
      const activeWindow = activeWindowRecord !== undefined;
      const available =
        !badge.retired &&
        (badge.availabilityWindows.length === 0 || activeWindow);
      const progress = missionBadge
        ? earned
          ? 1
          : 0
        : badge.requiredVisits === 0
          ? 1
          : badge.levelsEnabled
            ? levelProgressVisits / badge.requiredVisits
            : Math.min(
                completedVisits / badge.requiredVisits,
                1,
              );

      return {
        ...badge,
        completedVisits,
        currentLevel,
        displaysLevel,
        earned,
        levelProgressVisits,
        nextLevel: currentLevel + 1,
        inProgress: badge.levelsEnabled
          ? levelProgressVisits > 0
          : !missionBadge && !earned && completedVisits > 0,
        available,
        locked: !available && !badge.retired,
        activeWindow,
        activeWindowEndsAt: activeWindowRecord?.endsAt,
        nextWindowStartsAt: nextWindow?.startsAt,
        progress,
        progressPercentage: Math.round(progress * 100),
      };
    });
  }, [badgeCatalog, badgeEvaluationTime, badgeProgressState]);
  const missions = useQuery(
    api.missions.getMyMissions,
    isAuthenticated ? {} : 'skip',
  );

  if (isAuthenticationLoading) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ActivityIndicator
          accessibilityLabel="Loading your passport"
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
              Your Passport
            </ThemedText>

            <ThemedText
              themeColor="textSecondary"
              style={styles.centeredText}>
              Sign in to view your explorer, visited places, and badge
              progress.
            </ThemedText>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (
    visits === undefined ||
    badgeProgress === undefined ||
    missions === undefined ||
    currentUser === undefined ||
    avatarProfile === undefined
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
          Loading your passport...
        </ThemedText>
      </ThemedView>
    );
  }

  const sortedVisits = [...visits].sort(
    (firstVisit, secondVisit) =>
      secondVisit.visitedAt - firstVisit.visitedAt,
  );

  const collectibleBadgeProgress = badgeProgress.filter(
    (badge) => badge.classification !== 'mission' || badge.earned,
  );
  const earnedBadgeCount = collectibleBadgeProgress.filter(
    (badge) => badge.earned,
  ).length;
  const totalBadgeLevels = collectibleBadgeProgress.reduce(
    (total, badge) => total + badge.currentLevel,
    0,
  );

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

  const annualSeriesSortNames = new Map<string, string>();

  for (const badge of collectibleBadgeProgress) {
    if (badge.annualSeriesId === undefined) {
      continue;
    }

    const candidateName = getBadgeSeriesCandidateName(badge);
    const currentName = annualSeriesSortNames.get(
      badge.annualSeriesId,
    );

    if (
      currentName === undefined ||
      candidateName.localeCompare(currentName) < 0
    ) {
      annualSeriesSortNames.set(
        badge.annualSeriesId,
        candidateName,
      );
    }
  }

  const visibleBadges = collectibleBadgeProgress
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

      if (statusDifference !== 0) {
        return statusDifference;
      }

      const firstSeriesName = firstBadge.annualSeriesId === undefined
        ? firstBadge.name
        : annualSeriesSortNames.get(firstBadge.annualSeriesId) ??
          getBadgeSeriesCandidateName(firstBadge);
      const secondSeriesName = secondBadge.annualSeriesId === undefined
        ? secondBadge.name
        : annualSeriesSortNames.get(secondBadge.annualSeriesId) ??
          getBadgeSeriesCandidateName(secondBadge);
      const seriesNameDifference = firstSeriesName.localeCompare(
        secondSeriesName,
      );

      if (seriesNameDifference !== 0) {
        return seriesNameDifference;
      }

      if (
        firstBadge.annualSeriesId !== undefined &&
        firstBadge.annualSeriesId === secondBadge.annualSeriesId
      ) {
        return (
          (firstBadge.editionYear ?? 0) -
          (secondBadge.editionYear ?? 0)
        );
      }

      return firstBadge.name.localeCompare(secondBadge.name);
    });
  const activeMissions = missions.filter((mission) => !mission.completed);
  const selectedMission =
    activeMissions.find((mission) => mission.key === selectedMissionKey) ??
    null;

  const passportSummary =
    `Passport summary. ${visits.length} ` +
    `${visits.length === 1 ? 'place' : 'places'} visited. ` +
    `${earnedBadgeCount} of ${collectibleBadgeProgress.length} badges earned. ` +
    `${totalBadgeLevels} total badge ${totalBadgeLevels === 1 ? 'level' : 'levels'}.`;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <DraggableScrollView
          scrollViewRef={scrollViewRef}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.heading}>
            <ThemedText
              accessibilityRole="header"
              type="title">
              Your Passport
            </ThemedText>

            <ThemedText themeColor="textSecondary">
              Keep your explorer, discoveries, and badge progress
              together as you travel around Harvard.
            </ThemedText>
          </View>

          <ThemedView
            type="backgroundElement"
            style={styles.avatarCard}>
            <AvatarPreview
              presetId={avatarProfile.avatarPresetId}
              selection={avatarProfile.selection}
              size={184}
            />

            <View style={styles.avatarDetails}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                YOUR EXPLORER
              </ThemedText>
              <ThemedText
                accessibilityRole="header"
                type="subtitle"
                style={styles.avatarName}>
                {currentUser?.name ?? 'Harvard Explorer'}
              </ThemedText>
              <ThemedText
                themeColor="textSecondary"
                style={styles.avatarDescription}>
                Mix and match your saved clothing and accessories here.
                This same look can follow you into future avatar features.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Customize Avatar"
                onPress={() => router.push(avatarRoute)}
                style={({ pressed }) => [
                  styles.avatarButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="smallBold"
                  style={styles.avatarButtonText}>
                  Customize Avatar
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>

          <View
            accessible
            accessibilityLabel={passportSummary}>
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
                  Places
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
                  Badges
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
                  {totalBadgeLevels}
                </ThemedText>

                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.centeredText}>
                  Levels
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
                `${collectibleBadgeProgress.length} earned.`
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
                {earnedBadgeCount} of {collectibleBadgeProgress.length} earned
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

            {activeMissions.length > 0 ? (
              <View style={styles.missionSection}>
                <View
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={
                    `Mission. ${activeMissions.length} ` +
                    `${activeMissions.length === 1 ? 'mission' : 'missions'} active.`
                  }
                  style={styles.sectionHeading}>
                  <ThemedText accessible={false} type="subtitle">
                    Mission
                  </ThemedText>
                  <ThemedText
                    accessible={false}
                    type="small"
                    themeColor="textSecondary">
                    {activeMissions.length} active
                  </ThemedText>
                </View>

                {activeMissions.map((mission) => {
                  const progress =
                    mission.completedStepCount / mission.stepCount;
                  const progressWidth =
                    `${Math.round(progress * 100)}%` as `${number}%`;

                  return (
                    <Pressable
                      key={mission.key}
                      accessibilityRole="button"
                      accessibilityLabel={
                        `${mission.name}. ${mission.description} ` +
                        `${mission.completedStepCount} of ${mission.stepCount} steps complete.`
                      }
                      accessibilityHint="Opens the mission steps and rewards."
                      onPress={() => {
                        setSelectedMissionKey(mission.key);
                      }}
                      style={({ pressed }) => [
                        styles.missionPressable,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedView
                        type="backgroundElement"
                        style={styles.missionCard}>
                        <BadgeArtwork
                          imageKey={mission.rewards.badge.imageKey}
                          name={mission.rewards.badge.name}
                          size="compact"
                        />
                        <View style={styles.missionCardCopy}>
                          <View style={styles.missionCardHeading}>
                            <ThemedText type="smallBold">
                              {mission.name}
                            </ThemedText>
                            <ThemedText
                              type="small"
                              themeColor="textSecondary">
                              {mission.completedStepCount} of {mission.stepCount}
                            </ThemedText>
                          </View>
                          <ThemedText
                            type="small"
                            themeColor="textSecondary">
                            {mission.currentStep?.title ?? mission.description}
                          </ThemedText>
                          <View style={styles.progressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                { width: progressWidth },
                              ]}
                            />
                          </View>
                          <ThemedText
                            type="small"
                            themeColor="textSecondary">
                            Rewards: {mission.rewards.badge.name} badge +{' '}
                            {mission.rewards.avatarItems
                              .map((item) => item.name)
                              .join(', ')}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.missionChevron}>›</ThemedText>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <ThemedText type="small" themeColor="textSecondary">
              Showing {visibleBadges.length} of{' '}
              {collectibleBadgeProgress.length} badges
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
              const expanded = expandedBadgeIds.has(badge._id);
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
              const statusLabel =
                badge.displaysLevel && badge.currentLevel > 0
                  ? `Level ${badge.currentLevel}`
                  : badgeStatusLabels[displayStatus];
              const progressVisitCount = badge.levelsEnabled
                ? badge.levelProgressVisits
                : Math.min(
                    badge.completedVisits,
                    badge.requiredVisits,
                  );
              const compactProgressLabel =
                badge.classification === 'mission'
                  ? 'Mission complete'
                  : `${progressVisitCount} of ${badge.requiredVisits}`;
              const progressMessage = badge.classification === 'mission'
                ? 'Mission complete.'
                : badge.levelsEnabled
                ? `${progressVisitCount} of ${badge.requiredVisits} ` +
                  `${badge.requiredVisits === 1 ? 'location' : 'locations'} ` +
                  `toward Level ${badge.nextLevel}.`
                : badge.displaysLevel
                  ? `${badge.completedVisits} lifetime qualifying ` +
                    `${badge.completedVisits === 1 ? 'location' : 'locations'}.`
                : `${progressVisitCount} of ${badge.requiredVisits} ` +
                  `${badge.requiredVisits === 1 ? 'location' : 'locations'}.`;
              const availabilityMessage = badge.classification === 'mission'
                ? 'Mission completed. This badge is permanently part of your Passport.'
                : badge.retired
                ? 'No longer available. Existing levels and progress are preserved.'
                : badge.levelsEnabled && badge.earned
                  ? `Level ${badge.currentLevel} earned. Progress continues toward Level ${badge.nextLevel}.`
                  : badge.displaysLevel && badge.earned
                    ? `Level ${badge.currentLevel} earned. Additional levels are paused.`
                  : badge.earned
                    ? 'Badge earned.'
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
                `${statusLabel}. ` +
                `${availabilityMessage} ` +
                `Progress: ${progressMessage}`;

              const compactAnnouncement =
                `${badge.name}. ${statusLabel}. ` +
                `${compactProgressLabel}. ` +
                `${expanded ? 'Details expanded.' : 'Details collapsed.'}`;

              return (
                <Pressable
                  key={badge._id}
                  accessibilityRole="button"
                  accessibilityLabel={
                    expanded
                      ? `${badgeAnnouncement} Details expanded.`
                      : compactAnnouncement
                  }
                  accessibilityHint={
                    expanded
                      ? 'Collapses the badge details.'
                      : 'Expands the badge details.'
                  }
                  accessibilityState={{ expanded }}
                  onPress={() => {
                    setExpandedBadgeIds((currentIds) => {
                      const nextIds = new Set(currentIds);

                      if (nextIds.has(badge._id)) {
                        nextIds.delete(badge._id);
                      } else {
                        nextIds.add(badge._id);
                      }

                      return nextIds;
                    });
                  }}
                  style={({ pressed }) => [
                    styles.badgePressable,
                    pressed && styles.pressed,
                  ]}>
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
                    <View style={styles.badgeCompactHeader}>
                      <BadgeArtwork
                        earned={badge.earned}
                        imageKey={badge.imageKey}
                        imageUrl={badge.imageUrl}
                        name={badge.name}
                        size="compact"
                      />

                      <View style={styles.badgeCompactTitleContainer}>
                        <ThemedText style={styles.badgeCompactName}>
                          {badge.name}
                        </ThemedText>
                      </View>

                      <View
                        accessible={false}
                        importantForAccessibility="no-hide-descendants"
                        style={styles.badgeExpandIndicator}>
                        <ThemedText
                          style={styles.badgeExpandIndicatorText}>
                          {expanded ? '⌄' : '›'}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          badge.earned &&
                            !badge.levelsEnabled &&
                            styles.progressFillEarned,
                          { width: progressWidth },
                        ]}
                      />
                    </View>

                    <View style={styles.badgeProgressSummary}>
                      <ThemedText
                        type="smallBold"
                        themeColor="textSecondary">
                        {compactProgressLabel}
                      </ThemedText>

                      <ThemedText
                        type="small"
                        themeColor="textSecondary">
                        {statusLabel}
                      </ThemedText>
                    </View>

                    {expanded ? (
                      <View style={styles.badgeExpandedDetails}>
                        <View style={styles.badgeDetailMetadataRow}>
                          <ThemedView
                            type="surfaceWarm"
                            style={styles.badgeDetailChip}>
                            <ThemedText type="smallBold">
                              {classification}
                            </ThemedText>
                          </ThemedView>

                          <ThemedView
                            type="surfaceWarm"
                            style={styles.badgeDetailChip}>
                            <ThemedText type="code">
                              {badge.tag}
                            </ThemedText>
                          </ThemedView>

                          {editionText ? (
                            <ThemedView
                              type="surfaceWarm"
                              style={styles.badgeDetailChip}>
                              <ThemedText type="small">
                                {editionText}
                              </ThemedText>
                            </ThemedView>
                          ) : null}
                        </View>

                        <ThemedText themeColor="textSecondary">
                          {badge.description}
                        </ThemedText>

                        <ThemedText
                          type="small"
                          themeColor="textSecondary">
                          {availabilityMessage}
                        </ThemedText>
                      </View>
                    ) : null}
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.section}>
            <View
              accessible
              accessibilityRole="header"
              accessibilityLabel={
                `Visited places. ${visits.length} ` +
                `${
                  visits.length === 1
                    ? 'place'
                    : 'places'
                } collected.`
              }
              style={styles.sectionHeading}>
              <ThemedText
                accessible={false}
                type="subtitle">
                Visited Places
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
                  No visited places yet
                </ThemedText>

                <ThemedText
                  themeColor="textSecondary"
                  style={styles.centeredText}>
                  Visit a location on the Map tab and check in
                  while you are within 80 meters to add it here.
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

        </DraggableScrollView>
      </SafeAreaView>
      <MissionDetailModal
        mission={selectedMission as MissionDetail | null}
        onClose={() => setSelectedMissionKey(null)}
      />
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
    alignSelf: 'center',
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
    width: '100%',
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
  avatarCard: {
    alignItems: 'center',
    borderRadius: Spacing.four,
    flexDirection: 'column',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  avatarDetails: {
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
  },
  avatarName: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  avatarDescription: {
    maxWidth: 520,
    textAlign: 'center',
  },
  avatarButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Palette.lightBronze,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    marginTop: Spacing.one,
    maxWidth: 360,
    minHeight: 50,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    width: '100%',
  },
  avatarButtonText: {
    color: Palette.ink,
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
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Spacing.three,
  },
  badgePressable: {
    borderRadius: Spacing.three,
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
  missionSection: {
    borderTopColor: Palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingTop: Spacing.three,
  },
  missionPressable: {
    borderRadius: Spacing.three,
  },
  missionCard: {
    alignItems: 'center',
    borderColor: Palette.lightBronze,
    borderRadius: Spacing.three,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  missionCardCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  missionCardHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  missionChevron: {
    fontSize: 28,
    fontWeight: '700',
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
  badgeCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badgeCompactTitleContainer: {
    flex: 1,
  },
  badgeCompactName: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  badgeExpandIndicator: {
    alignItems: 'center',
    borderColor: Palette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexShrink: 0,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  badgeExpandIndicatorText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    overflow: 'hidden',
    backgroundColor: '#D8D8D8',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A51C30',
    borderRadius: 5,
  },
  progressFillEarned: {
    backgroundColor: '#18864B',
  },
  badgeProgressSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  badgeExpandedDetails: {
    borderTopColor: Palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingTop: Spacing.three,
  },
  badgeDetailMetadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  badgeDetailChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
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
