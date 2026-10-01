import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { useMutation, useQuery } from 'convex/react';

import {
  BadgeArtwork,
  badgeArtworkOptions,
  hasBadgeArtwork,
} from '@/components/badge-artwork';
import {
  badgeArtworkUploadsSupported,
  pickBadgeArtwork,
} from '@/components/admin/badge-artwork-picker';
import type { BadgeArtworkAsset } from '@/components/admin/badge-artwork-picker.types';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AvailabilityWindowManager } from '@/components/admin/availability-window-manager';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_UPLOADED_ARTWORK_BYTES = 5 * 1024 * 1024;
const ALLOWED_ARTWORK_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

type Classification = 'general' | 'special_place' | 'seasonal';
type ClassificationFilter = Classification | 'all';
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

type AnnualSeriesState =
  | {
      _id: Id<'badgeAnnualSeries'>;
      key: string;
      name: string;
      enabled: boolean;
      editions: Array<{
        badgeDefinitionId: Id<'badgeDefinitions'>;
        name: string;
        key?: string;
        editionYear?: number;
        retired: boolean;
      }>;
    }
  | null
  | undefined;

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

const classificationFilters: Array<{
  value: ClassificationFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'special_place', label: 'Special place' },
];

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

function suggestAnnualSeriesName(name: string) {
  return name.trim().replace(/\s+\d{4}$/, '');
}

function suggestAnnualSeriesKey(key: string) {
  return key.trim().replace(/-\d{4}$/, '');
}

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

function getArtworkContentType(
  asset: BadgeArtworkAsset,
) {
  const declaredType = asset.mimeType?.toLowerCase();

  if (
    declaredType !== undefined &&
    ALLOWED_ARTWORK_CONTENT_TYPES.some(
      (contentType) => contentType === declaredType,
    )
  ) {
    return declaredType;
  }

  const lowerName = asset.name.toLowerCase();

  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lowerName.endsWith('.webp')) return 'image/webp';

  return undefined;
}

