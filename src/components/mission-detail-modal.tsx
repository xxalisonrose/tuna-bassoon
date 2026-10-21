import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BadgeArtwork } from '@/components/badge-artwork';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';

export type MissionDetail = {
  key: string;
  name: string;
  description: string;
  completedStepCount: number;
  stepCount: number;
  steps: {
    key: string;
    title: string;
    summary: string;
    details: string;
    completed: boolean;
    currentValue: number;
    targetValue: number;
    progressLabel: string;
  }[];
  currentStep: {
    key: string;
    title: string;
    summary: string;
    details: string;
    completed: boolean;
    currentValue: number;
    targetValue: number;
    progressLabel: string;
  } | null;
  rewards: {
    badge: {
      name: string;
      description: string;
      imageKey: string;
    };
    avatarItems: readonly {
      id: string;
      name: string;
      slot: string;
    }[];
  };
};

type MissionDetailModalProps = {
  mission: MissionDetail | null;
  onClose: () => void;
};

export function MissionDetailModal({
  mission,
  onClose,
}: MissionDetailModalProps) {
  if (mission === null) {
    return null;
  }

  const currentStep = mission.currentStep;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator>
          <ThemedView
            accessibilityViewIsModal
            type="backgroundElement"
            style={styles.card}>
            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <ThemedText
                  type="smallBold"
                  themeColor="textSecondary">
                  MISSION
                </ThemedText>
                <ThemedText accessibilityRole="header" type="title">
                  {mission.name}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {mission.description}
                </ThemedText>
              </View>
              <BadgeArtwork
                imageKey={mission.rewards.badge.imageKey}
                name={mission.rewards.badge.name}
              />
            </View>

            <View style={styles.stepList}>
              {mission.steps.map((step, index) => {
                const active = currentStep?.key === step.key;

                return (
                  <ThemedView
                    key={step.key}
                    type={active ? 'backgroundSelected' : 'surfaceWarm'}
                    style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <ThemedText type="smallBold">
                        {step.completed ? '✓' : index + 1}
                      </ThemedText>
                    </View>
                    <View style={styles.stepCopy}>
                      <View style={styles.stepHeadingRow}>
                        <ThemedText type="smallBold">{step.title}</ThemedText>
                        <ThemedText
                          type="smallBold"
                          themeColor="textSecondary">
                          {step.progressLabel}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {step.summary}
                      </ThemedText>
                    </View>
                  </ThemedView>
                );
              })}
            </View>

            {currentStep ? (
              <ThemedView type="surfaceWarm" style={styles.currentStepCard}>
                <ThemedText type="smallBold">
                  Next Goal
                </ThemedText>
                <ThemedText accessibilityRole="header" type="subtitle">
                  {currentStep.title}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {currentStep.details}
                </ThemedText>
                <ThemedText type="smallBold">
                  Current progress: {currentStep.progressLabel}
                </ThemedText>
              </ThemedView>
            ) : null}

            <ThemedText type="small" themeColor="textSecondary">
              Mission progress updates automatically when you complete these
              activities in Lorcal. The goals can be completed in any order.
            </ThemedText>

            <View style={styles.rewardSection}>
              <ThemedText accessibilityRole="header" type="subtitle">
                Rewards
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Badge: {mission.rewards.badge.name}
              </ThemedText>
              {mission.rewards.avatarItems.map((item) => (
                <ThemedText key={item.id} themeColor="textSecondary">
                  {item.slot}: {item.name}
                </ThemedText>
              ))}
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.buttonText}>
                  Close
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'rgba(20, 24, 18, 0.72)',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    alignSelf: 'center',
    borderRadius: Spacing.four,
    gap: Spacing.four,
    maxWidth: 680,
    padding: Spacing.four,
    width: '100%',
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  headingCopy: {
    flex: 1,
    gap: Spacing.one,
    minWidth: 230,
  },
  stepList: {
    gap: Spacing.two,
  },
  stepRow: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: Palette.teaGreen,
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  stepCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  stepHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  currentStepCard: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  rewardSection: {
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.teaGreen,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 100,
    paddingHorizontal: Spacing.three,
  },
  buttonText: {
    color: Palette.ink,
  },
  pressed: {
    opacity: 0.76,
  },
});
