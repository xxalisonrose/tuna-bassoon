import { useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BadgeTagPickerProps = {
  availableTags: string[];
  disabled?: boolean;
  maxSelected?: number;
  minimumSelected?: number;
  mode: 'single' | 'multiple';
  onChange: (tags: string[]) => void;
  selectedTags: string[];
};

export function normalizeBadgeTagValue(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeTagList(values: string[]) {
  const seen = new Set<string>();

  return values
    .map(normalizeBadgeTagValue)
    .filter((tag) => {
      if (!tag || seen.has(tag)) {
        return false;
      }

      seen.add(tag);
      return true;
    });
}

export function BadgeTagPicker({
  availableTags,
  disabled = false,
  maxSelected = 25,
  minimumSelected = 0,
  mode,
  onChange,
  selectedTags,
}: BadgeTagPickerProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmingRemovalTag, setConfirmingRemovalTag] =
    useState<string | null>(null);
  const [statusMessage, setStatusMessage] =
    useState<string | null>(null);

  const normalizedSelectedTags = useMemo(
    () => normalizeTagList(selectedTags),
    [selectedTags],
  );
  const normalizedAvailableTags = useMemo(
    () =>
      normalizeTagList(availableTags).sort((left, right) =>
        left.localeCompare(right),
      ),
    [availableTags],
  );
  const selectedTagKeys = useMemo(
    () => new Set(normalizedSelectedTags),
    [normalizedSelectedTags],
  );
  const normalizedSearch = normalizeBadgeTagValue(search);
  const searchValue = search.trim().toLowerCase();
  const filteredTags = normalizedAvailableTags.filter(
    (tag) =>
      !searchValue ||
      tag.includes(searchValue) ||
      (normalizedSearch.length > 0 && tag.includes(normalizedSearch)),
  );
  const catalogHasSearchTag =
    normalizedAvailableTags.includes(normalizedSearch);
  const canAddNewTag =
    normalizedSearch.length > 0 &&
    !catalogHasSearchTag &&
    !selectedTagKeys.has(normalizedSearch);
  const selectionLimit = mode === 'single' ? 1 : maxSelected;
  const subject = mode === 'single' ? 'this badge' : 'this location';
  const minimumSelectionMessage =
    mode === 'multiple'
      ? 'Every location needs at least one badge tag. Add a replacement before removing this tag.'
      : 'At least one badge tag is required. Add a replacement before removing this tag.';

  const announce = (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  };

  const selectTag = (tag: string) => {
    const normalizedTag = normalizeBadgeTagValue(tag);

    if (!normalizedTag) {
      return;
    }

    if (mode === 'single') {
      onChange([normalizedTag]);
    } else if (!selectedTagKeys.has(normalizedTag)) {
      if (normalizedSelectedTags.length >= selectionLimit) {
        const message =
          `You can select no more than ${selectionLimit} badge tags.`;
        setStatusMessage(message);
        announce(message);
        return;
      }

      onChange([...normalizedSelectedTags, normalizedTag]);
    }

    setSearch('');
    setStatusMessage(null);
    setConfirmingRemovalTag(null);
    announce(`Selected badge tag ${normalizedTag}.`);
  };

  const confirmRemoval = () => {
    if (confirmingRemovalTag === null) {
      return;
    }

    if (normalizedSelectedTags.length <= minimumSelected) {
      setConfirmingRemovalTag(null);
      setStatusMessage(minimumSelectionMessage);
      announce(minimumSelectionMessage);
      return;
    }

    const removedTag = confirmingRemovalTag;
    onChange(
      normalizedSelectedTags.filter(
        (tag) => tag !== removedTag,
      ),
    );
    setConfirmingRemovalTag(null);
    setStatusMessage(null);
    announce(`Removed badge tag ${removedTag} from ${subject}.`);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.selectedTags}>
        {normalizedSelectedTags.length > 0 ? (
          normalizedSelectedTags.map((tag) => (
            <Pressable
              key={tag}
              accessibilityRole="button"
              accessibilityLabel={`Review removal of badge tag ${tag} from ${subject}`}
              accessibilityHint="Opens an are-you-sure confirmation."
              disabled={disabled}
              onPress={() => {
                if (
                  normalizedSelectedTags.length <= minimumSelected
                ) {
                  setConfirmingRemovalTag(null);
                  setStatusMessage(minimumSelectionMessage);
                  announce(minimumSelectionMessage);
                  return;
                }

                setConfirmingRemovalTag(tag);
                setStatusMessage(null);
              }}
              style={({ pressed }) => [
                styles.selectedTag,
                disabled && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.selectedTagText}>
                {tag} ×
              </ThemedText>
            </Pressable>
          ))
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {mode === 'single'
              ? 'No badge tag selected.'
              : 'No badge tags selected.'}
          </ThemedText>
        )}
      </ThemedView>

      {confirmingRemovalTag ? (
        <ThemedView
          accessibilityLabel={`Confirm Removal of ${confirmingRemovalTag}`}
          type="backgroundElement"
          style={styles.confirmation}>
          <ThemedText type="smallBold">Are You Sure?</ThemedText>
          <ThemedText themeColor="textSecondary">
            {`Remove “${confirmingRemovalTag}” from ${subject}? ` +
              'Changes only this unsaved form and will not affect other locations or badges.'}
          </ThemedText>

          <ThemedView style={styles.confirmationActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Confirm Removal of ${confirmingRemovalTag} from ${subject}`}
              disabled={disabled}
              onPress={confirmRemoval}
              style={({ pressed }) => [
                styles.destructiveButton,
                disabled && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.destructiveButtonText}>
                Confirm Removal
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              onPress={() => setConfirmingRemovalTag(null)}
              style={({ pressed }) => [
                styles.secondaryButton,
                disabled && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.secondaryButtonText}>
                Cancel
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      ) : null}

      {statusMessage ? (
        <ThemedText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.statusText}>
          {statusMessage}
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          open ? 'Close badge tag picker' : 'Choose or add a badge tag'
        }
        accessibilityHint="Opens the searchable badge-tag dropdown."
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => {
          setOpen((value) => !value);
          setSearch('');
          setConfirmingRemovalTag(null);
          setStatusMessage(null);
        }}
        style={({ pressed }) => [
          styles.pickerButton,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" style={styles.secondaryButtonText}>
          {open ? 'Close Tag Dropdown' : 'Choose or Add a Tag'}
        </ThemedText>
      </Pressable>

      {open ? (
        <ThemedView
          type="backgroundElement"
          style={[
            styles.dropdown,
            { borderColor: theme.border },
          ]}>
          <TextInput
            accessibilityLabel="Search or add a badge tag"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled}
            maxLength={120}
            onChangeText={(value) => {
              setSearch(value);
              setStatusMessage(null);
            }}
            placeholder="Search tags or enter a new tag"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: theme.borderStrong,
                color: theme.text,
              },
            ]}
            value={search}
          />

          <ThemedText type="smallBold">Existing Tags</ThemedText>

          {filteredTags.length > 0 ? (
            <ThemedView style={styles.options}>
              {filteredTags.map((tag) => {
                const selected = selectedTagKeys.has(tag);

                return (
                  <Pressable
                    key={tag}
                    accessibilityRole="button"
                    accessibilityLabel={
                      selected
                        ? `${tag} is selected`
                        : `Select badge tag ${tag}`
                    }
                    accessibilityState={{ selected, disabled }}
                    disabled={disabled || selected}
                    onPress={() => selectTag(tag)}
                    style={({ pressed }) => [
                      styles.tagButton,
                      { borderColor: theme.borderStrong },
                      selected && styles.tagButtonSelected,
                      (disabled || selected) && styles.disabled,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={
                        selected
                          ? styles.tagButtonTextSelected
                          : undefined
                      }>
                      {tag}
                      {selected ? ' · Selected' : ''}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ThemedView>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No existing tags match this search.
            </ThemedText>
          )}

          <ThemedText type="smallBold">Add a Tag</ThemedText>

          {canAddNewTag ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add new badge tag ${normalizedSearch}`}
              disabled={disabled}
              onPress={() => selectTag(normalizedSearch)}
              style={({ pressed }) => [
                styles.primaryButton,
                disabled && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.primaryButtonText}>
                {`Add a Tag: ${normalizedSearch}`}
              </ThemedText>
            </Pressable>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {normalizedSearch && selectedTagKeys.has(normalizedSearch)
                ? 'That tag is already selected.'
                : normalizedSearch && catalogHasSearchTag
                  ? 'Choose the matching existing tag above.'
                  : `Enter a new tag above. It will use lowercase letters and hyphens, and it becomes permanent when you save ${subject}.`}
            </ThemedText>
          )}

          {mode === 'multiple' ? (
            <ThemedText type="small" themeColor="textSecondary">
              {`${normalizedSelectedTags.length} of ${selectionLimit} tags selected.`}
            </ThemedText>
          ) : null}

        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.one,
  },
  selectedTag: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: Palette.teaGreen,
  },
  selectedTagText: {
    color: Palette.ink,
  },
  confirmation: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  confirmationActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  dropdown: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  tagButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  tagButtonSelected: {
    borderColor: Palette.lightBronze,
    backgroundColor: Palette.teaGreen,
  },
  tagButtonTextSelected: {
    color: Palette.ink,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.lightBronze,
  },
  primaryButtonText: {
    color: Palette.ink,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  secondaryButtonText: {
    color: Palette.ink,
    textAlign: 'center',
  },
  pickerButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  destructiveButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.danger,
  },
  destructiveButtonText: {
    color: Palette.onDanger,
    textAlign: 'center',
  },
  statusText: {
    lineHeight: 22,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
});
