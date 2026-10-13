import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import {
  BadgeTagPicker,
  normalizeBadgeTagValue,
} from '@/components/admin/badge-tag-picker';
import {
  getCanonicalLocationCategory,
  LocationCategoryPicker,
} from '@/components/admin/location-category-picker';
import { LocationMapPinPicker } from '@/components/admin/location-map-pin-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getCanonicalLocationMapPinType,
  suggestLocationMapPinType,
  type LocationMapPinType,
} from '@/lib/location-map-pin';

export type LocationProposalEdit = {
  name: string;
  key: string;
  description: string;
  funFact: string;
  source: string;
  isLore: boolean;
  latitude: string;
  longitude: string;
  category: string;
  mapPinType: LocationMapPinType;
  badges: string[];
};

export type BadgeProposalEdit = {
  name: string;
  key: string;
  tag: string;
  description: string;
  classification: 'general' | 'theme' | 'special_place' | 'seasonal';
  requiredVisits: string;
  levelsEnabled: boolean;
  congratulationsMessages: string[];
};

type Props =
  | {
      contentType: 'location';
      initialValue: LocationProposalEdit;
      availableTags: string[];
      saving: boolean;
      onCancel: () => void;
      onSave: (value: LocationProposalEdit) => void;
    }
  | {
      contentType: 'badge';
      initialValue: BadgeProposalEdit;
      availableTags: string[];
      saving: boolean;
      onCancel: () => void;
      onSave: (value: BadgeProposalEdit) => void;
    };

function FormField({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  placeholder?: string;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          multiline && styles.textArea,
          {
            borderColor: theme.border,
            color: theme.text,
            backgroundColor: theme.backgroundElement,
          },
        ]}
        value={value}
      />
    </ThemedView>
  );
}

