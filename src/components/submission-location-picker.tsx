import {
  Camera,
  type CameraRef,
  Map,
  Marker,
} from '@maplibre/maplibre-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';
import type { SubmissionLocationPickerProps } from './submission-location-picker.types';

export type { SubmissionCoordinates } from './submission-location-picker.types';

const STORYBOOK_MAP_STYLE =
  'https://tiles.openfreemap.org/styles/liberty';

export function SubmissionLocationPicker({
  center,
  selectedCoordinates,
  onSelect,
}: SubmissionLocationPickerProps) {
  const cameraRef = useRef<CameraRef>(null);

  useEffect(() => {
    cameraRef.current?.flyTo({
      center,
      zoom: 16,
      bearing: 0,
      pitch: 0,
      duration: 650,
    });
  }, [center]);

  return (
    <View
      accessibilityLabel="Location pin map. Tap the map to place the proposed location pin."
      style={styles.container}>
      <Map
        attribution={false}
        compass
        doubleTapHoldZoom={false}
        mapStyle={STORYBOOK_MAP_STYLE}
        onPress={(event) => onSelect(event.nativeEvent.lngLat)}
        style={styles.map}
        touchPitch={false}
        touchRotate={false}>
        <Camera
          ref={cameraRef}
          initialViewState={{
            center,
            zoom: 16,
            bearing: 0,
            pitch: 0,
          }}
        />
        {selectedCoordinates ? (
          <Marker
            anchor="bottom"
            id="proposed-location-pin"
            lngLat={selectedCoordinates}>
            <View style={styles.pinWrap}>
              <View style={styles.pinCircle}>
                <Text accessibilityElementsHidden style={styles.pinGlyph}>
                  ★
                </Text>
              </View>
              <View style={styles.pinPoint} />
            </View>
          </Marker>
        ) : null}
      </Map>
      <View pointerEvents="none" style={styles.instructionBadge}>
        <Text style={styles.instructionText}>Tap to place the pin</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: Palette.border,
    borderRadius: Spacing.three,
    borderWidth: 1,
    height: 320,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  pinWrap: {
    alignItems: 'center',
  },
  pinCircle: {
    alignItems: 'center',
    backgroundColor: Palette.danger,
    borderColor: Palette.paper,
    borderRadius: 22,
    borderWidth: 3,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pinGlyph: {
    color: Palette.paper,
    fontSize: 20,
    fontWeight: '800',
  },
  pinPoint: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 8,
    borderRightColor: 'transparent',
    borderRightWidth: 8,
    borderTopColor: Palette.danger,
    borderTopWidth: 13,
    height: 0,
    marginTop: -3,
    width: 0,
  },
  instructionBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 253, 242, 0.94)',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    bottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    position: 'absolute',
  },
  instructionText: {
    color: Palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
});
