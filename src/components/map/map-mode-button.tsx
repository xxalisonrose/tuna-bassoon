import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type MapInteractionMode = 'look' | 'explore';

type MapModeButtonProps = {
  bottom?: number;
  compassActive: boolean;
  mode: MapInteractionMode;
  northArrowRotation: Animated.Value;
  onPress: () => void;
  right?: number;
  top?: number;
};

export function MapModeButton({
  bottom,
  compassActive,
  mode,
  northArrowRotation,
  onPress,
  right = 18,
  top,
}: MapModeButtonProps) {
  const [pupilOffset] = useState(
    () => new Animated.Value(0),
  );
  const [compassOpacity] = useState(
    () => new Animated.Value(0),
  );

  const northRotation = northArrowRotation.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

  useEffect(() => {
    if (mode === 'look') {
      pupilOffset.stopAnimation();
      pupilOffset.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pupilOffset, {
          toValue: -5,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pupilOffset, {
          toValue: 5,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pupilOffset, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [mode, pupilOffset]);

  useEffect(() => {
    compassOpacity.stopAnimation();

    Animated.timing(compassOpacity, {
      toValue: compassActive ? 1 : 0,
      duration: compassActive ? 90 : 500,
      delay: compassActive ? 0 : 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [compassActive, compassOpacity]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        mode === 'look'
          ? 'Switch to Explore mode'
          : 'Return to Look Around mode'
      }
      accessibilityHint={
        mode === 'look'
          ? 'Lets one-finger swipes move around the map'
          : 'Recenters on your position and lets one-finger swipes rotate the view'
      }
      accessibilityState={{ disabled: compassActive }}
      disabled={compassActive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { bottom, right, top },
        mode === 'explore' && styles.buttonExplore,
        pressed && !compassActive && styles.buttonPressed,
      ]}>
      <Animated.View
        accessible={false}
        pointerEvents="none"
        style={[
          styles.northRing,
          { transform: [{ rotate: northRotation }] },
        ]}>
        <View style={styles.northArrowHead} />
        <View style={styles.northArrowTail} />
      </Animated.View>

      <View accessible={false} style={styles.eye}>
        <Animated.View
          accessible={false}
          style={[
            styles.pupil,
            { transform: [{ translateX: pupilOffset }] },
          ]}>
          <View accessible={false} style={styles.highlight} />
        </Animated.View>
      </View>

      <Animated.View
        accessible={false}
        pointerEvents="none"
        style={[
          styles.compassOverlay,
          { opacity: compassOpacity },
        ]}>
        <View style={styles.compassDial} />
        <Text style={styles.compassNorth}>N</Text>
        <Text style={styles.compassEast}>E</Text>
        <Text style={styles.compassSouth}>S</Text>
        <Text style={styles.compassWest}>W</Text>
        <Animated.View
          style={[
            styles.compassNeedle,
            { transform: [{ rotate: northRotation }] },
          ]}>
          <View style={styles.compassNeedleNorth} />
          <View style={styles.compassNeedleSouth} />
        </Animated.View>
        <View style={styles.compassCenter} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E7',
    borderColor: '#2F7E78',
    borderWidth: 2,
    borderRadius: 26,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonExplore: {
    backgroundColor: '#D8EEE6',
    borderColor: '#22605C',
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  eye: {
    width: 32,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderColor: '#24423F',
    borderWidth: 2,
    borderRadius: 16,
    transform: [{ scaleY: 0.82 }],
  },
  northRing: {
    position: 'absolute',
    width: 43,
    height: 43,
    borderColor: 'rgba(183, 71, 58, 0.45)',
    borderWidth: 1,
    borderRadius: 22,
  },
  northArrowHead: {
    position: 'absolute',
    top: -4,
    left: 16,
    width: 0,
    height: 0,
    borderRightColor: 'transparent',
    borderRightWidth: 5,
    borderBottomColor: '#B7473A',
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderLeftWidth: 5,
  },
  northArrowTail: {
    position: 'absolute',
    top: 5,
    left: 20,
    width: 2,
    height: 8,
    backgroundColor: '#B7473A',
    borderRadius: 1,
  },
  pupil: {
    width: 12,
    height: 12,
    backgroundColor: '#24423F',
    borderRadius: 6,
  },
  highlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 4,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  compassOverlay: {
    position: 'absolute',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E7',
    borderColor: '#2F7E78',
    borderWidth: 2,
    borderRadius: 24,
  },
  compassDial: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#B7B69F',
    borderWidth: 1,
    borderRadius: 18,
  },
  compassNorth: {
    position: 'absolute',
    top: 1,
    color: '#B7473A',
    fontSize: 10,
    fontWeight: '900',
  },
  compassEast: {
    position: 'absolute',
    top: 18,
    right: 3,
    color: '#61706C',
    fontSize: 7,
    fontWeight: '800',
  },
  compassSouth: {
    position: 'absolute',
    bottom: 1,
    color: '#61706C',
    fontSize: 7,
    fontWeight: '800',
  },
  compassWest: {
    position: 'absolute',
    top: 18,
    left: 3,
    color: '#61706C',
    fontSize: 7,
    fontWeight: '800',
  },
  compassNeedle: {
    width: 12,
    height: 32,
  },
  compassNeedleNorth: {
    width: 0,
    height: 0,
    borderRightColor: 'transparent',
    borderRightWidth: 6,
    borderBottomColor: '#B7473A',
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderLeftWidth: 6,
  },
  compassNeedleSouth: {
    width: 0,
    height: 0,
    borderRightColor: 'transparent',
    borderRightWidth: 6,
    borderBottomColor: '#24423F',
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderLeftWidth: 6,
    transform: [{ rotate: '180deg' }],
  },
  compassCenter: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#FFF8E7',
    borderColor: '#24423F',
    borderWidth: 1,
    borderRadius: 3,
  },
});
