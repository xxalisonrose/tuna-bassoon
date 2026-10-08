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
  hasBadgeArtwork,
} from '@/components/badge-artwork';
import {
  badgeArtworkUploadsSupported,
  pickBadgeArtwork,
} from '@/components/admin/badge-artwork-picker';
import type { BadgeArtworkAsset } from '@/components/admin/badge-artwork-picker.types';
import {
  BadgeCongratulationsManager,
  defaultBadgeCongratulations,
} from '@/components/admin/badge-congratulations-manager';
import {
  BadgeTagPicker,
  normalizeBadgeTagValue,
} from '@/components/admin/badge-tag-picker';
import { SectionHelpHeading } from '@/components/admin/section-help-heading';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AvailabilityWindowManager } from '@/components/admin/availability-window-manager';
import {
  Palette,
  PortalContentWidth,
  Spacing,
} from '@/constants/theme';
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

type Classification = 'general' | 'theme' | 'special_place' | 'seasonal';
type ClassificationFilter = Classification | 'all';
type ViewMode = 'list' | 'grid';
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
  levelsEnabled: boolean;
  congratulationsMessages: string[];
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
      editions: {
        badgeDefinitionId: Id<'badgeDefinitions'>;
        name: string;
        key?: string;
        editionYear?: number;
        retired: boolean;
      }[];
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
  requiredVisits: '5',
  classification: 'general',
  levelsEnabled: true,
  congratulationsMessages: [...defaultBadgeCongratulations],
  imageKey: '',
  ruleType: 'tag',
  ruleValue: '',
};

const classificationLabels: Record<Classification, string> = {
  general: 'General',
  theme: 'Theme',
  special_place: 'Special Place',
  seasonal: 'Seasonal',
};

const classificationPresets: Record<
  Classification,
  { requiredVisits: number; levelsEnabled: boolean }
> = {
  general: {
    requiredVisits: 5,
    levelsEnabled: true,
  },
  theme: {
    requiredVisits: 2,
    levelsEnabled: true,
  },
  special_place: {
    requiredVisits: 1,
    levelsEnabled: false,
  },
  seasonal: {
    requiredVisits: 1,
    levelsEnabled: false,
  },
};

function getPresetCongratulationsMessages(
  classification: Classification,
  currentMessages: string[],
) {
  const messages = currentMessages.length > 0
    ? [...currentMessages]
    : [...defaultBadgeCongratulations];

  if (
    classification === 'special_place' ||
    classification === 'seasonal'
  ) {
    return [messages[0] ?? defaultBadgeCongratulations[0]];
  }

  const seenMessages = new Set(
    messages.map((message) => message.toLowerCase()),
  );

  for (const defaultMessage of defaultBadgeCongratulations) {
    if (messages.length >= 10) {
      break;
    }

    const duplicateKey = defaultMessage.toLowerCase();

    if (!seenMessages.has(duplicateKey)) {
      messages.push(defaultMessage);
      seenMessages.add(duplicateKey);
    }
  }

  return messages;
}

const classificationFilters: {
  value: ClassificationFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'theme', label: 'Theme' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'special_place', label: 'Special Place' },
];