function LocationEditor({
  initialValue,
  availableTags,
  saving,
  onCancel,
  onSave,
}: Extract<Props, { contentType: 'location' }>) {
  const theme = useTheme();
  const [form, setForm] = useState(initialValue);
  const suggestedMapPinType = useMemo(
    () =>
      suggestLocationMapPinType({
        badges: form.badges,
        category: form.category,
        isLore: form.isLore,
      }),
    [form.badges, form.category, form.isLore],
  );
  const update = <Key extends keyof LocationProposalEdit,>(
    key: Key,
    value: LocationProposalEdit[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <ThemedView
      type="backgroundSelected"
      style={[styles.editor, { borderColor: theme.borderStrong }]}>
      <ThemedText accessibilityRole="header" type="subtitle">
        Edit Location Proposal
      </ThemedText>

      <ThemedView style={styles.twoColumnFields}>
        <ThemedView style={styles.growingField}>
          <FormField
            label="Location Name"
            value={form.name}
            onChangeText={(value) => update('name', value)}
          />
        </ThemedView>
        <ThemedView style={styles.growingField}>
          <FormField
            label="Stable Key"
            value={form.key}
            onChangeText={(value) => update('key', normalizeBadgeTagValue(value))}
          />
        </ThemedView>
      </ThemedView>

      <FormField
        label="Description"
        value={form.description}
        multiline
        onChangeText={(value) => update('description', value)}
      />
      <FormField
        label="Fun Fact"
        value={form.funFact}
        multiline
        onChangeText={(value) => update('funFact', value)}
      />
      <FormField
        label="Source"
        value={form.source}
        multiline
        onChangeText={(value) => update('source', value)}
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: form.isLore }}
        onPress={() => update('isLore', !form.isLore)}
        style={({ pressed }) => [
          styles.toggle,
          { borderColor: theme.border },
          form.isLore && styles.toggleSelected,
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold">
          {form.isLore ? '✓ ' : ''}Includes Lore or Legend
        </ThemedText>
      </Pressable>

      <ThemedView style={styles.twoColumnFields}>
        <ThemedView style={styles.growingField}>
          <FormField
            label="Latitude"
            value={form.latitude}
            keyboardType="decimal-pad"
            onChangeText={(value) => update('latitude', value)}
          />
        </ThemedView>
        <ThemedView style={styles.growingField}>
          <FormField
            label="Longitude"
            value={form.longitude}
            keyboardType="decimal-pad"
            onChangeText={(value) => update('longitude', value)}
          />
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.field}>
        <ThemedText type="smallBold">Category</ThemedText>
        <LocationCategoryPicker
          disabled={saving}
          value={form.category}
          onChange={(value) => update('category', value)}
        />
      </ThemedView>

      <ThemedView style={styles.field}>
        <ThemedText type="smallBold">Badge Tags</ThemedText>
        <BadgeTagPicker
          availableTags={[...availableTags, ...form.badges]}
          disabled={saving}
          maxSelected={25}
          minimumSelected={1}
          mode="multiple"
          onChange={(value) => update('badges', value)}
          selectedTags={form.badges}
        />
      </ThemedView>

      <ThemedView style={styles.field}>
        <ThemedText type="smallBold">Map Pin Type</ThemedText>
        <LocationMapPinPicker
          disabled={saving}
          value={form.mapPinType}
          suggestedValue={suggestedMapPinType}
          onChange={(value) => update('mapPinType', value)}
          onUseSuggestion={() => update('mapPinType', suggestedMapPinType)}
        />
      </ThemedView>

      <ThemedView style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => onSave(form)}
          style={({ pressed }) => [
            styles.primaryButton,
            saving && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <ThemedText style={styles.buttonText}>
            {saving ? 'Saving Proposal...' : 'Save Proposal'}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.secondaryButton,
            saving && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <ThemedText style={styles.buttonText}>Cancel</ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

function BadgeEditor({
  initialValue,
  availableTags,
  saving,
  onCancel,
  onSave,
}: Extract<Props, { contentType: 'badge' }>) {
  const theme = useTheme();
  const [form, setForm] = useState(initialValue);
  const update = <Key extends keyof BadgeProposalEdit,>(
    key: Key,
    value: BadgeProposalEdit[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const setClassification = (classification: BadgeProposalEdit['classification']) => {
    const repeatable = classification === 'general' || classification === 'theme';
    setForm((current) => ({
      ...current,
      classification,
      requiredVisits:
        classification === 'general'
          ? '5'
          : classification === 'theme'
            ? '2'
            : '1',
      levelsEnabled: repeatable,
    }));
  };
  const setMessage = (index: number, value: string) => {
    update(
      'congratulationsMessages',
      form.congratulationsMessages.map((message, messageIndex) =>
        messageIndex === index ? value : message,
      ),
    );
  };

  return (
    <ThemedView
      type="backgroundSelected"
      style={[styles.editor, { borderColor: theme.borderStrong }]}>
      <ThemedText accessibilityRole="header" type="subtitle">
        Edit Badge Proposal
      </ThemedText>

      <ThemedView style={styles.twoColumnFields}>
        <ThemedView style={styles.growingField}>
          <FormField
            label="Badge Name"
            value={form.name}
            onChangeText={(value) => update('name', value)}
          />
        </ThemedView>
        <ThemedView style={styles.growingField}>
          <FormField
            label="Stable Key"
            value={form.key}
            onChangeText={(value) => update('key', normalizeBadgeTagValue(value))}
          />
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.field}>
        <ThemedText type="smallBold">Badge Tag</ThemedText>
        <BadgeTagPicker
          availableTags={[...availableTags, form.tag]}
          disabled={saving}
          minimumSelected={1}
          mode="single"
          onChange={(values) => update('tag', values[0] ?? '')}
          selectedTags={form.tag ? [form.tag] : []}
        />
      </ThemedView>

      <FormField
        label="Description"
        value={form.description}
        multiline
        onChangeText={(value) => update('description', value)}
      />

      <ThemedView style={styles.field}>
        <ThemedText type="smallBold">Classification</ThemedText>
        <ThemedView accessibilityRole="radiogroup" style={styles.choiceRow}>
          {(
            [
              ['general', 'General'],
              ['theme', 'Theme'],
              ['special_place', 'Special Place'],
              ['seasonal', 'Seasonal'],
            ] as [BadgeProposalEdit['classification'], string][]
          ).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: form.classification === value }}
              disabled={saving}
              onPress={() => setClassification(value)}
              style={({ pressed }) => [
                styles.choiceButton,
                form.classification === value && styles.choiceButtonSelected,
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.buttonText}>{label}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      </ThemedView>

      <FormField
        label="Required Visits"
        value={form.requiredVisits}
        keyboardType="number-pad"
        onChangeText={(value) => update('requiredVisits', value)}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Repeatable Levels: {form.levelsEnabled ? 'On' : 'Off'}
      </ThemedText>

      <ThemedView style={styles.field}>
        <ThemedText type="smallBold">Congratulations Messages</ThemedText>
        {form.congratulationsMessages.map((message, index) => (
          <ThemedView key={index} style={styles.messageCard}>
            <ThemedView style={styles.messageHeading}>
              <ThemedText type="smallBold">Message {index + 1}</ThemedText>
              <ThemedText
                type="small"
                style={message.length > 160 ? { color: theme.danger } : undefined}>
                {message.length} / 160
              </ThemedText>
            </ThemedView>
            <TextInput
              accessibilityLabel={`Congratulations Message ${index + 1}`}
              multiline
              onChangeText={(value) => setMessage(index, value)}
              style={[
                styles.input,
                styles.messageInput,
                {
                  borderColor:
                    message.length > 160 ? theme.danger : theme.border,
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
              value={message}
            />
            {form.congratulationsMessages.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() =>
                  update(
                    'congratulationsMessages',
                    form.congratulationsMessages.filter(
                      (_, messageIndex) => messageIndex !== index,
                    ),
                  )
                }
                style={({ pressed }) => [
                  styles.compactButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.buttonText}>
                  Remove Message
                </ThemedText>
              </Pressable>
            ) : null}
          </ThemedView>
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() =>
            update('congratulationsMessages', [
              ...form.congratulationsMessages,
              '',
            ])
          }
          style={({ pressed }) => [
            styles.compactButton,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            Add Message
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => onSave(form)}
          style={({ pressed }) => [
            styles.primaryButton,
            saving && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <ThemedText style={styles.buttonText}>
            {saving ? 'Saving Proposal...' : 'Save Proposal'}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.secondaryButton,
            saving && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <ThemedText style={styles.buttonText}>Cancel</ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

export function IngestProposalEditor(props: Props) {
  if (props.contentType === 'location') {
    return <LocationEditor {...props} />;
  }

  return <BadgeEditor {...props} />;
}

export function createLocationProposalEdit(value: {
  name: string;
  key: string;
  description: string;
  funFact?: string;
  source?: string;
  isLore: boolean;
  latitude?: number;
  longitude?: number;
  category?: string;
  mapPinType?: string;
  badges: string[];
}): LocationProposalEdit {
  return {
    name: value.name,
    key: value.key,
    description: value.description,
    funFact: value.funFact ?? '',
    source: value.source ?? '',
    isLore: value.isLore,
    latitude: value.latitude?.toString() ?? '',
    longitude: value.longitude?.toString() ?? '',
    category: getCanonicalLocationCategory(value.category) ?? '',
    mapPinType:
      getCanonicalLocationMapPinType(value.mapPinType) ?? 'other_discoveries',
    badges: value.badges,
  };
}

export function createBadgeProposalEdit(value: BadgeProposalEdit) {
  return value;
}

const styles = StyleSheet.create({
  editor: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 2,
    borderRadius: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  twoColumnFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  growingField: {
    flex: 1,
    minWidth: 240,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  toggle: {
    minHeight: 46,
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  toggleSelected: {
    backgroundColor: Palette.teaGreen,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  choiceButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  choiceButtonSelected: {
    backgroundColor: Palette.lightBronze,
  },
  messageCard: {
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  messageHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.lightBronze,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  compactButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  buttonText: {
    color: Palette.ink,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
