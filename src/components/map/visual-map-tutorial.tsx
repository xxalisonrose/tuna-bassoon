import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Spotlight = {
  borderRadius: number;
  height: number;
  width: number;
  x: number;
  y: number;
};

export type VisualTutorialTargetName =
  | 'mode'
  | 'zoom'
  | 'locations'
  | 'recenter'
  | 'betaFeedback';

export type VisualTutorialTargetRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type TutorialStep = {
  description: string;
  demonstration?: 'pins' | 'pinScrub';
  scoutPose?: ScoutPose;
  showTitle?: boolean;
  spotlight: Spotlight;
  title: string;
};

type ScoutPose = 1 | 2 | 4 | 6;

type VisualMapTutorialProps = {
  betaFeedbackOnly?: boolean;
  onClose: () => void;
  onOpenPassport: () => void;
  targets?: Partial<
    Record<VisualTutorialTargetName, VisualTutorialTargetRect>
  >;
  visible: boolean;
};

const CONTROL_STEP = 62;
const TUTORIAL_PIN_SOURCES = [
  require('../../../assets/images/map-pins/historic-sites-unvisited.png'),
  require('../../../assets/images/map-pins/mystery-lore-unvisited.png'),
  require('../../../assets/images/map-pins/other-discovery-unvisited.png'),
] as const;
const SCOUT_SOURCES: Record<ScoutPose, number> = {
  1: require('../../../assets/images/tutorial/scout/scout-1.png'),
  2: require('../../../assets/images/tutorial/scout/scout-2.png'),
  4: require('../../../assets/images/tutorial/scout/scout-4.png'),
  6: require('../../../assets/images/tutorial/scout/scout-6.png'),
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function spotlightTarget(
  target: VisualTutorialTargetRect | undefined,
  fallback: Spotlight,
  padding = 6,
): Spotlight {
  return target === undefined
    ? fallback
    : {
        x: target.x - padding,
        y: target.y - padding,
        width: target.width + padding * 2,
        height: target.height + padding * 2,
        borderRadius: Math.min(
          (target.height + padding * 2) / 2,
          32,
        ),
      };
}

function PinScrubTutorialDemo() {
  const [reveal] = useState(() => new Animated.Value(0));
  const [position] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(280),
        Animated.timing(reveal, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.delay(320),
        Animated.timing(position, {
          toValue: 2,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.delay(260),
        Animated.timing(position, {
          toValue: 0,
          duration: 1_050,
          useNativeDriver: true,
        }),
        Animated.delay(260),
        Animated.timing(position, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.delay(360),
        Animated.timing(reveal, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.delay(220),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [position, reveal]);

  const fingerX = position.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [-58, 0, 58],
  });
  const panelScale = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });

  return (
    <View
      accessible
      accessibilityLabel="Example: hold overlapping pins, slide across the choices, and release on the highlighted place"
      style={styles.demo}>
      <View accessible={false} style={styles.demoCluster}>
        {TUTORIAL_PIN_SOURCES.map((source, index) => (
          <Image
            key={index}
            accessibilityIgnoresInvertColors
            source={source}
            style={[
              styles.demoClusterPin,
              { marginLeft: index === 0 ? 0 : -18 },
            ]}
          />
        ))}
      </View>

      <Animated.View
        accessible={false}
        style={[
          styles.demoFlag,
          {
            opacity: reveal,
            transform: [{ scale: panelScale }],
          },
        ]}>
        <Text style={styles.demoFlagTitle}>Hold · slide · release</Text>
        <View style={styles.demoChoices}>
          {TUTORIAL_PIN_SOURCES.map((source, index) => {
            const scale = position.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [
                index === 0 ? 1.25 : 0.82,
                index === 1 ? 1.25 : 0.82,
                index === 2 ? 1.25 : 0.82,
              ],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.demoChoice,
                  { transform: [{ scale }] },
                ]}>
                <Image
                  accessibilityIgnoresInvertColors
                  source={source}
                  style={styles.demoChoicePin}
                />
              </Animated.View>
            );
          })}
        </View>
        <View style={styles.demoFlagPointer} />
        <Animated.View
          style={[
            styles.demoFinger,
            { transform: [{ translateX: fingerX }] },
          ]}>
          <Text style={styles.demoFingerText}>☝︎</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function PinGalleryTutorialDemo() {
  return (
    <View
      accessible
      accessibilityLabel="Examples of illustrated Lorcal location pins"
      style={[styles.demo, styles.pinGalleryDemo]}>
      <View accessible={false} style={styles.pinGalleryRow}>
        {TUTORIAL_PIN_SOURCES.map((source, index) => (
          <View key={index} style={styles.pinExample}>
            <Image
              accessibilityIgnoresInvertColors
              source={source}
              style={styles.pinExampleImage}
            />
          </View>
        ))}
      </View>
      <Text style={styles.pinGalleryText}>
        Tap a pin · Read · Save · Check in nearby
      </Text>
    </View>
  );
}

