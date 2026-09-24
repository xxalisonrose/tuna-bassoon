import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { useMutation, useQuery } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Classification = 'general' | 'special_place' | 'seasonal';
type RuleType =
  | 'tag'
  | 'location'
  | 'any_location'
  | 'story'
  | 'region'
  | 'same_story'
  | 'same_region';

type RuleInput =
  | { type: 'tag' }
  | { type: 'location'; locationKey: string }
  | { type: 'any_location' }
  | { type: 'story'; storyKey: string }
  | { type: 'region'; regionKey: string }
  | { type: 'same_story' }
  | { type: 'same_region' };

type BadgeFormState = {
  name: string;
  key: string;
  tag: string;
  description: string;
  requiredVisits: string;
  classification: Classification;
  imageKey: string;
  ruleType: RuleType;
  ruleValue: string;
};

type BadgeManagerProps = {
  visible: boolean;
};

const emptyForm: BadgeFormState = {
  name: '',
  key: '',
  tag: '',
  description: '',
  requiredVisits: '',
  classification: 'general',
  imageKey: '',
  ruleType: 'tag',
  ruleValue: '',
};

const classificationLabels: Record<Classification, string> = {
  general: 'General',
  special_place: 'Special place',
  seasonal: 'Seasonal',
};

const ruleLabels: Record<RuleType, string> = {
  tag: 'Tag',
  location: 'Specific location',
  any_location: 'Any location',
  story: 'Specific story',
  region: 'Specific region',
  same_story: 'Same story',
  same_region: 'Same region',
};

const ruleHelp: Record<RuleType, string> = {
  tag: 'Visits to distinct locations carrying the selected tag.',
  location: 'A visit to one selected location.',
  any_location: 'Visits to any distinct locations.',
  story: 'Visits to locations with one story key.',
  region: 'Visits to locations with one region key.',
  same_story: 'Visits must come from the same story group.',
  same_region: 'Visits must come from the same region group.',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'string'
  ) {
    return error.data;
  }

  return fallback;
}

function formatRule(rule: { type: string; locationKey?: string; storyKey?: string; regionKey?: string }) {
  if (rule.type === 'location') return `Specific location: ${rule.locationKey}`;
  if (rule.type === 'story') return `Specific story: ${rule.storyKey}`;
  if (rule.type === 'region') return `Specific region: ${rule.regionKey}`;
  return ruleLabels[rule.type as RuleType] ?? rule.type;
}

function formatDate(value?: number) {
  return value === undefined ? null : new Date(value).toLocaleDateString();
}

function RadioOption({
  label,
  selected,
  hint,
  onPress,
}: {
  label: string;
  selected: boolean;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.radioOption, selected && styles.radioOptionSelected, pressed && styles.pressed]}>
      <ThemedView style={[styles.radioDot, selected && styles.radioDotSelected]} />
      <ThemedText>{label}</ThemedText>
    </Pressable>
  );
}

