import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BadgeArtwork } from '@/components/badge-artwork';
import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export type AwardEarnedPopupAward = {
  _id: string;
  name: string;
  description: string;
  level: number;
  levelsEnabled: boolean;
  congratulationsMessages: string[];
  imageKey?: string;
  imageUrl?: string;
};

type AwardEarnedPopupProps = {
  award: AwardEarnedPopupAward;
  isAcknowledging: boolean;
  error: string | null;
  onDismiss: () => void;
};

function selectCongratulationsMessage(
  messages: string[],
  awardId: string,
) {
  if (messages.length === 0) {
    return 'Great job!';
  }

  let hash = 0;

  for (const character of awardId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return messages[hash % messages.length];
}

export function AwardEarnedPopup({
  award,
  isAcknowledging,
  error,
  onDismiss,
}: AwardEarnedPopupProps) {
  const theme = useTheme();
  const summaryRef = useRef<View>(null);
  const heading = award.levelsEnabled
    ? 'Badge Level Earned'
    : 'Badge Earned';
  const congratulationsMessage = selectCongratulationsMessage(
    award.congratulationsMessages,
    award._id,
  );
  const summaryLabel = [
    heading + '.',
    award.name + '.',
    award.levelsEnabled ? `Level ${award.level}.` : '',
    congratulationsMessage,
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    const focusSummary = () => {
      const node = findNodeHandle(summaryRef.current);

      if (node === null) {
        AccessibilityInfo.announceForAccessibility(summaryLabel);
        return;
      }

      AccessibilityInfo.setAccessibilityFocus(node);
    };

    const timer = setTimeout(focusSummary, 250);

    return () => clearTimeout(timer);
  }, [award._id, summaryLabel]);

  return (
    <Modal
      animationType="none"
      onRequestClose={onDismiss}
      transparent
      visible>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}>
          <ThemedView
            accessibilityViewIsModal
            type="backgroundElement"
            style={styles.card}>
            <BadgeArtwork
              earned
              imageKey={award.imageKey}
              imageUrl={award.imageUrl}
              name={award.name}
              size="celebration"
            />

            <View
              ref={summaryRef}
              accessible
              accessibilityLabel={summaryLabel}
              accessibilityRole="summary"
              style={styles.summary}>
              <ThemedText
                style={[
                  styles.heading,
                  { color: theme.textSecondary },
                ]}>
                {heading}
              </ThemedText>
              <ThemedText
                style={[styles.name, { color: theme.text }]}>
                {award.name}
              </ThemedText>
              {award.levelsEnabled ? (
                <ThemedText
                  style={[
                    styles.level,
                    { color: theme.text },
                  ]}>
                  Level {award.level}
                </ThemedText>
              ) : null}
              <ThemedText
                style={[
                  styles.celebrationTitle,
                  { color: theme.text },
                ]}>
                {congratulationsMessage}
              </ThemedText>
            </View>

            {error ? (
              <Text
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
                style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityLabel="Continue"
              accessibilityRole="button"
              accessibilityState={{
                busy: isAcknowledging,
                disabled: isAcknowledging,
              }}
              disabled={isAcknowledging}
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.text },
                pressed && !isAcknowledging && styles.buttonPressed,
                isAcknowledging && styles.buttonDisabled,
              ]}>
              <Text
                style={[
                  styles.buttonText,
                  { color: theme.background },
                ]}>
                {isAcknowledging ? 'Saving...' : 'Continue'}
              </Text>
            </Pressable>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function AwardEarnedBanner({
  award,
  isAcknowledging,
  error,
  onDismiss,
}: AwardEarnedPopupProps) {
  const theme = useTheme();
  const heading = award.levelsEnabled
    ? `Level ${award.level} Earned`
    : 'Badge Earned';
  const congratulationsMessage = selectCongratulationsMessage(
    award.congratulationsMessages,
    award._id,
  );
  const announcement = [
    heading,
    award.name,
    congratulationsMessage,
    error,
  ]
    .filter(Boolean)
    .join('. ');

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);

  return (
    <SafeAreaView
      pointerEvents="box-none"
      style={styles.bannerLayer}>
      <ThemedView
        accessible
        accessibilityLabel={announcement}
        accessibilityLiveRegion="polite"
        type="backgroundElement"
        style={[
          styles.banner,
          { borderColor: theme.borderStrong },
        ]}>
        <BadgeArtwork
          earned
          imageKey={award.imageKey}
          imageUrl={award.imageUrl}
          name={award.name}
        />

        <View style={styles.bannerCopy}>
          <ThemedText
            type="smallBold"
            style={{ color: theme.textSecondary }}>
            {heading}
          </ThemedText>
          <ThemedText type="subtitle">{award.name}</ThemedText>
          <ThemedText type="small">
            {congratulationsMessage}
          </ThemedText>
          {error ? (
            <Text
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel="Dismiss badge banner"
          accessibilityRole="button"
          accessibilityState={{
            busy: isAcknowledging,
            disabled: isAcknowledging,
          }}
          disabled={isAcknowledging}
          hitSlop={Spacing.two}
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.bannerDismiss,
            pressed && styles.buttonPressed,
            isAcknowledging && styles.buttonDisabled,
          ]}>
          <ThemedText style={styles.bannerDismissText}>×</ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bannerLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 1000,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  banner: {
    width: '100%',
    maxWidth: 620,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  bannerCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  bannerDismiss: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  bannerDismissText: {
    fontSize: 28,
    lineHeight: 32,
  },
  safeArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.56)',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    alignItems: 'center',
    borderRadius: 16,
    maxWidth: 520,
    padding: Spacing.five,
    width: '100%',
  },
  summary: {
    alignItems: 'center',
    width: '100%',
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    textAlign: 'center',
  },
  name: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
    marginTop: Spacing.one,
    textAlign: 'center',
  },
  level: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    marginTop: Spacing.one,
    textAlign: 'center',
  },
  celebrationTitle: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  error: {
    color: '#B42318',
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: Spacing.four,
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    width: '100%',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
});
