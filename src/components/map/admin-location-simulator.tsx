import { useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export type SimulatorDirection =
  | 'up'
  | 'right'
  | 'down'
  | 'left';

type AdminLocationSimulatorProps = {
  awardingBadge: boolean;
  bottom?: number;
  coordinates: [number, number];
  enabled: boolean;
  onCoordinatesChange: (
    coordinates: [number, number],
  ) => void;
  onAwardBadge: () => void;
  onEnabledChange: (enabled: boolean) => void;
  onResetProgress: () => void;
  onStep: (direction: SimulatorDirection) => void;
  resettingProgress: boolean;
  top?: number;
};

type DirectionButtonProps = {
  accessibilityLabel: string;
  arrow: string;
  onPress: () => void;
};

function DirectionButton({
  accessibilityLabel,
  arrow,
  onPress,
}: DirectionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.directionButton,
        pressed && styles.buttonPressed,
      ]}>
      <Text
        accessible={false}
        allowFontScaling={false}
        style={styles.directionArrow}>
        {arrow}
      </Text>
    </Pressable>
  );
}

export function AdminLocationSimulator({
  awardingBadge,
  bottom,
  coordinates,
  enabled,
  onAwardBadge,
  onCoordinatesChange,
  onEnabledChange,
  onResetProgress,
  onStep,
  resettingProgress,
  top,
}: AdminLocationSimulatorProps) {
  const [coordinateEditorVisible, setCoordinateEditorVisible] =
    useState(false);
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const [coordinateError, setCoordinateError] =
    useState('');

  const openCoordinateEditor = () => {
    setLatitudeText(String(coordinates[1]));
    setLongitudeText(String(coordinates[0]));
    setCoordinateError('');
    setCoordinateEditorVisible(true);
  };

  const closeCoordinateEditor = () => {
    setCoordinateEditorVisible(false);
    setCoordinateError('');
  };

  const moveToEnteredCoordinates = () => {
    const latitude = Number(latitudeText.trim());
    const longitude = Number(longitudeText.trim());

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setCoordinateError(
        'Enter a latitude from -90 to 90 and a longitude from -180 to 180.',
      );
      return;
    }

    onCoordinatesChange([longitude, latitude]);
    closeCoordinateEditor();
    AccessibilityInfo.announceForAccessibility(
      'Test player moved to the entered coordinates.',
    );
  };

  if (!enabled) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Turn on admin test GPS"
        accessibilityHint="Places a test player in Harvard Yard for map testing"
        onPress={() => onEnabledChange(true)}
        style={({ pressed }) => [
          styles.enableButton,
          { bottom, top },
          pressed && styles.buttonPressed,
        ]}>
        <Text style={styles.enableButtonText}>TEST</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { bottom, top }]}>
      {coordinateEditorVisible && (
        <View
          accessibilityViewIsModal
          style={styles.coordinateEditor}>
          <Text
            accessibilityRole="header"
            style={styles.coordinateTitle}>
            Move Test Player
          </Text>

          <Text style={styles.coordinateHelp}>
            Enter decimal GPS coordinates. Location details and
            check-ins use this test position. Successful check-ins
            are saved to your account.
          </Text>

          <Text style={styles.inputLabel}>Latitude</Text>
          <TextInput
            accessibilityLabel="Test latitude"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            onChangeText={setLatitudeText}
            selectTextOnFocus
            style={styles.coordinateInput}
            value={latitudeText}
          />

          <Text style={styles.inputLabel}>Longitude</Text>
          <TextInput
            accessibilityLabel="Test longitude"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            onChangeText={setLongitudeText}
            selectTextOnFocus
            style={styles.coordinateInput}
            value={longitudeText}
          />

          {coordinateError !== '' && (
            <Text
              accessibilityLiveRegion="assertive"
              style={styles.coordinateError}>
              {coordinateError}
            </Text>
          )}

          <View style={styles.editorActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel coordinate entry"
              onPress={closeCoordinateEditor}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.secondaryButtonText}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Move test player"
              onPress={moveToEnteredCoordinates}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.primaryButtonText}>Move</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Test GPS</Text>
          <Text style={styles.previewLabel}>Admin preview</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Turn off admin test GPS"
          onPress={() => {
            closeCoordinateEditor();
            onEnabledChange(false);
          }}
          style={({ pressed }) => [
            styles.offButton,
            pressed && styles.buttonPressed,
          ]}>
          <Text style={styles.offButtonText}>Off</Text>
        </Pressable>
      </View>

      <View style={styles.directionPad}>
        <View style={styles.directionRow}>
          <View style={styles.directionSpacer} />
          <DirectionButton
            accessibilityLabel="Walk test player up"
            arrow="↑"
            onPress={() => onStep('up')}
          />
          <View style={styles.directionSpacer} />
        </View>

        <View style={styles.directionRow}>
          <DirectionButton
            accessibilityLabel="Walk test player left"
            arrow="←"
            onPress={() => onStep('left')}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter test GPS coordinates"
            accessibilityState={{
              expanded: coordinateEditorVisible,
            }}
            onPress={openCoordinateEditor}
            style={({ pressed }) => [
              styles.coordinateButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text
              accessible={false}
              allowFontScaling={false}
              style={styles.coordinateButtonIcon}>
              ⌖
            </Text>
          </Pressable>

          <DirectionButton
            accessibilityLabel="Walk test player right"
            arrow="→"
            onPress={() => onStep('right')}
          />
        </View>

        <View style={styles.directionRow}>
          <View style={styles.directionSpacer} />
          <DirectionButton
            accessibilityLabel="Walk test player down"
            arrow="↓"
            onPress={() => onStep('down')}
          />
          <View style={styles.directionSpacer} />
        </View>
      </View>

      <Text style={styles.stepHelp}>
        Arrows walk 10 m in the direction shown.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Award my next test badge level"
        accessibilityHint="Awards Level 1 on the first use and the next level on each later use"
        disabled={awardingBadge}
        onPress={onAwardBadge}
        style={({ pressed }) => [
          styles.awardButton,
          awardingBadge && styles.resetButtonDisabled,
          pressed && styles.buttonPressed,
        ]}>
        <Text style={styles.awardButtonText}>
          {awardingBadge ? 'Awarding…' : 'Award Test Badge'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset my test progress"
        accessibilityHint="Deletes only your check-ins, badge progress, and earned badges after confirmation"
        disabled={resettingProgress}
        onPress={onResetProgress}
        style={({ pressed }) => [
          styles.resetButton,
          resettingProgress && styles.resetButtonDisabled,
          pressed && styles.buttonPressed,
        ]}>
        <Text style={styles.resetButtonText}>
          {resettingProgress ? 'Resetting…' : 'Reset Test Progress'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 14,
    zIndex: 10,
    width: 160,
    padding: 10,
    backgroundColor: 'rgba(255, 248, 231, 0.97)',
    borderColor: '#2F7E78',
    borderWidth: 2,
    borderRadius: 18,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  enableButton: {
    position: 'absolute',
    right: 14,
    zIndex: 10,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B7473A',
    borderColor: '#7F2E29',
    borderWidth: 2,
    borderRadius: 26,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: '#24423F',
    fontSize: 14,
    fontWeight: '800',
  },
  previewLabel: {
    color: '#50706B',
    fontSize: 10,
    fontWeight: '600',
  },
  offButton: {
    minWidth: 42,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEE7',
    borderRadius: 15,
  },
  offButtonText: {
    color: '#24423F',
    fontSize: 12,
    fontWeight: '800',
  },
  directionPad: {
    alignItems: 'center',
    gap: 3,
  },
  directionRow: {
    flexDirection: 'row',
    gap: 3,
  },
  directionSpacer: {
    width: 40,
    height: 40,
  },
  directionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D8EEE6',
    borderColor: '#2F7E78',
    borderWidth: 1,
    borderRadius: 12,
  },
  directionArrow: {
    color: '#24423F',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 26,
  },
  coordinateButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A8473F',
    borderRadius: 20,
  },
  coordinateButtonIcon: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 25,
  },
  stepHelp: {
    marginTop: 6,
    color: '#50706B',
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  resetButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F8E5E1',
    borderColor: '#B7473A',
    borderWidth: 1,
    borderRadius: 17,
  },
  awardButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    backgroundColor: '#D8EEE6',
    borderColor: '#2F7E78',
    borderWidth: 1,
    borderRadius: 17,
  },
  awardButtonText: {
    color: '#24423F',
    fontSize: 11,
    fontWeight: '800',
  },
  resetButtonDisabled: {
    opacity: 0.55,
  },
  resetButtonText: {
    color: '#7F2E29',
    fontSize: 11,
    fontWeight: '800',
  },
  coordinateEditor: {
    position: 'absolute',
    right: 0,
    bottom: 206,
    width: 280,
    padding: 14,
    backgroundColor: '#FFFDF5',
    borderColor: '#2F7E78',
    borderWidth: 2,
    borderRadius: 16,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  coordinateTitle: {
    color: '#24423F',
    fontSize: 17,
    fontWeight: '800',
  },
  coordinateHelp: {
    marginTop: 4,
    marginBottom: 10,
    color: '#50706B',
    fontSize: 12,
    lineHeight: 17,
  },
  inputLabel: {
    marginBottom: 4,
    color: '#24423F',
    fontSize: 12,
    fontWeight: '700',
  },
  coordinateInput: {
    minHeight: 42,
    marginBottom: 9,
    paddingHorizontal: 11,
    color: '#172D2A',
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    borderColor: '#9CB4AC',
    borderWidth: 1,
    borderRadius: 9,
  },
  coordinateError: {
    marginBottom: 9,
    color: '#9D2C26',
    fontSize: 12,
    lineHeight: 16,
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  secondaryButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#E8EEE7',
    borderRadius: 19,
  },
  secondaryButtonText: {
    color: '#24423F',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 17,
    backgroundColor: '#2F7E78',
    borderRadius: 19,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
});
