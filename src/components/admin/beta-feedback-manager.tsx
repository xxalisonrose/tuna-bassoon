import { useMutation, useQuery } from 'convex/react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, PortalContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../../convex/_generated/api';

type FeedbackFilter = 'new' | 'reviewed' | 'all';

const filterLabels: Record<FeedbackFilter, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  all: 'All',
};

function formatSubmittedAt(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function BetaFeedbackManager({ visible }: { visible: boolean }) {
  const theme = useTheme();
  const feedback = useQuery(
    api.betaFeedback.listForAdmin,
    visible ? {} : 'skip',
  );
  const setReviewed = useMutation(api.betaFeedback.setReviewed);
  const [filter, setFilter] = useState<FeedbackFilter>('new');
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filteredFeedback = useMemo(
    () =>
      (feedback ?? []).filter(
        (entry) => filter === 'all' || entry.status === filter,
      ),
    [feedback, filter],
  );

  if (!visible) {
    return null;
  }

  const changeReviewedStatus = async (
    feedbackId: (typeof filteredFeedback)[number]['_id'],
    reviewed: boolean,
  ) => {
    setChangingId(feedbackId);
    setError(null);

    try {
      await setReviewed({ feedbackId, reviewed });
    } catch {
      setError('That feedback status could not be updated. Try again.');
    } finally {
      setChangingId(null);
    }
  };

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.container, { borderColor: theme.border }]}
    >
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <ThemedText accessibilityRole="header" type="title">
            Beta Feedback
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Private notes submitted by beta testers from the map. Mark a note
            reviewed once it has been discussed or added to the project plan.
          </ThemedText>
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary">
          {feedback?.length ?? 0} total
        </ThemedText>
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Filter beta feedback"
        style={styles.filters}
      >
        {(Object.keys(filterLabels) as FeedbackFilter[]).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected: filter === value }}
            onPress={() => setFilter(value)}
            style={({ pressed }) => [
              styles.filterButton,
              filter === value && styles.filterButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="smallBold"
              style={filter === value ? styles.filterTextSelected : undefined}
            >
              {filterLabels[value]}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {error ? (
        <ThemedText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.errorText}
        >
          {error}
        </ThemedText>
      ) : null}

      {feedback === undefined ? (
        <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel="Loading beta feedback" />
          <ThemedText themeColor="textSecondary">
            Loading feedback...
          </ThemedText>
        </View>
      ) : filteredFeedback.length === 0 ? (
        <ThemedView type="backgroundSelected" style={styles.emptyCard}>
          <ThemedText type="subtitle">
            {filter === 'new'
              ? 'No new feedback'
              : filter === 'reviewed'
                ? 'No reviewed feedback yet'
                : 'No beta feedback yet'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {filter === 'new'
              ? 'Everything submitted so far has been reviewed.'
              : 'Tester notes will appear here after they are submitted from the map.'}
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.list}>
          {filteredFeedback.map((entry) => {
            const changing = changingId === entry._id;
            const testerLabel =
              entry.testerName ?? entry.testerEmail ?? 'Beta tester';

            return (
              <ThemedView
                key={entry._id}
                type={
                  entry.status === 'new' ? 'backgroundSelected' : 'background'
                }
                style={[styles.feedbackCard, { borderColor: theme.border }]}
              >
                <View style={styles.feedbackHeader}>
                  <View style={styles.testerDetails}>
                    <View style={styles.testerNameRow}>
                      <ThemedText type="subtitle">{testerLabel}</ThemedText>
                      <View
                        style={[
                          styles.statusBadge,
                          entry.status === 'reviewed' &&
                            styles.statusBadgeReviewed,
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={styles.statusBadgeText}
                        >
                          {entry.status === 'new' ? 'New' : 'Reviewed'}
                        </ThemedText>
                      </View>
                    </View>
                    {entry.testerEmail && entry.testerEmail !== testerLabel ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {entry.testerEmail}
                      </ThemedText>
                    ) : null}
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatSubmittedAt(entry.submittedAt)} ·{' '}
                      {entry.sourcePlatform} · {entry.buildProfile}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText style={styles.message}>{entry.message}</ThemedText>

                <Pressable
                  accessibilityRole="button"
                  disabled={changingId !== null}
                  onPress={() =>
                    void changeReviewedStatus(entry._id, entry.status === 'new')
                  }
                  style={({ pressed }) => [
                    entry.status === 'new'
                      ? styles.primaryButton
                      : styles.secondaryButton,
                    changingId !== null && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {changing ? (
                    <ActivityIndicator
                      color={
                        entry.status === 'new' ? Palette.paper : theme.text
                      }
                    />
                  ) : (
                    <ThemedText
                      type="smallBold"
                      style={
                        entry.status === 'new'
                          ? styles.primaryButtonText
                          : undefined
                      }
                    >
                      {entry.status === 'new'
                        ? 'Mark Reviewed'
                        : 'Reopen as New'}
                    </ThemedText>
                  )}
                </Pressable>
              </ThemedView>
            );
          })}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.three,
    maxWidth: PortalContentWidth,
    padding: Spacing.four,
    width: '100%',
  },
  heading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  headingCopy: {
    flex: 1,
    gap: Spacing.one,
    minWidth: 240,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterButton: {
    borderColor: Palette.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  filterButtonSelected: {
    backgroundColor: Palette.lightBronze,
    borderColor: Palette.bronzeDeep,
  },
  filterTextSelected: {
    color: Palette.ink,
  },
  loading: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  emptyCard: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    padding: Spacing.four,
  },
  list: {
    gap: Spacing.three,
  },
  feedbackCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  feedbackHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testerDetails: {
    flex: 1,
    gap: Spacing.half,
  },
  testerNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statusBadge: {
    backgroundColor: Palette.danger,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  statusBadgeReviewed: {
    backgroundColor: Palette.teaGreen,
  },
  statusBadgeText: {
    color: Palette.paper,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Palette.bronzeDeep,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 150,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  primaryButtonText: {
    color: Palette.paper,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Palette.beige,
    borderColor: Palette.borderStrong,
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 150,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  errorText: {
    color: Palette.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
