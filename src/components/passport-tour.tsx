import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type PassportTourTargetRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type PassportTourProps = {
  onClose: () => void;
  onOpenSettings: () => void;
  target: PassportTourTargetRect | null;
  visible: boolean;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

const passportFeatures = [
  {
    label: 'Visited Locations',
    description:
      'Take a look back at all the places you’ve checked in to and the stories you’ve discovered.',
  },
  {
    label: 'Missions',
    description:
      'See what missions are available and keep track of your progress.',
  },
  {
    label: 'Badges',
    description:
      'Collect badges as you explore, discover new places, and learn something along the way.',
  },
  {
    label: 'Lorcoins',
    description:
      'Check your balance and see the Lorcoins you’ve earned through your adventures.',
  },
  {
    label: 'Wardrobe',
    description:
      'Give your explorer a personal touch! Mix and match outfits and accessories to create your own look.',
  },
] as const;

export function PassportTour({
  onClose,
  onOpenSettings,
  target,
  visible,
}: PassportTourProps) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      // Each trip from the map starts the Passport walkthrough fresh.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex(0);
    }
  }, [visible]);

  const selectedFeature =
    stepIndex === 0 ? null : passportFeatures[stepIndex - 1];
  const isLastStep = stepIndex === passportFeatures.length;

  useEffect(() => {
    if (!visible) {
      return;
    }

    const announcement = selectedFeature === null
      ? 'Welcome to your Passport. This is where all your exploration progress comes together.'
      : `${selectedFeature.label}. ${selectedFeature.description}`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [selectedFeature, visible]);

  if (!visible || target === null) {
    return null;
  }

  const padding = 8;
  const spotlight = {
    x: clamp(target.x - padding, 6, width - 22),
    y: clamp(target.y - padding, insets.top + 4, height - 22),
    width: clamp(target.width + padding * 2, 24, width - 12),
    height: clamp(
      target.height + padding * 2,
      24,
      height - insets.top - insets.bottom - 36,
    ),
  };
  const cardAtTop = spotlight.y + spotlight.height / 2 > height / 2;

  return (
    <Modal
      accessibilityViewIsModal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onClose}
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
            cardAtTop
              ? { top: insets.top + 18 }
              : { bottom: insets.bottom + 28 },
          ]}>
          <View style={styles.progressRow}>
            <View />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip the rest of the tutorial"
              hitSlop={10}
              onPress={onClose}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>

          <Text style={styles.description}>
            {selectedFeature === null
              ? 'Welcome to your Passport! This is where all your exploration progress comes together. Here’s what you’ll find:'
              : selectedFeature.description}
          </Text>

          <View
            accessible
            accessibilityLabel="Passport sections"
            style={styles.featureList}>
            {passportFeatures.map((feature, index) => {
              const selected = stepIndex === index + 1;

              return (
                <View
                  key={feature.label}
                  accessible={false}
                  style={[
                    styles.featureRow,
                    selected && styles.featureRowSelected,
                  ]}>
                  <Text
                    style={[
                      styles.featureBullet,
                      selected && styles.featureTextSelected,
                    ]}>
                    {selected ? '●' : '○'}
                  </Text>
                  <Text
                    style={[
                      styles.featureLabel,
                      selected && styles.featureTextSelected,
                    ]}>
                    {feature.label}
                  </Text>
                </View>
              );
            })}
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
                  onOpenSettings();
                  return;
                }

                setStepIndex((current) => current + 1);
              }}
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.nextButtonText}>
                {isLastStep ? 'Open Settings' : 'Next'}
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
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skipText: {
    color: '#77573B',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  description: {
    color: '#4F4A3E',
    fontSize: 16,
    lineHeight: 23,
  },
  featureList: {
    gap: 6,
    padding: 10,
    backgroundColor: '#EEE6D4',
    borderColor: '#D4C5A7',
    borderRadius: 14,
    borderWidth: 1,
  },
  featureRow: {
    minHeight: 32,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  featureRowSelected: {
    backgroundColor: '#855B38',
  },
  featureBullet: {
    color: '#855B38',
    fontSize: 15,
    fontWeight: '900',
  },
  featureLabel: {
    color: '#4F4A3E',
    fontSize: 14,
    fontWeight: '800',
  },
  featureTextSelected: {
    color: '#FFFFFF',
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
  nextButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: '#855B38',
    borderRadius: 24,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