function formatArtworkSize(size?: number) {
  if (size === undefined) return 'Size unavailable';
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
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
  const generateArtworkUploadUrl = useMutation(
    api.adminBadgeArtwork.generateArtworkUploadUrl,
  );
  const setBadgeArtwork = useMutation(
    api.adminBadgeArtwork.setBadgeArtwork,
  );
  const removeBadgeArtwork = useMutation(
    api.adminBadgeArtwork.removeBadgeArtwork,
  );
  const enableAnnualRepeat = useMutation(
    api.annualBadgeEditions.enableAnnualRepeat,
  );
  const disableAnnualRepeat = useMutation(
    api.annualBadgeEditions.disableAnnualRepeat,
  );

  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] =
    useState<ClassificationFilter>('all');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<Id<'badgeDefinitions'> | null>(null);
  const [form, setForm] = useState<BadgeFormState>(emptyForm);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<Id<'badgeDefinitions'> | null>(null);
  const [retiringId, setRetiringId] = useState<Id<'badgeDefinitions'> | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [annualRepeatEnabled, setAnnualRepeatEnabled] =
    useState(false);
  const [annualSeriesName, setAnnualSeriesName] = useState('');
  const [annualSeriesKey, setAnnualSeriesKey] = useState('');
  const [annualSaving, setAnnualSaving] = useState(false);
  const [pendingArtwork, setPendingArtwork] =
    useState<BadgeArtworkAsset | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] =
    useState<string | undefined>(undefined);
  const [removeUploadedArtwork, setRemoveUploadedArtwork] =
    useState(false);
  const [pickingArtwork, setPickingArtwork] = useState(false);

  const annualSeries = useQuery(
    api.annualBadgeEditions.getAnnualSeriesForAdmin,
    editingId === null ? 'skip' : { badgeDefinitionId: editingId },
  ) as AnnualSeriesState;
  const editingBadge = editingId === null
    ? undefined
    : badges?.find((badge) => badge._id === editingId);
  const savedBadgeIsSeasonal =
    editingBadge?.classification === 'seasonal';

  useEffect(() => {
    if (formMode !== 'edit' || annualSeries == null) {
      return;
    }

    setAnnualRepeatEnabled(
      annualSeries.enabled && savedBadgeIsSeasonal,
    );
    setAnnualSeriesName(annualSeries.name);
    setAnnualSeriesKey(annualSeries.key);
  }, [annualSeries, formMode, savedBadgeIsSeasonal]);

  const filteredBadges = useMemo(() => {
    const value = search.trim().toLowerCase();

    return (badges ?? []).filter((badge) => {
      if (
        classificationFilter !== 'all' &&
        badge.classification !== classificationFilter
      ) {
        return false;
      }

      if (!value) {
        return true;
      }

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
  }, [badges, classificationFilter, search]);

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
    setAnnualRepeatEnabled(false);
    setAnnualSeriesName('');
    setAnnualSeriesKey('');
    setPendingArtwork(null);
    setUploadedImageUrl(undefined);
    setRemoveUploadedArtwork(false);
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
    setAnnualRepeatEnabled(badge.annualSeriesId !== undefined);
    setAnnualSeriesName(suggestAnnualSeriesName(badge.name));
    setAnnualSeriesKey(suggestAnnualSeriesKey(badge.key));
    setPendingArtwork(null);
    setUploadedImageUrl(badge.imageUrl);
    setRemoveUploadedArtwork(false);
  };

  const closeForm = (clearStatus = true) => {
    setFormMode(null);
    setEditingId(null);
    setForm(emptyForm);
    if (clearStatus) {
      setStatusMessage(null);
    }
    setLocationSearch('');
    setAnnualRepeatEnabled(false);
    setAnnualSeriesName('');
    setAnnualSeriesKey('');
    setPendingArtwork(null);
    setUploadedImageUrl(undefined);
    setRemoveUploadedArtwork(false);
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
    if (
      form.classification === 'seasonal' &&
      annualRepeatEnabled &&
      annualSeries == null
    ) {
      if (!annualSeriesName.trim()) {
        return 'Enter an annual series name.';
      }

      if (!slugPattern.test(annualSeriesKey.trim())) {
        return 'Annual series key must use lowercase letters, numbers, and single hyphens only.';
      }
    }

    return null;
  };

  const buildRule = (): RuleInput => {
    if (form.ruleType === 'location') return { type: 'location', locationKey: form.ruleValue };
    if (form.ruleType === 'story') return { type: 'story', storyKey: form.ruleValue.trim() };
    if (form.ruleType === 'region') return { type: 'region', regionKey: form.ruleValue.trim() };
    return { type: form.ruleType } as RuleInput;
  };

  const changeAnnualRepeatEnabled = (enabled: boolean) => {
    setAnnualRepeatEnabled(enabled);
    setStatusMessage(null);

    if (enabled) {
      setAnnualSeriesName((current) =>
        current || suggestAnnualSeriesName(form.name),
      );
      setAnnualSeriesKey((current) =>
        current || suggestAnnualSeriesKey(form.key),
      );
    }
  };

  const saveAnnualRepeat = async (
    badgeDefinitionId: Id<'badgeDefinitions'>,
  ) => {
    if (form.classification !== 'seasonal') {
      return;
    }

    setAnnualSaving(true);

    try {
      if (annualSeries != null) {
        if (annualRepeatEnabled && !annualSeries.enabled) {
          await enableAnnualRepeat({
            badgeDefinitionId,
            seriesName: annualSeries.name,
            seriesKey: annualSeries.key,
          });
        } else if (!annualRepeatEnabled && annualSeries.enabled) {
          await disableAnnualRepeat({ badgeDefinitionId });
        }

        return;
      }

      if (annualRepeatEnabled) {
        await enableAnnualRepeat({
          badgeDefinitionId,
          seriesName: annualSeriesName.trim(),
          seriesKey: annualSeriesKey.trim(),
        });
      }
    } finally {
      setAnnualSaving(false);
    }
  };

  const chooseUploadedArtwork = async () => {
    if (saving || pickingArtwork) return;

    if (!badgeArtworkUploadsSupported) {
      setStatusMessage(
        'Badge artwork uploads are available in the web content portal.',
      );
      return;
    }

    setPickingArtwork(true);
    setStatusMessage(null);

    try {
      const result = await pickBadgeArtwork();

      if (result.canceled) return;

      const asset = result.asset;
      const contentType = getArtworkContentType(asset);

      if (contentType === undefined) {
        setStatusMessage(
          'Choose a PNG, JPEG, or WebP image for badge artwork.',
        );
        return;
      }

      if (
        asset.size !== undefined &&
        asset.size > MAX_UPLOADED_ARTWORK_BYTES
      ) {
        setStatusMessage('Badge artwork must be 5 MB or smaller.');
        return;
      }

      setPendingArtwork(asset);
      setRemoveUploadedArtwork(false);
    } catch (error) {
      setStatusMessage(
        getErrorMessage(error, 'Unable to choose badge artwork.'),
      );
    } finally {
      setPickingArtwork(false);
    }
  };

  const saveArtworkChanges = async (
    badgeDefinitionId: Id<'badgeDefinitions'>,
  ) => {
    if (pendingArtwork !== null) {
      const contentType = getArtworkContentType(pendingArtwork);

      if (contentType === undefined) {
        throw new Error('Unsupported badge artwork type.');
      }

      const uploadUrl = await generateArtworkUploadUrl();
      const body = pendingArtwork.file ??
        await fetch(pendingArtwork.uri).then((response) => {
          if (!response.ok) {
            throw new Error('Unable to read the selected artwork.');
          }
          return response.blob();
        });
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body,
      });

      if (!uploadResponse.ok) {
        throw new Error('Unable to upload the selected artwork.');
      }

      const uploadResult = await uploadResponse.json() as {
        storageId: Id<'_storage'>;
      };
      const savedArtwork = await setBadgeArtwork({
        badgeDefinitionId,
        storageId: uploadResult.storageId,
      });

      setUploadedImageUrl(savedArtwork.imageUrl ?? undefined);
      setPendingArtwork(null);
      setRemoveUploadedArtwork(false);
      return;
    }

    if (removeUploadedArtwork && uploadedImageUrl !== undefined) {
      await removeBadgeArtwork({ badgeDefinitionId });
      setUploadedImageUrl(undefined);
      setRemoveUploadedArtwork(false);
    }
  };

  const submitForm = async (
    keepFormOpenForAvailability = false,
  ) => {
    if (saving) return null;
    const validation = validateForm();
    if (validation) {
      setStatusMessage(validation);
      return null;
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
    let savedBadgeId = editingId;

    try {
      if (formMode === 'create') {
        savedBadgeId = await createBadge(payload);
        setFormMode('edit');
        setEditingId(savedBadgeId);
      } else if (formMode === 'edit' && editingId) {
        savedBadgeId = await updateBadge({
          ...payload,
          badgeDefinitionId: editingId,
        });
      }

      if (savedBadgeId === null) {
        throw new Error('Badge definition was not saved.');
      }

      await saveArtworkChanges(savedBadgeId);

      if (
        form.classification === 'seasonal' &&
        availabilityBadgeId !== null
      ) {
        await saveAnnualRepeat(savedBadgeId);
      }

      setStatusMessage(
        form.classification === 'seasonal'
          ? 'Badge changes saved. Seasonal availability is ready below.'
          : formMode === 'create'
            ? 'Badge created.'
            : 'Badge changes saved.',
      );

      if (
        keepFormOpenForAvailability &&
        form.classification === 'seasonal'
      ) {
        setFormMode('edit');
        setEditingId(savedBadgeId);
      } else {
        closeForm(false);
      }

      return savedBadgeId;
    } catch (error) {
      const fallback =
        formMode === 'create' && savedBadgeId !== null
          ? 'The badge was created, but its artwork or related settings could not be saved. Try saving again.'
          : formMode === 'create'
            ? 'Unable to create this badge.'
            : 'Unable to save these changes.';

      setStatusMessage(getErrorMessage(error, fallback));
      return null;
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

  const availabilityBadgeId =
    formMode === 'edit' &&
    editingId !== null &&
    (
      badges?.some(
        (badge) =>
          badge._id === editingId &&
          badge.classification === 'seasonal',
      ) ||
      (
        form.classification === 'seasonal' &&
        annualSeries != null
      )
    )
      ? editingId
      : null;

  const annualSeriesLoading =
    editingId !== null && annualSeries === undefined;
  const formBusy =
    saving || annualSaving || annualSeriesLoading || pickingArtwork;

  if (!visible) return null;

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.toolbar}>
        <ThemedText type="smallBold">Badge management</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Add new badge" onPress={openCreate} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>Add new badge</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView
        accessibilityLabel="Filter badges by classification"
        accessibilityRole="radiogroup"
        style={styles.filterRow}>
        {classificationFilters.map((filter) => {
          const selected = classificationFilter === filter.value;

          return (
            <Pressable
              key={filter.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setClassificationFilter(filter.value)}
              style={({ pressed }) => [
                styles.filterButton,
                selected && styles.filterButtonSelected,
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={selected ? styles.filterButtonTextSelected : undefined}>
                {filter.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>

      {statusMessage ? <ThemedText accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.status}>{statusMessage}</ThemedText> : null}

      {!formMode ? (
        <>
          <ThemedView type="backgroundElement" style={styles.searchCard}>
            <ThemedText type="smallBold">Search badges</ThemedText>
            <TextInput
              accessibilityLabel="Search badges"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearch}
              placeholder="Name, key, tag, rule, or status"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={search}
            />
          </ThemedView>

          <ThemedText themeColor="textSecondary">
            {badges === undefined
              ? 'Loading badge list...'
              : `Showing ${filteredBadges.length} of ${badges.length} badges.`}
          </ThemedText>
        </>
      ) : null}

      {formMode ? (
        <BadgeForm
          annualRepeatEnabled={annualRepeatEnabled}
          annualSeries={annualSeries}
          annualSeriesKey={annualSeriesKey}
          annualSeriesName={annualSeriesName}
          savedBadgeIsSeasonal={savedBadgeIsSeasonal}
          availabilityBadgeId={availabilityBadgeId}
          form={form}
          formMode={formMode}
          locations={filteredLocations}
          locationSearch={locationSearch}
          pendingArtwork={pendingArtwork}
          removeUploadedArtwork={removeUploadedArtwork}
          saving={formBusy}
          theme={theme}
          uploadedImageUrl={uploadedImageUrl}
          onAnnualRepeatChange={changeAnnualRepeatEnabled}
          onAnnualSeriesKeyChange={(value) => {
            setAnnualSeriesKey(value);
            setStatusMessage(null);
          }}
          onAnnualSeriesNameChange={(value) => {
            setAnnualSeriesName(value);
            setStatusMessage(null);
          }}
          onChange={updateField}
          onChooseUploadedArtwork={chooseUploadedArtwork}
          onClearPendingArtwork={() => setPendingArtwork(null)}
          onLocationSearch={setLocationSearch}
          onRemoveUploadedArtwork={() => {
            setPendingArtwork(null);
            setRemoveUploadedArtwork(true);
            setStatusMessage(null);
          }}
          onRestoreUploadedArtwork={() => {
            setRemoveUploadedArtwork(false);
            setStatusMessage(null);
          }}
          onSubmit={() => submitForm(false)}
          onPrepareBadgeForAvailability={() => submitForm(true)}
          onAvailabilityWindowSaved={async (badgeDefinitionId) => {
            await saveAnnualRepeat(badgeDefinitionId);
            setStatusMessage(
              annualRepeatEnabled
                ? 'Badge, availability window, and yearly repeat saved.'
                : 'Badge and availability window saved.',
            );
            closeForm(false);
          }}
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
                <ThemedView style={styles.badgeListHeader}>
                  <BadgeArtwork
                    earned
                    imageKey={badge.imageKey}
                    imageUrl={badge.imageUrl}
                    name={badge.name}
                  />
                  <ThemedView style={styles.badgeListCopy}>
                    <ThemedText type="smallBold">{badge.name}</ThemedText>
                    <ThemedText themeColor="textSecondary">{badge.description}</ThemedText>
                  </ThemedView>
                </ThemedView>
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
  annualRepeatEnabled,
  annualSeries,
  annualSeriesKey,
  annualSeriesName,
  savedBadgeIsSeasonal,
  availabilityBadgeId,
  form,
  formMode,
  locations,
  locationSearch,
  pendingArtwork,
  removeUploadedArtwork,
  saving,
  theme,
  uploadedImageUrl,
  onAnnualRepeatChange,
  onAnnualSeriesKeyChange,
  onAnnualSeriesNameChange,
  onChange,
  onChooseUploadedArtwork,
  onClearPendingArtwork,
  onLocationSearch,
  onRemoveUploadedArtwork,
  onRestoreUploadedArtwork,
  onSubmit,
  onPrepareBadgeForAvailability,
  onAvailabilityWindowSaved,
  onCancel,
}: {
  annualRepeatEnabled: boolean;
  annualSeries: AnnualSeriesState;
  annualSeriesKey: string;
  annualSeriesName: string;
  savedBadgeIsSeasonal: boolean;
  availabilityBadgeId: Id<'badgeDefinitions'> | null;
  form: BadgeFormState;
  formMode: 'create' | 'edit';
  locations: Array<{ _id: Id<'locations'>; name: string; key?: string }>;
  locationSearch: string;
  pendingArtwork: BadgeArtworkAsset | null;
  removeUploadedArtwork: boolean;
  saving: boolean;
  theme: ReturnType<typeof useTheme>;
  uploadedImageUrl?: string;
  onAnnualRepeatChange: (enabled: boolean) => void;
  onAnnualSeriesKeyChange: (value: string) => void;
  onAnnualSeriesNameChange: (value: string) => void;
  onChange: <K extends keyof BadgeFormState>(field: K, value: BadgeFormState[K]) => void;
  onChooseUploadedArtwork: () => void;
  onClearPendingArtwork: () => void;
  onLocationSearch: (value: string) => void;
  onRemoveUploadedArtwork: () => void;
  onRestoreUploadedArtwork: () => void;
  onSubmit: () => void;
  onPrepareBadgeForAvailability: () => Promise<Id<'badgeDefinitions'> | null>;
  onAvailabilityWindowSaved: (
    badgeDefinitionId: Id<'badgeDefinitions'>,
  ) => Promise<void> | void;
  onCancel: () => void;
}) {
  const inputStyle = (extra?: object) => [styles.input, extra, { backgroundColor: theme.background, borderColor: theme.textSecondary, color: theme.text }];
  const needsValue = form.ruleType === 'location' || form.ruleType === 'story' || form.ruleType === 'region';
  const normalizedImageKey = form.imageKey.trim().toLowerCase();
  const selectedArtwork = badgeArtworkOptions.find(
    (option) => option.key === normalizedImageKey,
  );
  const hasUnregisteredArtworkKey =
    normalizedImageKey.length > 0 &&
    !hasBadgeArtwork(normalizedImageKey);
  const activeUploadedImageUrl = pendingArtwork?.uri ??
    (removeUploadedArtwork ? undefined : uploadedImageUrl);

  return (
    <ThemedView type="backgroundElement" style={styles.formCard}>
      <ThemedText type="smallBold">{formMode === 'create' ? 'Add a new badge' : 'Edit badge'}</ThemedText>
      {[
        ['name', 'Name'],
        ['key', 'Stable key'],
        ['tag', 'Tag'],
      ].map(([field, label]) => (
        <ThemedView
          key={field as string}
          style={styles.fieldGroup}>
          <ThemedText type="smallBold">
            {label as string}
          </ThemedText>
          <TextInput
            accessibilityLabel={label as string}
            autoCapitalize="none"
            onChangeText={(value) =>
              onChange(
                field as keyof BadgeFormState,
                value,
              )
            }
            placeholder={label as string}
            placeholderTextColor={theme.textSecondary}
            style={inputStyle()}
            value={
              form[field as keyof BadgeFormState] as string
            }
          />
        </ThemedView>
      ))}

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">
          Badge artwork (optional)
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Choose bundled artwork for this badge. With no custom
          artwork, Collection uses the badge name's first letter.
        </ThemedText>

        <ThemedView
          accessibilityLabel="Badge artwork"
          accessibilityRole="radiogroup"
          style={styles.artworkOptions}>
          <Pressable
            accessibilityHint="Use the badge name's first letter in Collection."
            accessibilityLabel="No custom artwork"
            accessibilityRole="radio"
            accessibilityState={{
              selected: normalizedImageKey.length === 0,
            }}
            onPress={() => onChange('imageKey', '')}
            style={({ pressed }) => [
              styles.artworkOption,
              normalizedImageKey.length === 0 &&
                styles.artworkOptionSelected,
              pressed && styles.pressed,
            ]}>
            <ThemedView style={styles.noArtworkPreview}>
              <ThemedText type="smallBold">None</ThemedText>
            </ThemedView>
            <ThemedText type="smallBold">No custom artwork</ThemedText>
          </Pressable>

          {badgeArtworkOptions.map((option) => {
            const selected = normalizedImageKey === option.key;

            return (
              <Pressable
                key={option.key}
                accessibilityHint={`Use ${option.label} artwork for this badge.`}
                accessibilityLabel={option.label}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onChange('imageKey', option.key)}
                style={({ pressed }) => [
                  styles.artworkOption,
                  selected && styles.artworkOptionSelected,
                  pressed && styles.pressed,
                ]}>
                <BadgeArtwork
                  earned
                  imageKey={option.key}
                  name={option.label}
                />
                <ThemedText type="smallBold">
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}

          {hasUnregisteredArtworkKey ? (
            <Pressable
              accessibilityHint="Keep this existing image key. Collection will use its letter fallback until matching artwork is bundled."
              accessibilityLabel={`Keep existing image key ${normalizedImageKey}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: true }}
              onPress={() => onChange('imageKey', normalizedImageKey)}
              style={[
                styles.artworkOption,
                styles.artworkOptionSelected,
              ]}>
              <BadgeArtwork
                earned
                imageKey={normalizedImageKey}
                name={form.name || 'Badge'}
              />
              <ThemedText type="smallBold">Existing key</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {normalizedImageKey}
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>

        <ThemedView
          type="backgroundElement"
          style={styles.artworkUploadCard}>
          <ThemedText type="smallBold">Upload custom artwork</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            PNG, JPEG, or WebP up to 5 MB. Square artwork works best.
            Uploaded artwork takes priority over the bundled selection.
          </ThemedText>
          <ThemedView style={styles.actions}>
            <Pressable
              accessibilityLabel={
                activeUploadedImageUrl === undefined
                  ? 'Choose custom badge artwork'
                  : 'Replace custom badge artwork'
              }
              accessibilityRole="button"
              disabled={saving}
              onPress={onChooseUploadedArtwork}
              style={[
                styles.secondaryButton,
                saving && styles.disabled,
              ]}>
              <ThemedText style={styles.secondaryButtonText}>
                {pendingArtwork !== null
                  ? 'Choose a different image'
                  : uploadedImageUrl !== undefined &&
                      !removeUploadedArtwork
                    ? 'Replace uploaded artwork'
                    : 'Choose image'}
              </ThemedText>
            </Pressable>

            {pendingArtwork !== null ? (
              <Pressable
                accessibilityLabel="Clear selected badge artwork"
                accessibilityRole="button"
                disabled={saving}
                onPress={onClearPendingArtwork}
                style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>
                  Clear selection
                </ThemedText>
              </Pressable>
            ) : uploadedImageUrl !== undefined &&
                !removeUploadedArtwork ? (
              <Pressable
                accessibilityLabel="Remove uploaded badge artwork"
                accessibilityRole="button"
                disabled={saving}
                onPress={onRemoveUploadedArtwork}
                style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>
                  Remove uploaded artwork
                </ThemedText>
              </Pressable>
            ) : removeUploadedArtwork &&
                uploadedImageUrl !== undefined ? (
              <Pressable
                accessibilityLabel="Keep uploaded badge artwork"
                accessibilityRole="button"
                disabled={saving}
                onPress={onRestoreUploadedArtwork}
                style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>
                  Keep uploaded artwork
                </ThemedText>
              </Pressable>
            ) : null}
          </ThemedView>

          {pendingArtwork !== null ? (
            <ThemedText type="small" themeColor="textSecondary">
              Selected: {pendingArtwork.name} ·{' '}
              {formatArtworkSize(pendingArtwork.size)}. The image will
              upload when the badge is saved.
            </ThemedText>
          ) : removeUploadedArtwork ? (
            <ThemedText type="small" themeColor="textSecondary">
              The uploaded image will be removed when the badge is
              saved. The bundled selection or letter fallback will be
              used instead.
            </ThemedText>
          ) : uploadedImageUrl !== undefined ? (
            <ThemedText type="small" themeColor="textSecondary">
              Uploaded artwork is currently active.
            </ThemedText>
          ) : null}
        </ThemedView>

        <ThemedView
          type="backgroundElement"
          style={styles.artworkPreview}>
          <BadgeArtwork
            earned
            imageKey={normalizedImageKey || undefined}
            imageUrl={activeUploadedImageUrl}
            name={form.name || 'Badge'}
          />
          <ThemedView style={styles.artworkPreviewCopy}>
            <ThemedText type="smallBold">Collection preview</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {activeUploadedImageUrl !== undefined
                ? pendingArtwork !== null
                  ? 'Selected upload preview. Save the badge to publish it.'
                  : 'Uploaded artwork is active.'
                : selectedArtwork !== undefined
                  ? `${selectedArtwork.label} artwork selected.`
                  : hasUnregisteredArtworkKey
                    ? `The unregistered key “${normalizedImageKey}” currently uses the letter fallback.`
                    : 'No custom artwork selected; the letter fallback will be used.'}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">
          Description
        </ThemedText>
        <TextInput
          accessibilityLabel="Description"
          multiline
          onChangeText={(value) =>
            onChange('description', value)
          }
          placeholder="Description"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle(styles.textArea)}
          value={form.description}
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">
          Required visits
        </ThemedText>
        <TextInput
          accessibilityLabel="Required visits"
          keyboardType="number-pad"
          onChangeText={(value) =>
            onChange('requiredVisits', value)
          }
          placeholder="Required visits"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle()}
          value={form.requiredVisits}
        />
      </ThemedView>

      <ThemedText type="smallBold">Classification</ThemedText>
      <ThemedView accessibilityRole="radiogroup" accessibilityLabel="Badge classification" style={styles.radioGroup}>
        {(Object.keys(classificationLabels) as Classification[]).map((value) => <RadioOption key={value} label={classificationLabels[value]} selected={form.classification === value} hint={`Use the ${classificationLabels[value].toLowerCase()} classification.`} onPress={() => onChange('classification', value)} />)}
      </ThemedView>
      {availabilityBadgeId !== null && form.classification !== 'seasonal' ? (
      <ThemedText themeColor="textSecondary">
        This saved badge is seasonal. Remove its future windows before
        saving another classification. A window that has started locks
        the badge as seasonal.
      </ThemedText>
    ) : null}

    {form.classification === 'seasonal' ? (
      <ThemedView style={styles.annualSection}>
        <ThemedText type="smallBold">Yearly repetition</ThemedText>
        <ThemedText themeColor="textSecondary">
          Create a separate, independently editable badge edition for
          each year. Previous awards and progress remain attached to
          their original edition.
        </ThemedText>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Repeat this seasonal badge every year"
          accessibilityState={{
            checked: annualRepeatEnabled,
            disabled: saving,
          }}
          disabled={saving}
          onPress={() =>
            onAnnualRepeatChange(!annualRepeatEnabled)
          }
          style={({ pressed }) => [
            styles.checkboxRow,
            pressed && styles.pressed,
          ]}>
          <ThemedView
            style={[
              styles.checkbox,
              annualRepeatEnabled && styles.checkboxSelected,
            ]}>
            <ThemedText style={styles.checkboxMark}>
              {annualRepeatEnabled ? '✓' : ''}
            </ThemedText>
          </ThemedView>
          <ThemedText>Repeat yearly</ThemedText>
        </Pressable>

        {annualRepeatEnabled && annualSeries == null ? (
          <>
            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="smallBold">
                Annual series name
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                The shared name without a year, such as Christmas.
              </ThemedText>
              <TextInput
                accessibilityLabel="Annual series name"
                autoCapitalize="words"
                editable={!saving}
                onChangeText={onAnnualSeriesNameChange}
                placeholder="Example: Christmas"
                placeholderTextColor={theme.textSecondary}
                style={inputStyle()}
                value={annualSeriesName}
              />
            </ThemedView>

            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="smallBold">
                Annual series stable key
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                The shared lowercase identifier without a year, such as
                christmas.
              </ThemedText>
              <TextInput
                accessibilityLabel="Annual series stable key"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
                onChangeText={onAnnualSeriesKeyChange}
                placeholder="Example: christmas"
                placeholderTextColor={theme.textSecondary}
                style={inputStyle()}
                value={annualSeriesKey}
              />
            </ThemedView>
          </>
        ) : null}

        {annualSeries !== undefined && annualSeries !== null ? (
          <ThemedView style={styles.editionList}>
            <ThemedText type="small" themeColor="textSecondary">
              This badge was previously connected to this annual series.
              Its identity and existing editions are retained when yearly
              repetition is paused.
            </ThemedText>
            <ThemedText type="smallBold">
              Series status:{' '}
              {annualSeries.enabled && savedBadgeIsSeasonal
                ? 'Repeating'
                : 'Paused'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Series name: {annualSeries.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Series stable key: {annualSeries.key}
            </ThemedText>
            {annualSeries.editions.map((edition) => (
              <ThemedView
                key={edition.badgeDefinitionId}
                type="backgroundElement"
                style={styles.editionCard}>
                <ThemedText type="smallBold">
                  {edition.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {edition.editionYear ?? 'Year unavailable'} ·{' '}
                  {edition.key ?? 'Key unavailable'}
                  {edition.retired ? ' · Retired' : ''}
                </ThemedText>
              </ThemedView>
            ))}
            <ThemedText type="small" themeColor="textSecondary">
              Save changes to apply a change to yearly repetition.
            </ThemedText>
          </ThemedView>
        ) : null}
      </ThemedView>
    ) : null}

    <AvailabilityWindowManager
      badgeDefinitionId={availabilityBadgeId}
      prepareBadgeBeforeCreate={
        formMode === 'edit' &&
        form.classification === 'seasonal' &&
        !savedBadgeIsSeasonal
      }
      visible={
        form.classification === 'seasonal' ||
        availabilityBadgeId !== null
      }
      onPrepareBadge={onPrepareBadgeForAvailability}
      onCombinedSaveComplete={onAvailabilityWindowSaved}
    />

      <ThemedText type="smallBold">Rule</ThemedText>
      <ThemedView accessibilityRole="radiogroup" accessibilityLabel="Badge rule" style={styles.radioGroup}>
        {(Object.keys(ruleLabels) as RuleType[]).map((value) => <RadioOption key={value} label={ruleLabels[value]} selected={form.ruleType === value} hint={ruleHelp[value]} onPress={() => onChange('ruleType', value)} />)}
      </ThemedView>
      <ThemedText themeColor="textSecondary">{ruleHelp[form.ruleType]}</ThemedText>

      {form.ruleType === 'location' ? (
        <ThemedView style={styles.locationPicker}>
          <ThemedText type="smallBold">
            Search locations for this rule
          </ThemedText>
          <TextInput
            accessibilityLabel="Search locations for badge rule"
            onChangeText={onLocationSearch}
            placeholder="Search location name or key"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle()}
            value={locationSearch}
          />
          <ThemedView accessibilityRole="radiogroup" accessibilityLabel="Badge rule location" style={styles.radioGroup}>
            {locations.map((location) => <RadioOption key={location._id} label={`${location.name} (${location.key})`} selected={form.ruleValue === location.key} hint="Select this stable location key." onPress={() => onChange('ruleValue', location.key ?? '')} />)}
          </ThemedView>
          {form.ruleValue ? <ThemedText type="small">Selected location key: {form.ruleValue}</ThemedText> : null}
        </ThemedView>
      ) : needsValue ? (
        <ThemedView style={styles.fieldGroup}>
          <ThemedText type="smallBold">
            {`${ruleLabels[form.ruleType]} key`}
          </ThemedText>
          <TextInput
            accessibilityLabel={`${ruleLabels[form.ruleType]} key`}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) =>
              onChange('ruleValue', value)
            }
            placeholder={`${ruleLabels[form.ruleType]} key`}
            placeholderTextColor={theme.textSecondary}
            style={inputStyle()}
            value={form.ruleValue}
          />
        </ThemedView>
      ) : null}

      <ThemedView style={styles.actions}>
        {form.classification !== 'seasonal' || availabilityBadgeId !== null ? (
          <Pressable accessibilityRole="button" accessibilityState={{ busy: saving, disabled: saving }} disabled={saving} onPress={onSubmit} style={[styles.primaryButton, saving && styles.disabled]}><ThemedText style={styles.primaryButtonText}>{saving ? 'Saving...' : formMode === 'create' ? 'Create badge' : 'Save changes'}</ThemedText></Pressable>
        ) : null}
        <Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={styles.secondaryButton}><ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText></Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filterButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderWidth: 1, borderColor: '#A51C30', borderRadius: Spacing.two },
  filterButtonSelected: { backgroundColor: '#A51C30' },
  filterButtonTextSelected: { color: '#FFFFFF' },
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
  badgeListHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  badgeListCopy: { flex: 1, gap: Spacing.one },
  artworkOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  artworkOption: { minWidth: 148, alignItems: 'center', justifyContent: 'center', gap: Spacing.one, padding: Spacing.two, borderWidth: 1, borderColor: '#777777', borderRadius: Spacing.two },
  artworkOptionSelected: { borderColor: '#A51C30', backgroundColor: '#E0E1E6' },
  artworkUploadCard: { gap: Spacing.one, padding: Spacing.two, borderRadius: Spacing.two },
  noArtworkPreview: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#777777', borderRadius: 36 },
  artworkPreview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two, borderRadius: Spacing.two },
  artworkPreviewCopy: { flex: 1, gap: Spacing.one },
  locationPicker: { gap: Spacing.two },
  annualSection: { gap: Spacing.two },
  fieldGroup: { gap: Spacing.one },
  checkboxRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkbox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#777777', borderRadius: 4 },
  checkboxSelected: { borderColor: '#A51C30', backgroundColor: '#A51C30' },
  checkboxMark: { color: '#FFFFFF', lineHeight: 20 },
  editionList: { gap: Spacing.one },
  editionCard: { gap: Spacing.one, padding: Spacing.two, borderRadius: Spacing.two },
  confirmation: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.two },
  status: { lineHeight: 22 },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
});