export function BadgeManager({ visible }: BadgeManagerProps) {
  const theme = useTheme();
  const badges = useQuery(api.adminBadges.getBadgesForAdmin);
  const locations = useQuery(api.adminLocations.getLocationsForAdmin);
  const createBadge = useMutation(api.adminBadges.createBadgeDefinition);
  const updateBadge = useMutation(api.adminBadges.updateBadgeDefinition);
  const setBadgeRetired = useMutation(api.adminBadges.setBadgeRetired);

  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<Id<'badgeDefinitions'> | null>(null);
  const [form, setForm] = useState<BadgeFormState>(emptyForm);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<Id<'badgeDefinitions'> | null>(null);
  const [retiringId, setRetiringId] = useState<Id<'badgeDefinitions'> | null>(null);
  const [locationSearch, setLocationSearch] = useState('');

  const filteredBadges = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!badges || !value) return badges ?? [];
    return badges.filter((badge) => {
      const text = [
        badge.name,
        badge.key,
        badge.tag,
        badge.classification,
        badge.rule.type,
        badge.retired ? 'retired' : 'active',
      ].join(' ').toLowerCase();
      return text.includes(value);
    });
  }, [badges, search]);

  const filteredLocations = useMemo(() => {
    const value = locationSearch.trim().toLowerCase();
    return (locations ?? []).filter((location) => {
      if (!location.key) return false;
      if (!value) return true;
      return `${location.name} ${location.key}`.toLowerCase().includes(value);
    });
  }, [locations, locationSearch]);

  const updateField = <K extends keyof BadgeFormState>(field: K, value: BadgeFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setStatusMessage(null);
  };

  const openCreate = () => {
    setFormMode('create');
    setEditingId(null);
    setForm(emptyForm);
    setStatusMessage(null);
  };

  const openEdit = (badge: (typeof filteredBadges)[number]) => {
    const rule = badge.rule;
    const ruleType = rule.type === 'tag' ? 'tag' : rule.type as RuleType;
    const ruleValue = rule.type === 'location'
      ? rule.locationKey
      : rule.type === 'story'
        ? rule.storyKey
        : rule.type === 'region'
          ? rule.regionKey
          : '';

    setFormMode('edit');
    setEditingId(badge._id);
    setForm({
      name: badge.name,
      key: badge.key,
      tag: badge.tag,
      description: badge.description,
      requiredVisits: String(badge.requiredVisits),
      classification: badge.classification as Classification,
      imageKey: badge.imageKey ?? '',
      ruleType,
      ruleValue,
    });
    setStatusMessage(null);
    setLocationSearch('');
  };

  const closeForm = (clearStatus = true) => {
    setFormMode(null);
    setEditingId(null);
    setForm(emptyForm);
    if (clearStatus) {
      setStatusMessage(null);
    }
    setLocationSearch('');
  };

  const validateForm = () => {
    const required = [form.name, form.key, form.tag, form.description, form.requiredVisits];
    if (required.some((value) => !value.trim())) return 'Please complete all required badge fields.';
    const requiredVisits = Number(form.requiredVisits);
    if (!Number.isInteger(requiredVisits) || requiredVisits < 1 || requiredVisits > 1000) {
      return 'Required visits must be an integer from 1 through 1,000.';
    }
    if (!slugPattern.test(form.key.trim())) return 'Stable key must use lowercase letters, numbers, and single hyphens only.';
    if (form.imageKey.trim() && !slugPattern.test(form.imageKey.trim())) return 'Image key must use lowercase letters, numbers, and single hyphens only.';
    if (form.ruleType === 'location' && !form.ruleValue) return 'Select a location for this rule.';
    if ((form.ruleType === 'story' || form.ruleType === 'region') && !slugPattern.test(form.ruleValue.trim())) {
      return `${ruleLabels[form.ruleType]} key must use lowercase letters, numbers, and single hyphens only.`;
    }
    return null;
  };

  const buildRule = (): RuleInput => {
    if (form.ruleType === 'location') return { type: 'location', locationKey: form.ruleValue };
    if (form.ruleType === 'story') return { type: 'story', storyKey: form.ruleValue.trim() };
    if (form.ruleType === 'region') return { type: 'region', regionKey: form.ruleValue.trim() };
    return { type: form.ruleType } as RuleInput;
  };

  const submitForm = async () => {
    if (saving) return;
    const validation = validateForm();
    if (validation) {
      setStatusMessage(validation);
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    const payload = {
      name: form.name.trim(),
      key: form.key.trim(),
      tag: form.tag.trim(),
      description: form.description.trim(),
      requiredVisits: Number(form.requiredVisits),
      classification: form.classification,
      rule: buildRule(),
      imageKey: form.imageKey.trim() || undefined,
    };

    try {
      if (formMode === 'create') {
        await createBadge(payload);
        setStatusMessage('Badge created.');
      } else if (formMode === 'edit' && editingId) {
        await updateBadge({ ...payload, badgeDefinitionId: editingId });
        setStatusMessage('Badge changes saved.');
      }
      closeForm(false);
    } catch (error) {
      setStatusMessage(getErrorMessage(error, formMode === 'create' ? 'Unable to create this badge.' : 'Unable to save these changes.'));
    } finally {
      setSaving(false);
    }
  };

  const changeRetiredState = async (badge: (typeof filteredBadges)[number]) => {
    if (retiringId) return;
    setRetiringId(badge._id);
    setStatusMessage(null);
    try {
      await setBadgeRetired({ badgeDefinitionId: badge._id, retired: !badge.retired });
      const text = badge.retired ? 'Badge reactivated.' : 'Badge retired.';
      setStatusMessage(text);
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Unable to change this badge's status."));
    } finally {
      setRetiringId(null);
      setConfirmingId(null);
    }
  };

  if (!visible) return null;

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.toolbar}>
        <ThemedText type="smallBold">Badge management</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Add new badge" onPress={openCreate} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>Add new badge</ThemedText>
        </Pressable>
      </ThemedView>

      {statusMessage ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.status}>{statusMessage}</ThemedText> : null}

      <ThemedView type="backgroundElement" style={styles.searchCard}>
        <ThemedText type="smallBold">Search badges</ThemedText>
        <TextInput
          accessibilityLabel="Search badges"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder="Name, key, tag, rule, or status"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.textSecondary, color: theme.text }]}
          value={search}
        />
      </ThemedView>

      <ThemedText themeColor="textSecondary">
        {badges === undefined ? 'Loading badge list...' : `Showing ${filteredBadges.length} of ${badges.length} badges.`}
      </ThemedText>

      {formMode ? (
        <BadgeForm
          form={form}
          formMode={formMode}
          locations={filteredLocations}
          locationSearch={locationSearch}
          saving={saving}
          theme={theme}
          onChange={updateField}
          onLocationSearch={setLocationSearch}
          onSubmit={submitForm}
          onCancel={closeForm}
        />
      ) : badges === undefined ? (
        <ActivityIndicator accessibilityLabel="Loading badges" accessibilityRole="progressbar" />
      ) : filteredBadges.length === 0 ? (
        <ThemedText themeColor="textSecondary">{badges.length === 0 ? 'No badges have been created yet.' : 'No badges match your search.'}</ThemedText>
      ) : (
        <ScrollView nestedScrollEnabled contentContainerStyle={styles.list}>
          {filteredBadges.map((badge) => {
            const retiredDate = formatDate(badge.retiredAt);
            const confirming = confirmingId === badge._id;
            return (
              <ThemedView key={badge._id} type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{badge.name}</ThemedText>
                <ThemedText themeColor="textSecondary">{badge.description}</ThemedText>
                <ThemedText type="small">Key: {badge.key || 'Legacy key missing'}</ThemedText>
                <ThemedText type="small">Tag: {badge.tag}</ThemedText>
                <ThemedText type="small">Required visits: {badge.requiredVisits}</ThemedText>
                <ThemedText type="small">Classification: {classificationLabels[badge.classification as Classification]}</ThemedText>
                <ThemedText type="small">Rule: {formatRule(badge.rule)}</ThemedText>
                {badge.imageKey ? <ThemedText type="small">Image key: {badge.imageKey}</ThemedText> : null}
                <ThemedText type="smallBold" themeColor="textSecondary">{badge.retired ? `Retired${retiredDate ? ` on ${retiredDate}` : ''}` : 'Active'}</ThemedText>
                <ThemedView style={styles.actions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${badge.name}`} onPress={() => openEdit(badge)} style={styles.secondaryButton}>
                    <ThemedText style={styles.secondaryButtonText}>Edit</ThemedText>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={badge.retired ? `Reactivate ${badge.name}` : `Retire ${badge.name}`} onPress={() => setConfirmingId(badge._id)} style={styles.secondaryButton}>
                    <ThemedText style={styles.secondaryButtonText}>{badge.retired ? 'Reactivate' : 'Retire'}</ThemedText>
                  </Pressable>
                </ThemedView>
                {confirming ? (
                  <ThemedView type="backgroundElement" style={styles.confirmation}>
                    <ThemedText accessibilityLiveRegion="polite">{badge.retired ? 'Reactivating this badge allows progress to be calculated again. Existing awards remain.' : 'Retiring this badge stops new progress after the retirement time. Existing awards remain.'}</ThemedText>
                    <ThemedView style={styles.actions}>
                      <Pressable accessibilityRole="button" disabled={retiringId === badge._id} accessibilityState={{ busy: retiringId === badge._id, disabled: retiringId === badge._id }} onPress={() => changeRetiredState(badge)} style={[styles.primaryButton, retiringId === badge._id && styles.disabled]}>
                        <ThemedText style={styles.primaryButtonText}>{badge.retired ? 'Confirm reactivation' : 'Confirm retirement'}</ThemedText>
                      </Pressable>
                      <Pressable accessibilityRole="button" disabled={retiringId === badge._id} onPress={() => setConfirmingId(null)} style={styles.secondaryButton}><ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText></Pressable>
                    </ThemedView>
                  </ThemedView>
                ) : null}
              </ThemedView>
            );
          })}
        </ScrollView>
      )}
    </ThemedView>
  );
}

function BadgeForm({
  form,
  formMode,
  locations,
  locationSearch,
  saving,
  theme,
  onChange,
  onLocationSearch,
  onSubmit,
  onCancel,
}: {
  form: BadgeFormState;
  formMode: 'create' | 'edit';
  locations: Array<{ _id: Id<'locations'>; name: string; key?: string }>;
  locationSearch: string;
  saving: boolean;
  theme: ReturnType<typeof useTheme>;
  onChange: <K extends keyof BadgeFormState>(field: K, value: BadgeFormState[K]) => void;
  onLocationSearch: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const inputStyle = (extra?: object) => [styles.input, extra, { backgroundColor: theme.background, borderColor: theme.textSecondary, color: theme.text }];
  const needsValue = form.ruleType === 'location' || form.ruleType === 'story' || form.ruleType === 'region';

  return (
    <ThemedView type="backgroundElement" style={styles.formCard}>
      <ThemedText type="smallBold">{formMode === 'create' ? 'Add a new badge' : 'Edit badge'}</ThemedText>
      {[
        ['name', 'Name', false],
        ['key', 'Stable key', false],
        ['tag', 'Tag', false],
        ['imageKey', 'Image key (optional)', false],
      ].map(([field, label]) => (
        <TextInput key={field as string} accessibilityLabel={label as string} autoCapitalize="none" onChangeText={(value) => onChange(field as keyof BadgeFormState, value)} placeholder={label as string} placeholderTextColor={theme.textSecondary} style={inputStyle()} value={form[field as keyof BadgeFormState] as string} />
      ))}
      <TextInput accessibilityLabel="Description" multiline onChangeText={(value) => onChange('description', value)} placeholder="Description" placeholderTextColor={theme.textSecondary} style={inputStyle(styles.textArea)} value={form.description} />
      <TextInput accessibilityLabel="Required visits" keyboardType="number-pad" onChangeText={(value) => onChange('requiredVisits', value)} placeholder="Required visits" placeholderTextColor={theme.textSecondary} style={inputStyle()} value={form.requiredVisits} />

      <ThemedText type="smallBold">Classification</ThemedText>
      <ThemedView accessibilityRole="radiogroup" accessibilityLabel="Badge classification" style={styles.radioGroup}>
        {(Object.keys(classificationLabels) as Classification[]).map((value) => <RadioOption key={value} label={classificationLabels[value]} selected={form.classification === value} hint={`Use the ${classificationLabels[value].toLowerCase()} classification.`} onPress={() => onChange('classification', value)} />)}
      </ThemedView>
      {form.classification === 'seasonal' ? <ThemedText themeColor="textSecondary">Seasonal availability windows are managed separately. Until a window is added, this badge remains available.</ThemedText> : null}

      <ThemedText type="smallBold">Rule</ThemedText>
      <ThemedView accessibilityRole="radiogroup" accessibilityLabel="Badge rule" style={styles.radioGroup}>
        {(Object.keys(ruleLabels) as RuleType[]).map((value) => <RadioOption key={value} label={ruleLabels[value]} selected={form.ruleType === value} hint={ruleHelp[value]} onPress={() => onChange('ruleType', value)} />)}
      </ThemedView>
      <ThemedText themeColor="textSecondary">{ruleHelp[form.ruleType]}</ThemedText>

      {form.ruleType === 'location' ? (
        <ThemedView style={styles.locationPicker}>
          <TextInput accessibilityLabel="Search locations for badge rule" onChangeText={onLocationSearch} placeholder="Search location name or key" placeholderTextColor={theme.textSecondary} style={inputStyle()} value={locationSearch} />
          <ThemedView accessibilityRole="radiogroup" accessibilityLabel="Badge rule location" style={styles.radioGroup}>
            {locations.map((location) => <RadioOption key={location._id} label={`${location.name} (${location.key})`} selected={form.ruleValue === location.key} hint="Select this stable location key." onPress={() => onChange('ruleValue', location.key ?? '')} />)}
          </ThemedView>
          {form.ruleValue ? <ThemedText type="small">Selected location key: {form.ruleValue}</ThemedText> : null}
        </ThemedView>
      ) : needsValue ? (
        <TextInput accessibilityLabel={`${ruleLabels[form.ruleType]} key`} autoCapitalize="none" autoCorrect={false} onChangeText={(value) => onChange('ruleValue', value)} placeholder={`${ruleLabels[form.ruleType]} key`} placeholderTextColor={theme.textSecondary} style={inputStyle()} value={form.ruleValue} />
      ) : null}

      <ThemedView style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityState={{ busy: saving, disabled: saving }} disabled={saving} onPress={onSubmit} style={[styles.primaryButton, saving && styles.disabled]}><ThemedText style={styles.primaryButtonText}>{saving ? 'Saving...' : formMode === 'create' ? 'Create badge' : 'Save changes'}</ThemedText></Pressable>
        <Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={styles.secondaryButton}><ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText></Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  searchCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.two },
  input: { minHeight: 48, borderWidth: 1, borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  formCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.two },
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.two },
  list: { gap: Spacing.two, paddingBottom: Spacing.five },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  primaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Spacing.two, backgroundColor: '#A51C30' },
  primaryButtonText: { color: '#FFFFFF', textAlign: 'center' },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Spacing.two, backgroundColor: '#E0E1E6' },
  secondaryButtonText: { color: '#111111', textAlign: 'center' },
  radioGroup: { gap: Spacing.one },
  radioOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.two, borderRadius: Spacing.two },
  radioOptionSelected: { backgroundColor: '#E0E1E6' },
  radioDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#777777' },
  radioDotSelected: { borderColor: '#A51C30', backgroundColor: '#A51C30' },
  locationPicker: { gap: Spacing.two },
  confirmation: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.two },
  status: { lineHeight: 22 },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
});