const ruleLabels: Record<RuleType, string> = {
  tag: 'Tag',
  location: 'Specific Location',
  any_location: 'Any Location',
  story: 'Specific Story',
  region: 'Specific Region',
  same_story: 'Same Story',
  same_region: 'Same Region',
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

function createStableKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
  if (rule.type === 'location') return `Specific Location: ${rule.locationKey}`;
  if (rule.type === 'story') return `Specific Story: ${rule.storyKey}`;
  if (rule.type === 'region') return `Specific Region: ${rule.regionKey}`;
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
      <ThemedText style={selected ? styles.textOnLightSurface : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function DropdownSelect<T extends string>({
  accessibilityLabel,
  disabled = false,
  onChange,
  options,
  value,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  onChange: (value: T) => void;
  options: readonly {
    hint: string;
    label: string;
    value: T;
  }[];
  value: T;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value;

  return (
    <ThemedView style={styles.dropdown}>
      <Pressable
        accessibilityLabel={`${accessibilityLabel}: ${selectedLabel}`}
        accessibilityHint={
          open
            ? 'Closes the available choices.'
            : 'Opens the available choices.'
        }
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [
          styles.dropdownButton,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" style={styles.textOnLightSurface}>
          {selectedLabel}
        </ThemedText>
        <ThemedText style={styles.textOnLightSurface}>
          {open ? '▲' : '▼'}
        </ThemedText>
      </Pressable>

      {open ? (
        <ThemedView
          accessibilityLabel={`${accessibilityLabel} choices`}
          accessibilityRole="radiogroup"
          style={styles.dropdownOptions}>
          {options.map((option) => {
            const selectedOption = option.value === value;

            return (
              <Pressable
                key={option.value}
                accessibilityHint={option.hint}
                accessibilityLabel={option.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedOption }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  selectedOption && styles.dropdownOptionSelected,
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  style={
                    selectedOption
                      ? styles.textOnLightSurface
                      : undefined
                  }>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
      ) : null}
    </ThemedView>
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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<Id<'badgeDefinitions'> | null>(null);
  const [form, setForm] = useState<BadgeFormState>(emptyForm);
  const [originalBadgeStableKey, setOriginalBadgeStableKey] =
    useState('');
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

  /* eslint-disable react-hooks/set-state-in-effect -- Annual-series query data intentionally initializes controlled form fields. */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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
        badge.levelsEnabled ? 'repeatable levels' : 'one time',
        badge.retired ? 'retired' : 'active',
      ].join(' ').toLowerCase();

      return text.includes(value);
    });
  }, [badges, classificationFilter, search]);

  const hasBadgeFilters =
    search.trim().length > 0 || classificationFilter !== 'all';

  const filteredLocations = useMemo(() => {
    const value = locationSearch.trim().toLowerCase();
    return (locations ?? []).filter((location) => {
      if (!location.key) return false;
      if (!value) return true;
      return `${location.name} ${location.key}`.toLowerCase().includes(value);
    });
  }, [locations, locationSearch]);

  const availableBadgeTags = useMemo(() => {
    const tags = new Set<string>();

    for (const location of locations ?? []) {
      for (const tag of location.badges ?? []) {
        const normalizedTag = normalizeBadgeTagValue(tag);

        if (normalizedTag) {
          tags.add(normalizedTag);
        }
      }
    }

    for (const badge of badges ?? []) {
      const normalizedTag = normalizeBadgeTagValue(badge.tag);

      if (normalizedTag) {
        tags.add(normalizedTag);
      }
    }

    return [...tags].sort((left, right) =>
      left.localeCompare(right),
    );
  }, [badges, locations]);

  const updateField = <K extends keyof BadgeFormState>(field: K, value: BadgeFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setStatusMessage(null);
  };

  const openCreate = () => {
    setFormMode('create');
    setEditingId(null);
    setForm(emptyForm);
    setOriginalBadgeStableKey('');
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
      tag: normalizeBadgeTagValue(badge.tag),
      description: badge.description,
      requiredVisits:
        ruleType === 'location'
          ? '1'
          : String(badge.requiredVisits),
      classification: badge.classification as Classification,
      levelsEnabled:
        badge.classification !== 'seasonal' &&
        badge.levelsEnabled === true,
      congratulationsMessages: [...badge.congratulationsMessages],
      imageKey: badge.imageKey ?? '',
      ruleType,
      ruleValue,
    });
    setOriginalBadgeStableKey(badge.key);
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
    setOriginalBadgeStableKey('');
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
    if (!slugPattern.test(form.tag.trim())) return 'Tag must use lowercase letters, numbers, and single hyphens only.';
    const requiredVisits = Number(form.requiredVisits);
    if (!Number.isInteger(requiredVisits) || requiredVisits < 1 || requiredVisits > 1000) {
      return 'Required visits must be an integer from 1 through 1,000.';
    }
    const classificationPreset =
      classificationPresets[form.classification];
    if (
      form.classification !== 'general' &&
      requiredVisits !== classificationPreset.requiredVisits
    ) {
      return `${classificationLabels[form.classification]} badges require exactly ${classificationPreset.requiredVisits} ${classificationPreset.requiredVisits === 1 ? 'visit' : 'visits'}.`;
    }
    if (form.levelsEnabled !== classificationPreset.levelsEnabled) {
      return classificationPreset.levelsEnabled
        ? 'General and Theme badges must use repeatable levels.'
        : 'Special Place and Seasonal badges cannot use repeatable levels.';
    }
    if (
      form.levelsEnabled &&
      form.ruleType === 'location'
    ) {
      return 'Specific-location rules must use the Special Place or Seasonal classification.';
    }
    if (form.congratulationsMessages.length === 0) {
      return 'Add at least one badge congratulations message.';
    }
    if (form.congratulationsMessages.length > 100) {
      return 'A badge can contain no more than 100 congratulations messages.';
    }
    const normalizedCongratulations = form.congratulationsMessages.map(
      (message) => message.trim(),
    );
    if (normalizedCongratulations.some((message) => !message)) {
      return 'Badge congratulations messages cannot be blank.';
    }
    if (
      new Set(
        normalizedCongratulations.map((message) =>
          message.toLowerCase(),
        ),
      ).size !== normalizedCongratulations.length
    ) {
      return 'Badge congratulations messages cannot be duplicated.';
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
      tag: normalizeBadgeTagValue(form.tag),
      description: form.description.trim(),
      requiredVisits: Number(form.requiredVisits),
      classification: form.classification,
      levelsEnabled:
        form.classification !== 'seasonal' &&
        form.ruleType !== 'location' &&
        form.levelsEnabled,
      congratulationsMessages: form.congratulationsMessages.map(
        (message) => message.trim(),
      ),
      rule: buildRule(),
      imageKey: form.imageKey.trim() || undefined,
    };
    let savedBadgeId = editingId;

    try {
      if (formMode === 'create') {
        savedBadgeId = await createBadge(payload);
        setOriginalBadgeStableKey(payload.key);
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
      <ThemedView
        type="backgroundElement"
        style={[styles.toolbar, { borderColor: theme.border }]}>
        <ThemedView style={styles.toolbarCopy}>
          <ThemedText type="subtitle" style={styles.workspaceTitle}>
            Badges
          </ThemedText>
          {!formMode ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add New Badge"
              onPress={openCreate}
              style={styles.primaryButton}>
              <ThemedText style={styles.primaryButtonText}>
                Add New Badge
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      </ThemedView>

      {!formMode && statusMessage ? (
        <ThemedText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.status}>
          {statusMessage}
        </ThemedText>
      ) : null}

      {!formMode ? (
        <ThemedView
          type="backgroundElement"
          style={[styles.searchCard, { borderColor: theme.border }]}>
          <TextInput
            accessibilityLabel="Search badges"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearch}
            placeholder="Search for a Badge"
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

          <ThemedText type="smallBold">Classification</ThemedText>
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
                    style={styles.filterButtonText}>
                    {filter.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>

          <ThemedText type="smallBold">View</ThemedText>
          <ThemedView
            accessibilityLabel="Choose badge view"
            accessibilityRole="radiogroup"
            style={styles.filterRow}>
            {(['list', 'grid'] as ViewMode[]).map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="radio"
                accessibilityState={{ selected: viewMode === mode }}
                onPress={() => setViewMode(mode)}
                style={({ pressed }) => [
                  styles.filterButton,
                  viewMode === mode && styles.filterButtonSelected,
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="smallBold"
                  style={styles.filterButtonText}>
                  {mode === 'list' ? 'List' : 'Grid'}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          {hasBadgeFilters ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear badge filters"
              onPress={() => {
                setSearch('');
                setClassificationFilter('all');
              }}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.secondaryButtonText}>
                Clear Search and Filters
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      ) : null}

      {formMode ? (
        <BadgeForm
          annualRepeatEnabled={annualRepeatEnabled}
          annualSeries={annualSeries}
          availableBadgeTags={availableBadgeTags}
          annualSeriesKey={annualSeriesKey}
          annualSeriesName={annualSeriesName}
          savedBadgeIsSeasonal={savedBadgeIsSeasonal}
          availabilityBadgeId={availabilityBadgeId}
          form={form}
          formMode={formMode}
          locations={filteredLocations}
          locationSearch={locationSearch}
          originalStableKey={originalBadgeStableKey || form.key}
          pendingArtwork={pendingArtwork}
          removeUploadedArtwork={removeUploadedArtwork}
          saving={formBusy}
          statusMessage={statusMessage}
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
        <ScrollView
          nestedScrollEnabled
          contentContainerStyle={[
            styles.list,
            viewMode === 'grid' && styles.gridList,
          ]}>
          {filteredBadges.map((badge) => {
            const retiredDate = formatDate(badge.retiredAt);
            const confirming = confirmingId === badge._id;
            return (
              <ThemedView
                key={badge._id}
                type="backgroundElement"
                style={[
                  styles.card,
                  viewMode === 'grid' && styles.gridCard,
                ]}>
                <ThemedView
                  style={[
                    styles.badgeListHeader,
                    viewMode === 'grid' && styles.badgeListHeaderGrid,
                  ]}>
                  <BadgeArtwork
                    earned
                    imageKey={badge.imageKey}
                    imageUrl={badge.imageUrl}
                    name={badge.name}
                  />
                  <ThemedView
                    style={[
                      styles.badgeListCopy,
                      viewMode === 'grid' && styles.badgeListCopyGrid,
                    ]}>
                    <ThemedText type="smallBold">{badge.name}</ThemedText>
                    <ThemedText
                      ellipsizeMode="tail"
                      numberOfLines={viewMode === 'grid' ? 2 : undefined}
                      style={viewMode === 'grid' ? styles.gridDescription : undefined}
                      themeColor="textSecondary">
                      {badge.description}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                <ThemedText type="small">Key: {badge.key || 'Legacy key missing'}</ThemedText>
                <ThemedText type="small">Tag: {badge.tag}</ThemedText>
                <ThemedText type="small">Required Visits: {badge.requiredVisits}</ThemedText>
                <ThemedText type="small">Classification: {classificationLabels[badge.classification as Classification]}</ThemedText>
                <ThemedText type="small">
                  Leveling:{' '}
                  {badge.classification === 'seasonal'
                    ? 'One-time seasonal edition'
                    : badge.levelsEnabled
                      ? 'Repeatable levels enabled'
                      : 'One-time badge'}
                </ThemedText>
                <ThemedText type="small">
                  Congratulations: {badge.congratulationsMessages.length}{' '}
                  {badge.congratulationsMessages.length === 1
                    ? 'message'
                    : 'messages'}
                </ThemedText>
                <ThemedText type="small">Rule: {formatRule(badge.rule)}</ThemedText>
                {badge.imageKey ? <ThemedText type="small">Image Key: {badge.imageKey}</ThemedText> : null}
                <ThemedText type="smallBold" themeColor="textSecondary">{badge.retired ? `Retired${retiredDate ? ` on ${retiredDate}` : ''}` : 'Active'}</ThemedText>
                <ThemedView style={[styles.actions, styles.cardActions]}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${badge.name}`} onPress={() => openEdit(badge)} style={[styles.secondaryButton, styles.cardActionButton]}>
                    <ThemedText style={styles.secondaryButtonText}>Edit</ThemedText>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={badge.retired ? `Reactivate ${badge.name}` : `Retire ${badge.name}`} onPress={() => setConfirmingId(badge._id)} style={[styles.secondaryButton, styles.cardActionButton]}>
                    <ThemedText style={styles.secondaryButtonText}>{badge.retired ? 'Reactivate' : 'Retire'}</ThemedText>
                  </Pressable>
                </ThemedView>
                {confirming ? (
                  <ThemedView type="backgroundElement" style={styles.confirmation}>
                    <ThemedText accessibilityLiveRegion="polite">{badge.retired ? 'Reactivating this badge allows progress to be calculated again. Existing awards remain.' : 'Retiring this badge stops new progress after the retirement time. Existing awards remain.'}</ThemedText>
                    <ThemedView style={styles.actions}>
                      <Pressable accessibilityRole="button" disabled={retiringId === badge._id} accessibilityState={{ busy: retiringId === badge._id, disabled: retiringId === badge._id }} onPress={() => changeRetiredState(badge)} style={[styles.primaryButton, retiringId === badge._id && styles.disabled]}>
                        <ThemedText style={styles.primaryButtonText}>{badge.retired ? 'Confirm Reactivation' : 'Confirm Retirement'}</ThemedText>
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
  availableBadgeTags,
  annualSeriesKey,
  annualSeriesName,
  savedBadgeIsSeasonal,
  availabilityBadgeId,
  form,
  formMode,
  locations,
  locationSearch,
  originalStableKey,
  pendingArtwork,
  removeUploadedArtwork,
  saving,
  statusMessage,
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
  availableBadgeTags: string[];
  annualSeriesKey: string;
  annualSeriesName: string;
  savedBadgeIsSeasonal: boolean;
  availabilityBadgeId: Id<'badgeDefinitions'> | null;
  form: BadgeFormState;
  formMode: 'create' | 'edit';
  locations: { _id: Id<'locations'>; name: string; key?: string }[];
  locationSearch: string;
  originalStableKey: string;
  pendingArtwork: BadgeArtworkAsset | null;
  removeUploadedArtwork: boolean;
  saving: boolean;
  statusMessage: string | null;
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
  const [stableKeyManuallyEdited, setStableKeyManuallyEdited] =
    useState(false);
  const [stableKeyChangeRequested, setStableKeyChangeRequested] =
    useState(false);
  const [stableKeyEditingUnlocked, setStableKeyEditingUnlocked] =
    useState(false);
  const inputStyle = (extra?: object) => [styles.input, extra, { backgroundColor: theme.background, borderColor: theme.borderStrong, color: theme.text }];
  const needsValue = form.ruleType === 'location' || form.ruleType === 'story' || form.ruleType === 'region';
  const normalizedImageKey = form.imageKey.trim().toLowerCase();
  const hasUnregisteredArtworkKey =
    normalizedImageKey.length > 0 &&
    !hasBadgeArtwork(normalizedImageKey);
  const activeUploadedImageUrl = pendingArtwork?.uri ??
    (removeUploadedArtwork ? undefined : uploadedImageUrl);
  const hasVisibleArtwork =
    activeUploadedImageUrl !== undefined ||
    hasBadgeArtwork(normalizedImageKey);
  const suggestedStableKey = createStableKey(form.name);
  const changeRuleType = (ruleType: RuleType) => {
    onChange('ruleType', ruleType);
  };

  const applyClassificationChange = (classification: Classification) => {
    if (classification === form.classification) {
      return;
    }

    const preset = classificationPresets[classification];

    onChange('classification', classification);
    onChange('requiredVisits', String(preset.requiredVisits));
    onChange('levelsEnabled', preset.levelsEnabled);
    onChange(
      'congratulationsMessages',
      getPresetCongratulationsMessages(
        classification,
        form.congratulationsMessages,
      ),
    );

    if (preset.levelsEnabled && form.ruleType === 'location') {
      onChange('ruleType', 'tag');
      onChange('ruleValue', '');
    }
  };

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.formCard, { borderColor: theme.border }]}>
      <ThemedText type="subtitle" style={styles.formTitle}>
        {formMode === 'create' ? 'Add a New Badge' : 'Edit Badge'}
      </ThemedText>

      <SectionHelpHeading
        label="BADGE IDENTITY"
        items={[
          {
            label: 'Name',
            description: 'The public badge title visitors see in Collection and in the celebration popup.',
          },
          {
            label: 'Stable Key',
            description: 'The permanent internal ID for this badge. During creation it is generated from the name until you edit it. Use lowercase letters, numbers, and single hyphens. Existing keys are locked because progress, awards, links, and annual editions may rely on them.',
          },
          {
            label: 'Tag',
            description: 'The shared topic that connects this badge to qualifying locations. Choose an existing location tag or add a new one, and reuse the exact tag on every location whose check-in should count.',
          },
        ]}
      />

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">Name</ThemedText>
        <TextInput
          accessibilityLabel="Name"
          autoCapitalize="words"
          editable={!saving}
          onChangeText={(value) => {
            onChange('name', value);

            if (formMode === 'create' && !stableKeyManuallyEdited) {
              onChange('key', createStableKey(value));
            }
          }}
          placeholder="Name"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle()}
          value={form.name}
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">Stable Key</ThemedText>
        <TextInput
          accessibilityLabel="Stable key"
          autoCapitalize="none"
          autoCorrect={false}
          editable={
            !saving &&
            (formMode === 'create' || stableKeyEditingUnlocked)
          }
          onChangeText={(value) => {
            if (formMode === 'create') {
              setStableKeyManuallyEdited(true);
            }

            onChange('key', value);
          }}
          placeholder="stable-key"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle(
            formMode === 'edit' && !stableKeyEditingUnlocked
              ? styles.lockedStableKeyInput
              : undefined,
          )}
          value={form.key}
        />

        {formMode === 'edit' && stableKeyEditingUnlocked ? (
          <ThemedText type="small" themeColor="textSecondary">
            Editing is unlocked. Save only after checking anything that
            may use the old key.
          </ThemedText>
        ) : null}

        {formMode === 'create' &&
        suggestedStableKey &&
        form.key !== suggestedStableKey ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Use suggested stable key ${suggestedStableKey}`}
            disabled={saving}
            onPress={() => {
              setStableKeyManuallyEdited(false);
              onChange('key', suggestedStableKey);
            }}
            style={({ pressed }) => [
              styles.inlineSecondaryButton,
              saving && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.secondaryButtonText}>
              Use Suggested Key: {suggestedStableKey}
            </ThemedText>
          </Pressable>
        ) : null}

        {formMode === 'edit' &&
        !stableKeyEditingUnlocked &&
        !stableKeyChangeRequested ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change badge stable key"
            disabled={saving}
            onPress={() => setStableKeyChangeRequested(true)}
            style={({ pressed }) => [
              styles.inlineSecondaryButton,
              saving && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.secondaryButtonText}>
              Change Stable Key
            </ThemedText>
          </Pressable>
        ) : null}

        {formMode === 'edit' &&
        stableKeyChangeRequested &&
        !stableKeyEditingUnlocked ? (
          <ThemedView
            accessibilityLiveRegion="polite"
            type="backgroundSelected"
            style={[
              styles.stableKeyWarning,
              { borderColor: Palette.danger },
            ]}>
            <ThemedText type="smallBold" style={styles.stableKeyWarningTitle}>
              Change This Permanent Identifier?
            </ThemedText>
            <ThemedText>
              Progress, awards, links, and annual editions may rely on the
              current key. Only change it when the related content has been
              checked and can be updated if needed.
            </ThemedText>
            <ThemedView style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => {
                  setStableKeyEditingUnlocked(true);
                  setStableKeyChangeRequested(false);
                }}
                style={({ pressed }) => [
                  styles.warningButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.warningButtonText}>
                  I Understand — Edit Key
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setStableKeyChangeRequested(false)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.secondaryButtonText}>
                  Keep Current Key
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        ) : null}

        {formMode === 'edit' && stableKeyEditingUnlocked ? (
          <ThemedView
            type="backgroundSelected"
            style={[
              styles.stableKeyWarning,
              { borderColor: Palette.danger },
            ]}>
            <ThemedText type="smallBold" style={styles.stableKeyWarningTitle}>
              Stable-Key Editing Is Unlocked
            </ThemedText>
            <ThemedText>
              The original key is {originalStableKey}. Restore it before
              saving if this change is not intentional.
            </ThemedText>
            {form.key !== originalStableKey ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Restore original stable key ${originalStableKey}`}
                disabled={saving}
                onPress={() => {
                  onChange('key', originalStableKey);
                  setStableKeyEditingUnlocked(false);
                }}
                style={({ pressed }) => [
                  styles.inlineSecondaryButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.secondaryButtonText}>
                  Restore Original Key
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setStableKeyEditingUnlocked(false)}
                style={({ pressed }) => [
                  styles.inlineSecondaryButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.secondaryButtonText}>
                  Lock Stable Key
                </ThemedText>
              </Pressable>
            )}
          </ThemedView>
        ) : null}
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">Tag</ThemedText>
        <BadgeTagPicker
          availableTags={availableBadgeTags}
          disabled={saving}
          mode="single"
          onChange={(tags) =>
            onChange('tag', tags[0] ?? '')
          }
          selectedTags={form.tag ? [form.tag] : []}
        />
      </ThemedView>

      <SectionHelpHeading
        label="ARTWORK"
        items={[
          {
            label: 'Badge Artwork',
            description: 'Choose a PNG, JPEG, or WebP image up to 5 MB; square artwork works best. If no image is selected, the app automatically uses the badge name’s first letter. Existing badges keep bundled artwork until it is deliberately removed or replaced.',
          },
        ]}
      />

      <ThemedView style={styles.fieldGroup}>
        <ThemedView style={styles.artworkPickerRow}>
          <Pressable
            accessibilityLabel={
              hasVisibleArtwork
                ? 'Replace badge artwork'
                : 'Choose badge artwork'
            }
            accessibilityRole="button"
            disabled={saving}
            onPress={onChooseUploadedArtwork}
            style={({ pressed }) => [
              styles.secondaryButton,
              saving && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.secondaryButtonText}>
              {pendingArtwork !== null
                ? 'Choose a Different Image'
                : hasVisibleArtwork
                  ? 'Replace Image'
                  : 'Choose Image'}
            </ThemedText>
          </Pressable>

          {hasVisibleArtwork ? (
            <BadgeArtwork
              earned
              imageKey={normalizedImageKey || undefined}
              imageUrl={activeUploadedImageUrl}
              name={form.name || 'Badge'}
            />
          ) : null}
        </ThemedView>

        <ThemedView style={styles.actions}>
          {pendingArtwork !== null ? (
            <Pressable
              accessibilityLabel="Clear selected badge artwork"
              accessibilityRole="button"
              disabled={saving}
              onPress={onClearPendingArtwork}
              style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>
                Clear Selection
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
                Remove Image
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
                Undo Image Removal
              </ThemedText>
            </Pressable>
          ) : normalizedImageKey.length > 0 ? (
            <Pressable
              accessibilityLabel="Use automatic letter badge"
              accessibilityRole="button"
              disabled={saving}
              onPress={() => onChange('imageKey', '')}
              style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>
                Remove Image
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
            The uploaded image will be removed when the badge is saved.
          </ThemedText>
        ) : hasUnregisteredArtworkKey ? (
          <ThemedText type="small" themeColor="textSecondary">
            The saved image key has no matching bundled artwork, so the
            automatic letter badge is currently used.
          </ThemedText>
        ) : null}
      </ThemedView>

      <SectionHelpHeading
        label="DESCRIPTION & REQUIREMENTS"
        items={[
          {
            label: 'Description',
            description: 'The public explanation of what this badge recognizes and how the visitor earns it. Keep it concise enough to read comfortably in Collection.',
          },
        ]}
      />

      <ThemedView style={styles.fieldGroup}>
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

      <SectionHelpHeading
        label="CLASSIFICATION & REQUIREMENTS"
        items={[
          {
            label: 'Classification',
            description: 'Controls the starting badge setup automatically. General badges start at five visits and use repeatable levels. Theme badges require two visits and use repeatable levels. Special Place badges require one visit and are one-time awards. Seasonal badges require one visit, are one-time awards, and can use availability dates.',
          },
          {
            label: 'Required Visits',
            description: 'The number of distinct qualifying check-ins needed to earn the badge or its next level. General starts at five and can be adjusted. Theme is fixed at two; Special Place and Seasonal are fixed at one.',
          },
          {
            label: 'Repeatable Levels',
            description: 'Each complete set of qualifying visits earns a permanent next level with no configured maximum. General and Theme badges use levels; Special Place and Seasonal badges do not.',
          },
          {
            label: 'Seasonal Repetition',
            description: 'Repeat yearly creates a separate, independently editable badge edition for each year. Annual series names and stable keys connect those editions without moving prior progress or awards.',
          },
        ]}
      />

      <DropdownSelect
        accessibilityLabel="Badge classification"
        disabled={saving}
        onChange={applyClassificationChange}
        options={(
          Object.keys(classificationLabels) as Classification[]
        ).map((value) => ({
          hint: `Use the ${classificationLabels[value].toLowerCase()} classification.`,
          label: classificationLabels[value],
          value,
        }))}
        value={form.classification}
      />
      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">Required Visits</ThemedText>
        {form.classification === 'general' ? (
          <TextInput
            accessibilityLabel="Required visits"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
            keyboardType="number-pad"
            onChangeText={(value) => onChange('requiredVisits', value)}
            placeholder="5"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle()}
            value={form.requiredVisits}
          />
        ) : (
          <ThemedText>{form.requiredVisits}</ThemedText>
        )}
      </ThemedView>

      {availabilityBadgeId !== null && form.classification !== 'seasonal' ? (
      <ThemedText themeColor="textSecondary">
        This saved badge is seasonal. Remove its future windows before
        saving another classification. A window that has started locks
        the badge as seasonal.
      </ThemedText>
    ) : null}

    {form.classification !== 'seasonal' ? (
      <ThemedView style={styles.annualSection}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Allow repeatable badge levels"
          accessibilityState={{
            checked: form.levelsEnabled,
            disabled: true,
          }}
          disabled
          style={styles.checkboxRow}>
          <ThemedView
            style={[
              styles.checkbox,
              form.levelsEnabled && styles.checkboxSelected,
            ]}>
            <ThemedText style={styles.checkboxMark}>
              {form.levelsEnabled ? '✓' : ''}
            </ThemedText>
          </ThemedView>
          <ThemedText>Allow Repeatable Levels</ThemedText>
        </Pressable>
      </ThemedView>
    ) : null}

    {form.classification === 'seasonal' ? (
      <ThemedView style={styles.annualSection}>
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
          <ThemedText>Repeat Yearly</ThemedText>
        </Pressable>

        {annualRepeatEnabled && annualSeries == null ? (
          <>
            <ThemedView style={styles.fieldGroup}>
              <ThemedText type="smallBold">
                Annual Series Name
              </ThemedText>
              <TextInput
                accessibilityLabel="Annual Series Name"
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
                Annual Series Stable Key
              </ThemedText>
              <TextInput
                accessibilityLabel="Annual Series Stable Key"
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
              Series Status:{' '}
              {annualSeries.enabled && savedBadgeIsSeasonal
                ? 'Repeating'
                : 'Paused'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Series Name: {annualSeries.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Series Stable Key: {annualSeries.key}
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

      <SectionHelpHeading
        label="CELEBRATION POPUP"
        items={[
          {
            label: 'Congratulations Messages',
            description: 'This badge has its own pool of short messages. When it is earned or levels up, the popup randomly chooses one and does not permanently store that choice. General and Theme badges start with ten messages; Special Place and Seasonal badges start with one. At least one message is required, and each message can contain up to 160 characters.',
          },
        ]}
      />

      <BadgeCongratulationsManager
        badgeName={form.name}
        disabled={saving}
        messages={form.congratulationsMessages}
        onChange={(messages) =>
          onChange('congratulationsMessages', messages)
        }
      />

      <SectionHelpHeading
        label="PROGRESS RULE"
        items={[
          {
            label: 'Rule',
            description: 'Defines which check-ins count toward this badge. Tag counts distinct locations carrying the selected tag. Specific Location is available for one-time Special Place and Seasonal badges. Any Location counts any distinct places. Specific Story and Region use one shared key, while Same Story and Same Region require qualifying visits to come from one group.',
          },
        ]}
      />

      <DropdownSelect
        accessibilityLabel="Badge progress rule"
        disabled={saving}
        onChange={changeRuleType}
        options={(Object.keys(ruleLabels) as RuleType[])
          .filter(
            (value) =>
              value !== 'location' || !form.levelsEnabled,
          )
          .map((value) => ({
            hint: ruleHelp[value],
            label: ruleLabels[value],
            value,
          }))}
        value={form.ruleType}
      />

      {form.ruleType === 'location' ? (
        <ThemedView style={styles.locationPicker}>
          <ThemedText type="smallBold">
            Location for This Rule
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
          {form.ruleValue ? <ThemedText type="small">Selected Location Key: {form.ruleValue}</ThemedText> : null}
        </ThemedView>
      ) : needsValue ? (
        <ThemedView style={styles.fieldGroup}>
          <ThemedText type="smallBold">
            {`${ruleLabels[form.ruleType]} Key`}
          </ThemedText>
          <TextInput
            accessibilityLabel={`${ruleLabels[form.ruleType]} Key`}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) =>
              onChange('ruleValue', value)
            }
            placeholder={`${ruleLabels[form.ruleType]} Key`}
            placeholderTextColor={theme.textSecondary}
            style={inputStyle()}
            value={form.ruleValue}
          />
        </ThemedView>
      ) : null}

      {statusMessage ? (
        <ThemedText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.validationError}>
          {statusMessage}
        </ThemedText>
      ) : null}

      <ThemedView type="backgroundSelected" style={styles.formActionsPanel}>
        <ThemedView style={styles.formActionsCopy}>
          <ThemedText type="smallBold">Ready to Finish?</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Save to publish these badge settings to the app.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.actions}>
          {form.classification !== 'seasonal' || availabilityBadgeId !== null ? (
            <Pressable accessibilityRole="button" accessibilityState={{ busy: saving, disabled: saving }} disabled={saving} onPress={onSubmit} style={[styles.primaryButton, saving && styles.disabled]}><ThemedText style={styles.primaryButtonText}>{saving ? 'Saving...' : formMode === 'create' ? 'Create Badge' : 'Save Changes'}</ThemedText></Pressable>
          ) : null}
          <Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={styles.secondaryButton}><ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText></Pressable>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: PortalContentWidth, alignSelf: 'center', gap: Spacing.three },
  toolbar: { gap: Spacing.two, padding: Spacing.four, borderWidth: 1, borderRadius: Spacing.three },
  toolbarCopy: { alignItems: 'flex-start', gap: Spacing.two },
  workspaceTitle: { fontSize: 26, lineHeight: 34 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filterButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderWidth: 1, borderColor: Palette.border, borderRadius: Spacing.two, backgroundColor: Palette.teaGreen },
  filterButtonSelected: { backgroundColor: Palette.lightBronze },
  filterButtonText: { color: Palette.ink },
  searchCard: { gap: Spacing.two, padding: Spacing.four, borderWidth: 1, borderRadius: Spacing.three },
  searchHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  searchHeaderCopy: { flex: 1, minWidth: 220, gap: Spacing.one },
  clearButton: { minHeight: 44, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.two, backgroundColor: Palette.teaGreen },
  input: { minHeight: 48, borderWidth: 1, borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  lockedStableKeyInput: { opacity: 0.7 },
  stableKeyWarning: { gap: Spacing.two, borderWidth: 2, borderRadius: Spacing.two, padding: Spacing.three },
  stableKeyWarningTitle: { color: Palette.danger },
  inlineSecondaryButton: { minHeight: 44, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.two, backgroundColor: Palette.teaGreen },
  warningButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Spacing.two, backgroundColor: Palette.danger },
  warningButtonText: { color: Palette.onDanger, textAlign: 'center' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  formCard: { gap: Spacing.two, padding: Spacing.four, borderWidth: 1, borderRadius: Spacing.three },
  formTitle: { fontSize: 26, lineHeight: 34 },
  formActionsPanel: { marginTop: Spacing.four, gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.two },
  formActionsCopy: { gap: Spacing.one },
  card: { gap: Spacing.one, padding: Spacing.four, borderWidth: 1, borderColor: Palette.border, borderRadius: Spacing.three },
  list: { gap: Spacing.two, paddingBottom: Spacing.five },
  gridList: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' },
  gridCard: { flexBasis: 360, flexGrow: 1, maxWidth: 510, minWidth: 320, minHeight: 400 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  cardActions: { marginTop: 'auto', paddingTop: Spacing.two },
  cardActionButton: { flexBasis: 0, flexGrow: 1, minWidth: 112 },
  primaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Spacing.two, backgroundColor: Palette.lightBronze },
  primaryButtonText: { color: Palette.ink, textAlign: 'center' },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Spacing.two, backgroundColor: Palette.teaGreen },
  secondaryButtonText: { color: Palette.ink, textAlign: 'center' },
  textOnLightSurface: { color: Palette.ink },
  radioGroup: { gap: Spacing.one },
  radioOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.two, borderRadius: Spacing.two },
  radioOptionSelected: { backgroundColor: Palette.teaGreen },
  radioDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Palette.borderStrong },
  radioDotSelected: { borderColor: Palette.lightBronze, backgroundColor: Palette.lightBronze },
  dropdown: { alignSelf: 'flex-start', alignItems: 'flex-start', gap: Spacing.one },
  dropdownButton: { minWidth: 220, minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.two, backgroundColor: Palette.teaGreen },
  dropdownOptions: { minWidth: 220, alignSelf: 'flex-start', gap: Spacing.one, padding: Spacing.one, borderWidth: 1, borderColor: Palette.border, borderRadius: Spacing.two },
  dropdownOption: { minWidth: 220, minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.two },
  dropdownOptionSelected: { backgroundColor: Palette.teaGreen },
  badgeListHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  badgeListHeaderGrid: { alignItems: 'flex-start' },
  badgeListCopy: { flex: 1, gap: Spacing.one },
  badgeListCopyGrid: { minWidth: 0 },
  gridDescription: { minHeight: 40, lineHeight: 20 },
  artworkPickerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.three },
  locationPicker: { gap: Spacing.two },
  annualSection: { gap: Spacing.two },
  fieldGroup: { gap: Spacing.one },
  checkboxRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkbox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.borderStrong, borderRadius: 4 },
  checkboxSelected: { borderColor: Palette.lightBronze, backgroundColor: Palette.lightBronze },
  checkboxMark: { color: Palette.ink, lineHeight: 20 },
  editionList: { gap: Spacing.one },
  editionCard: { gap: Spacing.one, padding: Spacing.two, borderRadius: Spacing.two },
  confirmation: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.two },
  status: { lineHeight: 22 },
  validationError: { color: Palette.danger, lineHeight: 22 },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
});
