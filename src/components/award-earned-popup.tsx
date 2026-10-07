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
  imageKey?: string;
  imageUrl?: string;
};

type AwardEarnedPopupProps = {
  award: AwardEarnedPopupAward;
  isAcknowledging: boolean;
  error: string | null;
  onDismiss: () => void;
};

export function AwardEarnedPopup({
  award,
  isAcknowledging,
  error,
  onDismiss,
}: AwardEarnedPopupProps) {
  const theme = useTheme();
  const summaryRef = useRef<View>(null);
  const heading = award.levelsEnabled
    ? 'Badge level earned'
    : 'Badge earned';
  const summaryLabel = [
    heading + '.',
    award.name + '.',
    award.levelsEnabled ? `Level ${award.level}.` : '',
    award.description,
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
              {award.description ? (
                <ThemedText
                  style={[
                    styles.description,
                    { color: theme.textSecondary },
                  ]}>
                  {award.description}
                </ThemedText>
              ) : null}
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

const styles = StyleSheet.create({
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
  description: {
    fontSize: 17,
    lineHeight: 25,
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