export function VisualMapTutorial({
  betaFeedbackOnly = false,
  onClose,
  onOpenPassport,
  targets,
  visible,
}: VisualMapTutorialProps) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo<TutorialStep[]>(() => {
    const controlX = width - 76;
    const controlY = insets.top + 6;
    // NativeTabs uses Apple's centered floating tab bar on iOS rather than
    // dividing the full screen into three equal columns. Keep the center tab
    // fixed while pulling the outer tab targets inward to match that pill.
    const tabHorizontalInset =
      Platform.OS === 'ios'
        ? clamp(width * 0.155, 54, 64)
        : 0;
    const tabColumnWidth = (width - tabHorizontalInset * 2) / 3;
    const tabWidth = clamp(tabColumnWidth - 28, 72, 96);
    const tabHeight = 66;
    const tabBottom =
      Platform.OS === 'ios' ? 8 : insets.bottom + 4;
    const tabTop = height - tabBottom - tabHeight;
    const tabX = (index: number) =>
      tabHorizontalInset +
      tabColumnWidth * (index + 0.5) -
      tabWidth / 2;

    if (betaFeedbackOnly) {
      return [
        {
          title: 'Tell Us What You Think',
          description:
            'Found something confusing, spotted a bug, or discovered something you really liked? We’d love to hear about it! Use Beta Feedback to send your thoughts directly to the Lorcal team. Your feedback helps us make Lorcal better for everyone.',
          showTitle: true,
          spotlight: spotlightTarget(targets?.betaFeedback, {
            x: 10,
            y: height - 132,
            width: 154,
            height: 60,
            borderRadius: 30,
          }),
        },
      ];
    }

    const stepsBeforeTabs: TutorialStep[] = [
      {
        title: 'Introduction',
        description:
          'Hi! My name is Scout, and I’ll be your guide to exploring Lorcal. Lorcal turns everyday travel into an opportunity to discover the history, folklore, landmarks, and hidden stories of the places around you. I’m here to show you how everything works so you can get out there and start exploring!',
        scoutPose: 1,
        spotlight: {
          x: 12,
          y: clamp(insets.top + 82, 72, height * 0.22),
          width: Math.max(180, width - 112),
          height: clamp(height * 0.26, 170, 280),
          borderRadius: 28,
        },
      },
      {
        title: 'Explore the Map',
        description:
          'Each illustrated pin marks a place with a story waiting to be discovered! Tap any pin to read its story, save it for later, or check in when you’re nearby.',
        demonstration: 'pins',
        spotlight: {
          x: 28,
          y: clamp(height * 0.42, insets.top + 170, height - 310),
          width: Math.max(180, width - 56),
          height: 150,
          borderRadius: 28,
        },
      },
      ...(Platform.OS === 'web'
        ? []
        : [
            {
              title: 'Overlapping Pins',
              description:
                'Sometimes, you’ll see several pins overlapping on the map. No worries! Just press and hold your finger on the pins, then slide left or right to highlight the place you want to explore. Release your finger to open it.',
              demonstration: 'pinScrub' as const,
              spotlight: {
                x: 28,
                y: clamp(
                  height * 0.48,
                  insets.top + 190,
                  height - 310,
                ),
                width: Math.max(180, width - 56),
                height: 150,
                borderRadius: 28,
              },
            },
          ]),
      {
        title: 'Cyclops Mode',
        description:
          'See something interesting nearby? Tap the eye icon to switch between map modes. “Look Around” keeps you centered while you spin the map around to see what’s in every direction. Want to venture a little farther? Switch to “Explore,” where you can move the map freely, even away from your current location.',
        scoutPose: 4,
        spotlight: spotlightTarget(targets?.mode, {
          x: controlX,
          y: controlY,
          width: 64,
          height: 64,
          borderRadius: 32,
        }),
      },
      {
        title: 'Zoom',
        description:
          'Want a closer look at something? Tap the magnifying glass to bring up the zoom slider. You can also press and hold the map, then drag your finger up or down to zoom in and out quickly.',
        scoutPose: 2,
        spotlight: spotlightTarget(targets?.zoom, {
          x: controlX,
          y: controlY + CONTROL_STEP,
          width: 64,
          height: 64,
          borderRadius: 32,
        }),
      },
      {
        title: 'Browse Locations',
        description:
          'Did you know you can explore Lorcal locations all around the world? Open the location list to browse or search for a place by name. You can also filter locations by city, state, or save places to your “Want to Visit” list so you can come back to them on your next adventure!',
        scoutPose: 2,
        spotlight: spotlightTarget(targets?.locations, {
          x: controlX,
          y: controlY + CONTROL_STEP * 2,
          width: 64,
          height: 64,
          borderRadius: 32,
        }),
      },
      {
        title: 'Find Your Explorer Again',
        description:
          'Need help finding your way back? Tap the target button to recenter the map on your current location. It’s an easy way to find your bearings if you’ve wandered off while exploring!',
        spotlight: spotlightTarget(targets?.recenter, {
          x: controlX,
          y: controlY + CONTROL_STEP * 3,
          width: 64,
          height: 64,
          borderRadius: 32,
        }),
      },
    ];

    return [
      ...stepsBeforeTabs,
      {
        title: 'Return to Exploring',
        description:
          'If you ever leave the map and want to come back, just tap here! This will take you right back to exploring.',
        scoutPose: 1,
        spotlight: {
          x: tabX(0),
          y: tabTop,
          width: tabWidth,
          height: tabHeight,
          borderRadius: 28,
        },
      },
      {
        title: 'Your Passport',
        description:
          'Think of your Passport as your personal Lorcal travel journal! It’s where you’ll find the places you’ve visited, your missions, badges, Lorcoins, and avatar wardrobe. Let’s take a closer look!',
        scoutPose: 1,
        spotlight: {
          x: tabX(1),
          y: tabTop,
          width: tabWidth,
          height: tabHeight,
          borderRadius: 28,
        },
      },
    ];
  }, [
    betaFeedbackOnly,
    height,
    insets.bottom,
    insets.top,
    targets,
    width,
  ]);

  useEffect(() => {
    if (visible) {
      // A fresh start is intentional whenever the tour is replayed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex(0);
    }
  }, [visible]);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const target = {
    ...step.spotlight,
    x: clamp(step.spotlight.x, 0, Math.max(0, width - 16)),
    y: clamp(step.spotlight.y, 0, Math.max(0, height - 16)),
    width: clamp(step.spotlight.width, 16, width),
    height: clamp(step.spotlight.height, 16, height),
  };
  const cardAtTop = target.y + target.height / 2 > height / 2;
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!visible) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(
      `${step.title}. ${step.description}`,
    );
  }, [step.description, step.title, visible]);

  const close = () => {
    setStepIndex(0);
    onClose();
  };

  const openPassport = () => {
    setStepIndex(0);
    onOpenPassport();
  };

  const content = (
    <View style={styles.container}>
        <View
          pointerEvents="none"
          style={[styles.scrim, { height: target.y, left: 0, right: 0, top: 0 }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.scrim,
            {
              left: 0,
              top: target.y,
              width: target.x,
              height: target.height,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.scrim,
            {
              left: target.x + target.width,
              right: 0,
              top: target.y,
              height: target.height,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.scrim,
            { left: 0, right: 0, top: target.y + target.height, bottom: 0 },
          ]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.spotlight,
            {
              borderRadius: target.borderRadius,
              height: target.height,
              left: target.x,
              top: target.y,
              width: target.width,
            },
          ]}
        />

        <View
          style={[
            styles.card,
            cardAtTop
              ? { top: insets.top + 18 }
              : { bottom: insets.bottom + 24 },
          ]}>
          <View style={styles.progressRow}>
            <View />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip tutorial"
              hitSlop={10}
              onPress={close}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>

          {step.showTitle ? (
            <Text accessibilityRole="header" style={styles.title}>
              {step.title}
            </Text>
          ) : null}
          <View style={step.scoutPose ? styles.descriptionRow : undefined}>
            <Text
              style={[
                styles.description,
                step.scoutPose ? styles.descriptionWithScout : undefined,
              ]}>
              {step.description}
            </Text>
            {step.scoutPose ? (
              <Image
                accessibilityIgnoresInvertColors
                accessible={false}
                source={SCOUT_SOURCES[step.scoutPose]}
                style={styles.scoutImage}
              />
            ) : null}
          </View>

          {step.demonstration === 'pinScrub' ? (
            <PinScrubTutorialDemo />
          ) : null}
          {step.demonstration === 'pins' ? (
            <PinGalleryTutorialDemo />
          ) : null}

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
            ) : (
              <View />
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (isLastStep) {
                  if (betaFeedbackOnly) {
                    close();
                    return;
                  }

                  openPassport();
                  return;
                }

                setStepIndex((current) => current + 1);
              }}
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.nextButtonText}>
                {isLastStep
                  ? betaFeedbackOnly
                    ? 'Done'
                    : 'Open Passport'
                  : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return visible ? (
      <View accessibilityViewIsModal style={styles.webOverlay}>
        {content}
      </View>
    ) : null;
  }

  return (
    <Modal
      accessibilityViewIsModal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={visible}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
  },
  scrim: {
    position: 'absolute',
    backgroundColor: 'rgba(9, 14, 12, 0.78)',
  },
  spotlight: {
    position: 'absolute',
    borderColor: '#FFF4B8',
    borderWidth: 3,
    shadowColor: '#FFF4B8',
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  card: {
    position: 'absolute',
    left: 18,
    right: 18,
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
  demo: {
    height: 118,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: '#EEE6D4',
    borderColor: '#D4C5A7',
    borderRadius: 16,
    borderWidth: 1,
  },
  demoCluster: {
    height: 42,
    alignItems: 'flex-end',
    flexDirection: 'row',
    paddingBottom: 2,
  },
  demoClusterPin: {
    width: 38,
    height: 38,
    resizeMode: 'contain',
  },
  pinGalleryDemo: {
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pinGalleryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
  },
  pinExample: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    backgroundColor: '#FFFDF2',
    borderColor: '#D4C5A7',
    borderRadius: 28,
    borderWidth: 1,
  },
  pinExampleImage: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },
  pinGalleryText: {
    color: '#62503B',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  pinTapDemo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  tapPinWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapPin: {
    width: 58,
    height: 58,
    resizeMode: 'contain',
  },
  tapFinger: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#855B38',
    borderRadius: 17,
    borderWidth: 2,
  },
  tapDetails: {
    width: 164,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FFFDF2',
    borderColor: '#D4A373',
    borderRadius: 12,
    borderWidth: 2,
  },
  tapDetailsTitle: {
    color: '#2E2D25',
    fontSize: 13,
    fontWeight: '800',
  },
  tapDetailsText: {
    color: '#6B5B42',
    fontSize: 11,
    fontWeight: '600',
  },
  checkInDemo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  checkInPlace: {
    flex: 1,
    maxWidth: 145,
  },
  checkInTitle: {
    color: '#2E2D25',
    fontSize: 13,
    fontWeight: '800',
  },
  checkInDistance: {
    color: '#6B5B42',
    fontSize: 11,
    fontWeight: '600',
  },
  checkInButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 13,
    backgroundColor: '#855B38',
    borderRadius: 20,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  checkInReward: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E7F4D7',
    borderColor: '#8AA45E',
    borderRadius: 10,
    borderWidth: 1,
  },
  checkInRewardText: {
    color: '#3F5A2D',
    fontSize: 10,
    fontWeight: '800',
  },
  demoFlag: {
    position: 'absolute',
    top: 7,
    width: 230,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: '#FFFDF2',
    borderColor: '#D4A373',
    borderRadius: 14,
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  demoFlagTitle: {
    color: '#62503B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  demoChoices: {
    height: 48,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  demoChoice: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4E8C8',
    borderColor: '#E1BD70',
    borderRadius: 20,
    borderWidth: 2,
  },
  demoChoicePin: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  demoFlagPointer: {
    position: 'absolute',
    bottom: -8,
    width: 16,
    height: 16,
    backgroundColor: '#FFFDF2',
    borderRightColor: '#D4A373',
    borderRightWidth: 2,
    borderBottomColor: '#D4A373',
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  demoFinger: {
    position: 'absolute',
    bottom: -21,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#855B38',
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  demoFingerText: {
    color: '#5C3A22',
    fontSize: 22,
    lineHeight: 25,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  backButton: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  backButtonText: {
    color: '#5C4A35',
    fontSize: 16,
    fontWeight: '700',
  },
  nextButton: {
    minHeight: 48,
    minWidth: 104,
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
