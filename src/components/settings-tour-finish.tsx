import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TutorialTargetRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type SettingsTourFinishProps = {
  onDone: () => void;
  target: TutorialTargetRect | null;
  visible: boolean;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function SettingsTourFinish({
  onDone,
  target,
  visible,
}: SettingsTourFinishProps) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    {
      description:
        'You can manage your account and location settings here, find helpful information, and send us your own location suggestions through Community Contributions once you’ve unlocked it. We love discovering new places through the Lorcal community!',
      title: 'Account and Settings',
      showTitle: false,
      scoutPose: 1,
    },
    {
      description:
        'And that’s your quick tour of Lorcal! You’re all set to start exploring, discovering new places, and collecting stories along the way. I’ll see you out there. Happy exploring!',
      title: 'Happy Exploring',
      showTitle: false,
      scoutPose: 6,
    },
  ] as const;
  const scoutSources = {
    1: require('../../assets/images/tutorial/scout/scout-1.png'),
    6: require('../../assets/images/tutorial/scout/scout-6.png'),
  } as const;

  useEffect(() => {
    if (visible) {
      // A new handoff from Passport should begin with Settings.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex(0);
    }
  }, [visible]);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(
        `${step.title}. ${step.description}`,
      );
    }
  }, [step.description, step.title, visible]);

  if (!visible || target === null) {
    return null;
  }

  const padding = 8;
  const spotlight = {
    x: clamp(target.x - padding, 6, width - 22),
    y: clamp(target.y - padding, insets.top + 4, height - 22),
    width: clamp(target.width + padding * 2, 24, width - 12),
    height: clamp(target.height + padding * 2, 24, height - 12),
  };

  return (
    <Modal
      accessibilityViewIsModal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onDone}
      statusBarTranslucent
      transparent
      visible>
      <View style={styles.container}>
        <View
          pointerEvents="none"
          style={[
            styles.scrim,
            { top: 0, right: 0, left: 0, height: spotlight.y },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.scrim,
            {
              top: spotlight.y,
              left: 0,
              width: spotlight.x,
              height: spotlight.height,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.scrim,
            {
              top: spotlight.y,
              right: 0,
              left: spotlight.x + spotlight.width,
              height: spotlight.height,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.scrim,
            {
              top: spotlight.y + spotlight.height,
              right: 0,
              bottom: 0,
              left: 0,
            },
          ]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.spotlight,
            {
              top: spotlight.y,
              left: spotlight.x,
              width: spotlight.width,
              height: spotlight.height,
            },
          ]}
        />

        <View
          style={[
            styles.card,
            { bottom: insets.bottom + 28 },
          ]}>
          {step.showTitle ? (
            <Text accessibilityRole="header" style={styles.title}>
              {step.title}
            </Text>
          ) : null}
          <View style={styles.descriptionRow}>
            <Text style={[styles.description, styles.descriptionWithScout]}>
              {step.description}
            </Text>
            <Image
              accessibilityIgnoresInvertColors
              accessible={false}
              source={scoutSources[step.scoutPose]}
              style={styles.scoutImage}
            />
          </View>

          <View style={styles.actions}>
            {stepIndex > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setStepIndex((current) => current - 1)}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            ) : <View />}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (isLastStep) {
                  onDone();
                  return;
                }

                setStepIndex((current) => current + 1);
              }}
              style={({ pressed }) => [
                styles.doneButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.doneButtonText}>
                {isLastStep ? 'Done' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrim: {
    position: 'absolute',
    backgroundColor: 'rgba(9, 14, 12, 0.78)',
  },
  spotlight: {
    position: 'absolute',
    borderColor: '#FFF4B8',
    borderRadius: 28,
    borderWidth: 3,
    shadowColor: '#FFF4B8',
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  card: {
    position: 'absolute',
    right: 18,
    left: 18,
    gap: 10,
    padding: 18,
    backgroundColor: '#FFFDF2',
    borderColor: '#D4A373',
    borderRadius: 20,
    borderWidth: 2,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
  },
  title: {
    color: '#2E2D25',
    fontSize: 23,
    fontWeight: '800',
  },
  description: {
    color: '#4F4A3E',
    fontSize: 16,
    lineHeight: 23,
  },
  descriptionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  descriptionWithScout: {
    flex: 1,
  },
  scoutImage: {
    width: 82,
    height: 112,
    resizeMode: 'contain',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#5C4937',
    fontSize: 15,
    fontWeight: '800',
  },
  doneButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: '#855B38',
    borderRadius: 24,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
