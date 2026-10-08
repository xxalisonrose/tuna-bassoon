import { useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const locationCategoryOptions = [
  {
    value: 'History & Heritage',
    description:
      'Historic events, artifacts, memorials, transportation, and heritage.',
  },
  {
    value: 'Culture & Arts',
    description:
      'Art, public art, museums, and cultural expression.',
  },
  {
    value: 'Literature & Libraries',
    description:
      'Books, libraries, writers, poets, and literary history.',
  },
  {
    value: 'People & Community',
    description:
      'People, civic life, neighborhoods, and community stories.',
  },
  {
    value: 'Science & Nature',
    description:
      'Science, natural features, gardens, and the environment.',
  },
  {
    value: 'Architecture & Places',
    description:
      'Notable buildings, historic homes, landmarks, and built spaces.',
  },
  {
    value: 'Weird & Curious',
    description:
      'Oddities, folklore, legends, mysteries, and unusual discoveries.',
  },
] as const;

export type LocationCategory =
  (typeof locationCategoryOptions)[number]['value'];

const legacyLocationCategoryMap: Record<string, LocationCategory> = {
  architecture: 'Architecture & Places',
  art: 'Culture & Arts',
  'black history': 'History & Heritage',
  books: 'Literature & Libraries',
  'books & libraries': 'Literature & Libraries',
  'cultural heritage': 'History & Heritage',
  folklore: 'Weird & Curious',
  'harvard history': 'History & Heritage',
  'harvard people': 'People & Community',
  'historic artifact': 'History & Heritage',
  'historic building': 'Architecture & Places',
  'historic events': 'History & Heritage',
  'historic home': 'Architecture & Places',
  'historic object': 'History & Heritage',
  'historic places': 'Architecture & Places',
  libraries: 'Literature & Libraries',
  library: 'Literature & Libraries',
  'local history': 'History & Heritage',
  memorial: 'History & Heritage',
  'museum, science and art': 'Culture & Arts',
  'natural wonders': 'Science & Nature',
  oddities: 'Weird & Curious',
  'people, politics, industrial history': 'History & Heritage',
  'public art': 'Culture & Arts',
  'public gardens': 'Science & Nature',
  'religious history': 'History & Heritage',
  transportation: 'History & Heritage',
  'writers & poets': 'Literature & Libraries',
};

function categoryLookupKey(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function getCanonicalLocationCategory(
  value: string | undefined,
): LocationCategory | null {
  if (!value) {
    return null;
  }

  const lookupKey = categoryLookupKey(value);
  const option = locationCategoryOptions.find(
    (category) => categoryLookupKey(category.value) === lookupKey,
  );

  return option?.value ?? legacyLocationCategoryMap[lookupKey] ?? null;
}

type LocationCategoryPickerProps = {
  disabled?: boolean;
  hasError?: boolean;
  onChange: (category: LocationCategory) => void;
  value: string;
};

export function LocationCategoryPicker({
  disabled = false,
  hasError = false,
  onChange,
  value,
}: LocationCategoryPickerProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selectedCategory = getCanonicalLocationCategory(value);

  return (
    <ThemedView style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          selectedCategory
            ? `Location category: ${selectedCategory}`
            : 'Choose a location category'
        }
        accessibilityHint="Opens the standardized location category list."
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: hasError
              ? Palette.danger
              : Palette.teaGreen,
          },
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" style={styles.triggerText}>
          {selectedCategory ?? 'Choose a Category'}
        </ThemedText>
        <ThemedText style={styles.triggerText}>
          {open ? '▲' : '▼'}
        </ThemedText>
      </Pressable>

      {open ? (
        <ThemedView
          accessibilityLabel="Location category choices"
          accessibilityRole="radiogroup"
          type="backgroundElement"
          style={[styles.menu, { borderColor: theme.border }]}>
          {locationCategoryOptions.map((option) => {
            const selected = option.value === selectedCategory;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                  AccessibilityInfo.announceForAccessibility(
                    `Selected location category ${option.value}.`,
                  );
                }}
                style={({ pressed }) => [
                  styles.option,
                  { borderColor: theme.border },
                  selected && styles.optionSelected,
                  disabled && styles.disabled,
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="smallBold"
                  style={selected ? styles.optionSelectedText : undefined}>
                  {option.value}
                </ThemedText>

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
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  trigger: {
    minWidth: 220,
    minHeight: 48,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  triggerText: {
    color: Palette.ink,
  },
  menu: {
    minWidth: 220,
    alignSelf: 'flex-start',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.one,
  },
  option: {
    minWidth: 220,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  optionSelected: {
    backgroundColor: Palette.teaGreen,
    borderColor: Palette.bronzeDeep,
  },
  optionSelectedText: {
    color: Palette.ink,
  },
  checkmark: {
    color: Palette.ink,
    fontSize: 20,
    lineHeight: 24,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
});
