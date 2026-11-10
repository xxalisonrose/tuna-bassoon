import { useEffect, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Place } from '@/data/places';
import { getLocationPinImageSource } from './location-pin-layer';

const HORIZONTAL_MARGIN = 12;
const PANEL_PADDING = 10;
const SLOT_WIDTH = 58;

export type PinScrubState = {
  anchorX: number;
  anchorY: number;
  places: Place[];
  selectedIndex: number;
};

export function getPinScrubLayout(
  placeCount: number,
  anchorX: number,
  viewportWidth: number,
) {
  const availableWidth = viewportWidth - HORIZONTAL_MARGIN * 2;
  const width = Math.min(
    availableWidth,
    placeCount * SLOT_WIDTH + PANEL_PADDING * 2,
  );
  const left = Math.min(
    viewportWidth - width - HORIZONTAL_MARGIN,
    Math.max(HORIZONTAL_MARGIN, anchorX - width / 2),
  );
  const usableWidth = width - PANEL_PADDING * 2;
  const slotWidth = usableWidth / Math.max(1, placeCount);

  return {
    left,
    slotWidth,
    width,
  };
}

export function getPinScrubIndex(
  placeCount: number,
  anchorX: number,
  fingerX: number,
  viewportWidth: number,
) {
  const { left, slotWidth } = getPinScrubLayout(
    placeCount,
    anchorX,
    viewportWidth,
  );

  return Math.max(
    0,
    Math.min(
      placeCount - 1,
      Math.floor((fingerX - left - PANEL_PADDING) / slotWidth),
    ),
  );
}

type PinScrubSelectorProps = PinScrubState & {
  visitedLocationIds: ReadonlySet<string>;
};

export function PinScrubSelector({
  anchorX,
  anchorY,
  places,
  selectedIndex,
  visitedLocationIds,
}: PinScrubSelectorProps) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [entrance] = useState(() => new Animated.Value(0));
  const layout = getPinScrubLayout(places.length, anchorX, width);
  const selectedPlace = places[selectedIndex];
  const estimatedHeight = 132;
  const appearsAboveAnchor =
    anchorY - estimatedHeight - 28 >= insets.top + 8;
  const top = appearsAboveAnchor
    ? anchorY - estimatedHeight - 28
    : Math.min(
        anchorY + 34,
        height - estimatedHeight - insets.bottom - 12,
      );
  const pointerLeft = Math.max(
    18,
    Math.min(layout.width - 34, anchorX - layout.left - 8),
  );

  useEffect(() => {
    const animation = Animated.spring(entrance, {
      toValue: 1,
      damping: 16,
      stiffness: 220,
      mass: 0.7,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [entrance]);

  if (selectedPlace === undefined) {
    return null;
  }

  const panelScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1],
  });

  return (
    <View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={styles.overlay}>
      <Animated.View
        style={[
          styles.panel,
          {
            left: layout.left,
            opacity: entrance,
            top,
            transform: [{ scale: panelScale }],
            width: layout.width,
          },
        ]}>
        <View
          style={[
            styles.flagPointer,
            appearsAboveAnchor
              ? styles.flagPointerBottom
              : styles.flagPointerTop,
            { left: pointerLeft },
          ]}
        />

        <Text numberOfLines={1} style={styles.title}>
          {selectedPlace.title}
        </Text>

        <View style={styles.pinRow}>
          {places.map((place, index) => {
            const selected = index === selectedIndex;

            return (
              <View
                key={place.id}
                style={[
                  styles.pinSlot,
                  { width: layout.slotWidth },
                ]}>
                <Image
                  accessibilityIgnoresInvertColors
                  source={getLocationPinImageSource(
                    place,
                    visitedLocationIds.has(place.id),
                  )}
                  style={[
                    styles.pinImage,
                    selected && styles.pinImageSelected,
                  ]}
                />
              </View>
            );
          })}
        </View>

        <Text style={styles.hint}>
          {places.length === 1
            ? 'Keep holding · release to open'
            : 'Keep holding · slide anywhere · release to open'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 40,
  },
  panel: {
    position: 'absolute',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: PANEL_PADDING,
    paddingVertical: 9,
    backgroundColor: 'rgba(255, 253, 242, 0.97)',
    borderColor: '#D4A373',
    borderRadius: 18,
    borderWidth: 2,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  flagPointer: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: '#FFFDF2',
    borderColor: '#D4A373',
    transform: [{ rotate: '45deg' }],
  },
  flagPointerBottom: {
    bottom: -9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  flagPointerTop: {
    top: -9,
    borderLeftWidth: 2,
    borderTopWidth: 2,
  },
  title: {
    maxWidth: '100%',
    color: '#2E2D25',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  pinRow: {
    height: 58,
    alignItems: 'center',
    flexDirection: 'row',
  },
  pinSlot: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinImage: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
    opacity: 0.68,
  },
  pinImageSelected: {
    width: 58,
    height: 58,
    opacity: 1,
  },
  hint: {
    color: '#625F50',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
