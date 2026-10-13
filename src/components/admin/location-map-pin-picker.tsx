import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getLocationMapPinTypeOption,
  locationMapPinTypeOptions,
  type LocationMapPinType,
} from '@/lib/location-map-pin';

type LocationMapPinPickerProps = {
  disabled?: boolean;
  hasError?: boolean;
  onChange: (value: LocationMapPinType) => void;
  onUseSuggestion: () => void;
  suggestedValue: LocationMapPinType;
  value: string;
};

export function LocationMapPinPicker({
  disabled = false,
  hasError = false,
  onChange,
  onUseSuggestion,
  suggestedValue,
  value,
}: LocationMapPinPickerProps) {
  const theme = useTheme();
  const selectedOption = getLocationMapPinTypeOption(value);
  const suggestedOption = getLocationMapPinTypeOption(suggestedValue);
  const differsFromSuggestion = value !== suggestedValue;

  return (
    <ThemedView
      accessibilityLabel="Map pin type choices"
      accessibilityRole="radiogroup"
      style={[
        styles.container,
        hasError && styles.containerError,
      ]}>
      <ThemedView style={styles.suggestionRow}>
        <ThemedText type="small" themeColor="textSecondary">
          Suggested from the current tags: {suggestedOption?.label}
        </ThemedText>

        {differsFromSuggestion ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Use suggested map pin type ${suggestedOption?.label}`}
            disabled={disabled}
            onPress={onUseSuggestion}
            style={({ pressed }) => [
              styles.useSuggestionButton,
              disabled && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={styles.buttonText}>
              Use Suggestion
            </ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>

      <ThemedView style={styles.options}>
        {locationMapPinTypeOptions.map((option) => {
          const selected = option.value === selectedOption?.value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityHint={`${option.unvisitedDescription} before check-in and ${option.visitedDescription.toLowerCase()} after check-in.`}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => {
                onChange(option.value);
                AccessibilityInfo.announceForAccessibility(
                  `Selected map pin type ${option.label}.`,
                );
              }}
              style={({ pressed }) => [
                styles.option,
                { borderColor: theme.border },
                selected && styles.optionSelected,
                disabled && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <ThemedView
                style={[
                  styles.preview,
                  selected && styles.previewSelected,
                ]}>
                <ThemedText
                  type="smallBold"
                  style={styles.previewText}>
                  {option.mapSymbol}
                </ThemedText>
              </ThemedView>

              <ThemedView style={styles.optionCopy}>
                <ThemedText
                  type="smallBold"
                  style={selected ? styles.optionSelectedText : undefined}>
                  {option.label}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={selected ? styles.optionSelectedText : undefined}>
                  {option.unvisitedDescription} → {option.visitedDescription}
                </ThemedText>
              </ThemedView>

              {selected ? (
                <ThemedText
                  accessibilityLabel="Selected"
                  style={styles.checkmark}>
                  ✓
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  containerError: {
    borderColor: Palette.danger,
    borderWidth: 2,
  },
  suggestionRow: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  useSuggestionButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    backgroundColor: Palette.teaGreen,
  },
  buttonText: {
    color: Palette.ink,
  },
  options: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  option: {
    flexBasis: 250,
    flexGrow: 1,
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  optionSelected: {
    backgroundColor: Palette.beige,
    borderColor: Palette.bronzeDeep,
    borderWidth: 2,
  },
  preview: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: Palette.danger,
    borderColor: Palette.paper,
    borderWidth: 2,
  },
  previewSelected: {
    backgroundColor: '#18864B',
  },
  previewText: {
    color: Palette.onDanger,
  },
  optionCopy: {
    backgroundColor: 'transparent',
    flex: 1,
    gap: Spacing.one,
  },
  checkmark: {
    color: Palette.bronzeDeep,
    fontSize: 20,
  },
  optionSelectedText: {
    color: Palette.ink,
  },
  disabled: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.8,
  },
});
