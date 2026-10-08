import {
  useAction,
  useConvexAuth,
  useMutation,
  useQuery,
} from 'convex/react';
import { Link } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import {
  BadgeTagPicker,
  normalizeBadgeTagValue,
} from '@/components/admin/badge-tag-picker';
import {
  getCanonicalLocationCategory,
  LocationCategoryPicker,
} from '@/components/admin/location-category-picker';
import { SectionHelpHeading } from '@/components/admin/section-help-heading';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BadgeManager } from '@/components/admin/badge-manager';
import {
  MaxContentWidth,
  Palette,
  PortalContentWidth,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const GENERATION_TIMEOUT_MS = 120_000;
const MAX_LOCATION_BADGE_TAGS = 25;

type FormMode = 'create' | 'edit';
type PortalSection = 'locations' | 'badges';
type LocationStatusFilter = 'all' | 'active' | 'retired';
type ViewMode = 'list' | 'grid';

type LocationFormState = {
  name: string;
  key: string;
  description: string;
  funFact: string;
  source: string;
  isLore: boolean;
  latitude: string;
  longitude: string;
  category: string;
  badgesText: string;
  storyKey: string;
  regionKey: string;
};

type LocationFormValidation = {
  message: string;
  fieldMessages: Partial<Record<keyof LocationFormState, string>>;
};

const emptyForm: LocationFormState = {
  name: '',
  key: '',
  description: '',
  funFact: '',
  source: '',
  isLore: false,
  latitude: '',
  longitude: '',
  category: '',
  badgesText: '',
  storyKey: '',
  regionKey: '',
};

const locationStatusLabels: Record<LocationStatusFilter, string> = {
  all: 'All',
  active: 'Active',
  retired: 'Retired',
};

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
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

function createStableKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseBadgeTags(value: string) {
  const seen = new Set<string>();

  return value
    .split(/[\n,]+/)
    .map(normalizeBadgeTagValue)
    .filter((tag) => {
      if (!tag || seen.has(tag)) {
        return false;
      }

      seen.add(tag);
      return true;
    });
}

export default function AdminPortalScreen() {
  const { isAuthenticated, isLoading: isAuthLoading } =
    useConvexAuth();

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );

  const adminLocations = useQuery(
    api.adminLocations.getLocationsForAdmin,
    currentUser?.isAdmin ? {} : 'skip',
  );

  const createLocation = useMutation(
    api.adminLocations.createLocation,
  );

  const updateLocation = useMutation(
    api.adminLocations.updateLocation,
  );

  const setLocationRetired = useMutation(
    api.adminLocations.setLocationRetired,
  );

  const generateDescriptionDraft = useAction(
    api.locationAgent.generateLocationDescription,
  );

  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [portalSection, setPortalSection] = useState<PortalSection>('locations');
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationFormState>(emptyForm);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formValidation, setFormValidation] =
    useState<LocationFormValidation | null>(null);
  const [locationStableKeyManuallyEdited, setLocationStableKeyManuallyEdited] =
    useState(false);
  const [locationStableKeyChangeRequested, setLocationStableKeyChangeRequested] =
    useState(false);
  const [locationStableKeyEditingUnlocked, setLocationStableKeyEditingUnlocked] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [locationStatusFilter, setLocationStatusFilter] =
    useState<LocationStatusFilter>('all');
  const [locationViewMode, setLocationViewMode] =
    useState<ViewMode>('list');
  const [advancedGroupingOpen, setAdvancedGroupingOpen] =
    useState(false);
  const [confirmingLocationId, setConfirmingLocationId] =
    useState<Id<'locations'> | null>(null);
  const [changingLocationId, setChangingLocationId] =
    useState<Id<'locations'> | null>(null);
  const [geminiOpen, setGeminiOpen] = useState(false);
  const [geminiNotes, setGeminiNotes] = useState('');
  const [geminiBusy, setGeminiBusy] = useState(false);
  const [geminiStatusMessage, setGeminiStatusMessage] = useState<string | null>(null);
  const geminiRequestInFlight = useRef(false);

  const announce = (text: string) => {
    AccessibilityInfo.announceForAccessibility(text);
  };

  const resetGeminiState = () => {
    setGeminiOpen(false);
    setGeminiNotes('');
    setGeminiBusy(false);
    setGeminiStatusMessage(null);
    geminiRequestInFlight.current = false;
  };

  const filteredLocations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!adminLocations) {
      return [];
    }

    return adminLocations.filter((location) => {
      const matchesStatus =
        locationStatusFilter === 'all' ||
        (locationStatusFilter === 'retired'
          ? location.retired
          : !location.retired);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        location.name,
        location.key,
        location.category,
        location.funFact,
        location.source,
        location.isLore ? 'lore legend folklore' : '',
        ...(location.badges ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [adminLocations, locationStatusFilter, search]);

  const selectedBadgeTags = useMemo(
    () => parseBadgeTags(form.badgesText),
    [form.badgesText],
  );

  const suggestedLocationStableKey = createStableKey(form.name);
  const editingLocation = editingId === null
    ? undefined
    : adminLocations?.find((location) => location._id === editingId);
  const originalLocationStableKey = editingLocation === undefined
    ? ''
    : editingLocation.key?.trim() || createStableKey(editingLocation.name);

  const hasLocationFilters =
    search.trim().length > 0 || locationStatusFilter !== 'all';

  const availableBadgeTags = useMemo(() => {
    const tags = new Set<string>();

    for (const location of adminLocations ?? []) {
      for (const tag of location.badges ?? []) {
        const normalizedTag = normalizeBadgeTagValue(tag);

        if (normalizedTag) {
          tags.add(normalizedTag);
        }
      }
    }

    return [...tags].sort((left, right) =>
      left.localeCompare(right),
    );
  }, [adminLocations]);

  const openCreateForm = () => {
    setFormMode('create');
    setEditingId(null);
    setForm(emptyForm);
    setStatusMessage(null);
    setFormValidation(null);
    setLocationStableKeyManuallyEdited(false);
    setLocationStableKeyChangeRequested(false);
    setLocationStableKeyEditingUnlocked(false);
    setAdvancedGroupingOpen(false);
    setConfirmingLocationId(null);
    resetGeminiState();
  };

  const openEditForm = (location: {
    _id: string;
    name: string;
    key?: string;
    description: string;
    funFact?: string;
    source?: string;
    isLore?: boolean;
    latitude?: number;
    longitude?: number;
    category?: string;
    badges?: string[];
    storyKey?: string | null;
    regionKey?: string | null;
  }) => {
    setFormMode('edit');
    setEditingId(location._id);
    setForm({
      name: location.name,
      key:
        location.key?.trim() ||
        createStableKey(location.name),
      description: location.description,
      funFact: location.funFact ?? '',
      source: location.source ?? '',
      isLore: location.isLore === true,
      latitude: location.latitude != null ? String(location.latitude) : '',
      longitude: location.longitude != null ? String(location.longitude) : '',
      category: getCanonicalLocationCategory(location.category) ?? '',
      badgesText: parseBadgeTags(
        (location.badges ?? []).join(', '),
      ).join(', '),
      storyKey: location.storyKey ?? '',
      regionKey: location.regionKey ?? '',
    });
    setStatusMessage(null);
    setFormValidation(null);
    setLocationStableKeyManuallyEdited(false);
    setLocationStableKeyChangeRequested(false);
    setLocationStableKeyEditingUnlocked(false);
    setAdvancedGroupingOpen(Boolean(location.storyKey || location.regionKey));
    setConfirmingLocationId(null);
    resetGeminiState();
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingId(null);
    setForm(emptyForm);
    setStatusMessage(null);
    setFormValidation(null);
    setLocationStableKeyManuallyEdited(false);
    setLocationStableKeyChangeRequested(false);
    setLocationStableKeyEditingUnlocked(false);
    setAdvancedGroupingOpen(false);
    resetGeminiState();
  };

  const handleGenerateGeminiDraft = async () => {
    if (geminiRequestInFlight.current || geminiBusy || saving) {
      return;
    }

    if (!form.name.trim()) {
      const text =
        'Enter a location name before asking Gemini to draft a description.';
      setGeminiStatusMessage(text);
      announce(text);
      return;
    }

    geminiRequestInFlight.current = true;
    setGeminiBusy(true);
    setGeminiStatusMessage(
      'Gemini is drafting. This may take a moment during high demand.',
    );

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const generationPromise = generateDescriptionDraft({
        ...(editingId
          ? { locationId: editingId as Id<'locations'> }
          : {}),
        draftContext: {
          name: form.name.trim(),
          category: form.category.trim() || undefined,
          description: form.description.trim() || undefined,
        },
        editorialNotes: geminiNotes.trim() || undefined,
      });

      const result = await Promise.race([
        generationPromise,
        new Promise<{ status: 'timeout' }>((resolve) => {
          timeoutId = setTimeout(() => {
            resolve({ status: 'timeout' });
          }, GENERATION_TIMEOUT_MS);
        }),
      ]);

      if (result.status === 'timeout') {
        const text =
          'Gemini is taking too long to respond. Please wait a few minutes before trying again.';
        setGeminiStatusMessage(text);
        announce(text);
        return;
      }

      if (result.status === 'unavailable') {
        setGeminiStatusMessage(result.message);
        announce(result.message);
        return;
      }

      setForm((current) => ({
        ...current,
        description: result.description,
      }));

      const text =
        'Gemini draft added to the description field. Review it before saving.';
      setGeminiStatusMessage(text);
      announce(text);
    } catch (error) {
      const text = getErrorMessage(error, 'Unable to generate a draft right now. Please try again.');

      setGeminiStatusMessage(text);
      announce(text);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      setGeminiBusy(false);
      geminiRequestInFlight.current = false;
    }
  };

  const updateField = <K extends keyof LocationFormState>(
    field: K,
    value: LocationFormState[K],
  ) => {
    const shouldSuggestStableKey =
      field === 'name' &&
      formMode === 'create' &&
      !locationStableKeyManuallyEdited;

    setForm((current) => ({
      ...current,
      [field]: value,
      ...(shouldSuggestStableKey
        ? { key: createStableKey(String(value)) }
        : {}),
    }));

    if (statusMessage) {
      setStatusMessage(null);
    }

    setFormValidation((current) => {
      if (current === null) {
        return null;
      }

      const fieldsToClear = new Set<keyof LocationFormState>([field]);

      if (shouldSuggestStableKey) {
        fieldsToClear.add('key');
      }

      if (
        [...fieldsToClear].every(
          (fieldToClear) => !(fieldToClear in current.fieldMessages),
        )
      ) {
        return Object.keys(current.fieldMessages).length === 0
          ? null
          : current;
      }

      const fieldMessages = { ...current.fieldMessages };

      for (const fieldToClear of fieldsToClear) {
        delete fieldMessages[fieldToClear];
      }
      const remainingMessages = Object.values(fieldMessages).filter(
        (message): message is string => typeof message === 'string',
      );

      if (remainingMessages.length === 0) {
        return null;
      }

      return {
        message:
          remainingMessages.length === 1
            ? remainingMessages[0]
            : 'Fix the highlighted fields before saving.',
        fieldMessages,
      };
    });
  };

  const updateLocationStableKey = (value: string) => {
    if (formMode === 'create') {
      setLocationStableKeyManuallyEdited(true);
    }

    updateField('key', value);
  };

  const useSuggestedLocationStableKey = () => {
    setLocationStableKeyManuallyEdited(false);
    updateField('key', suggestedLocationStableKey);
  };

  const validateForm = (): LocationFormValidation | null => {
    const fieldMessages: LocationFormValidation['fieldMessages'] = {};
    const requiredFields: [keyof LocationFormState, string][] = [
      ['name', 'Name'],
      ['key', 'Stable key'],
      ['description', 'Description'],
      ['latitude', 'Latitude'],
      ['longitude', 'Longitude'],
      ['category', 'Location category'],
    ];

    for (const [field, label] of requiredFields) {
      if (!String(form[field]).trim()) {
        fieldMessages[field] = `${label} is required.`;
      }
    }

    if (form.latitude.trim()) {
      const latitude = Number(form.latitude);
      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
      ) {
        fieldMessages.latitude =
          'Latitude must be a finite number from -90 through 90.';
      }
    }

    if (form.longitude.trim()) {
      const longitude = Number(form.longitude);
      if (
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        fieldMessages.longitude =
          'Longitude must be a finite number from -180 through 180.';
      }
    }

    if (
      form.key.trim() &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.key.trim())
    ) {
      fieldMessages.key =
        'Stable key must use lowercase letters, numbers, and single hyphens only.';
    }

    if (form.funFact.trim().length > 1000) {
      fieldMessages.funFact =
        'Fun fact must be 1,000 characters or fewer.';
    }

    if (form.source.trim().length > 2000) {
      fieldMessages.source =
        'Source must be 2,000 characters or fewer.';
    }

    if (selectedBadgeTags.length === 0) {
      fieldMessages.badgesText =
        'Select at least one badge tag for this location.';
    } else if (selectedBadgeTags.length > MAX_LOCATION_BADGE_TAGS) {
      fieldMessages.badgesText =
        `Locations can have no more than ${MAX_LOCATION_BADGE_TAGS} badge tags.`;
    }

    const messages = Object.values(fieldMessages).filter(
      (message): message is string => typeof message === 'string',
    );

    if (messages.length === 0) {
      return null;
    }

    return {
      message:
        messages.length === 1
          ? messages[0]
          : 'Fix the highlighted fields before saving.',
      fieldMessages,
    };
  };

  const renderFieldError = (field: keyof LocationFormState) => {
    const message = formValidation?.fieldMessages[field];

    return message ? (
      <ThemedText
        accessibilityLiveRegion="polite"
        style={styles.fieldErrorText}>
        {message}
      </ThemedText>
    ) : null;
  };

  const submitForm = async () => {
    if (saving) {
      return;
    }

    const validation = validateForm();
    if (validation) {
      setFormValidation(validation);
      setStatusMessage(null);
      announce(validation.message);
      return;
    }

    const trimmedKey = form.key.trim();
    const storyKey = form.storyKey.trim() || undefined;
    const regionKey = form.regionKey.trim() || undefined;
    const badges = parseBadgeTags(form.badgesText);

    setSaving(true);
    setStatusMessage(null);
    setFormValidation(null);
    resetGeminiState();

    try {
      if (formMode === 'create') {
        await createLocation({
          name: form.name.trim(),
          key: trimmedKey,
          description: form.description.trim(),
          funFact: form.funFact.trim() || undefined,
          source: form.source.trim() || undefined,
          isLore: form.isLore,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          category: form.category.trim(),
          badges,
          storyKey,
          regionKey,
        });

        setStatusMessage('Location created.');
      } else if (formMode === 'edit' && editingId) {
        await updateLocation({
          locationId: editingId as any,
          name: form.name.trim(),
          key: trimmedKey,
          description: form.description.trim(),
          funFact: form.funFact.trim() || undefined,
          source: form.source.trim() || undefined,
          isLore: form.isLore,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          category: form.category.trim(),
          badges,
          storyKey,
          regionKey,
        });

        setStatusMessage('Location changes saved.');
      }

      closeForm();
    } catch (error) {
      const fallback =
        formMode === 'create'
          ? 'Unable to create this location.'
          : 'Unable to save these changes.';

      const message = getErrorMessage(error, fallback);
      setFormValidation({ message, fieldMessages: {} });
      announce(message);
    } finally {
      setSaving(false);
    }
  };

  const changeLocationRetiredState = async (
    location: (typeof filteredLocations)[number],
  ) => {
    if (changingLocationId !== null) {
      return;
    }

    setChangingLocationId(location._id);
    setStatusMessage(null);

    try {
      await setLocationRetired({
        locationId: location._id,
        retired: !location.retired,
      });

      const message = location.retired
        ? 'Location reactivated.'
        : 'Location retired.';
      setStatusMessage(message);
      announce(message);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to change this location's status.",
      );
      setStatusMessage(message);
      announce(message);
    } finally {
      setChangingLocationId(null);
      setConfirmingLocationId(null);
    }
  };

  if (isAuthLoading) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ActivityIndicator
          accessibilityLabel="Checking content portal access"
          accessibilityRole="progressbar"
          size="large"
        />

        <ThemedText accessibilityLiveRegion="polite">
          Checking content portal access...
        </ThemedText>
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ThemedText
          accessibilityRole="header"
          type="subtitle">
          Sign in required
        </ThemedText>

        <ThemedText
          accessibilityLiveRegion="polite"
          style={styles.centeredText}
          themeColor="textSecondary">
          Sign in before accessing the content portal.
        </ThemedText>


        <Link
          href="/"
          accessibilityLabel="Go to sign in"
          accessibilityHint="Returns to the home screen to sign in or create an account."
          style={styles.linkButton}>
          <ThemedText
            type="smallBold"
            style={styles.linkButtonText}>
            Go to sign in
          </ThemedText>
        </Link>
      </ThemedView>
    );
  }

  if (currentUser === undefined) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ActivityIndicator
          accessibilityLabel="Loading your profile"
          accessibilityRole="progressbar"
          size="large"
        />

        <ThemedText accessibilityLiveRegion="polite">
          Loading your profile...
        </ThemedText>
      </ThemedView>
    );
  }

  if (currentUser === null) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ThemedText
          accessibilityRole="header"
          type="subtitle">
          Sign in required
        </ThemedText>

        <ThemedText
          accessibilityLiveRegion="polite"
          style={styles.centeredText}
          themeColor="textSecondary">
          Sign in before accessing the content portal.
        </ThemedText>


        <Link
          href="/"
          accessibilityLabel="Go to sign in"
          accessibilityHint="Returns to the home screen to sign in or create an account."
          style={styles.linkButton}>
          <ThemedText
            type="smallBold"
            style={styles.linkButtonText}>
            Go to sign in
          </ThemedText>
        </Link>
      </ThemedView>
    );
  }

  if (!currentUser.isAdmin) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ThemedText
          accessibilityRole="header"
          type="subtitle">
          Administrator access required
        </ThemedText>

        <ThemedText
          accessibilityLiveRegion="polite"
          style={styles.centeredText}
          themeColor="textSecondary">
          This portal is limited to authorized project editors.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        accessibilityLabel="Content portal"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ThemedView
          type="backgroundElement"
          style={[styles.headerSection, { borderColor: theme.border }]}>
          <ThemedText type="smallBold" style={styles.eyebrow}>
            ADMIN WORKSPACE
          </ThemedText>

          <ThemedText
            accessibilityRole="header"
            type="title"
            style={styles.title}>
            Content Portal
          </ThemedText>

          <ThemedText
            style={styles.subtitle}
            themeColor="textSecondary">
            Create, review, and maintain the locations and badges used by
            the Tuna Bassoon app.
          </ThemedText>
        </ThemedView>

        <ThemedView
          accessibilityRole="tablist"
          accessibilityLabel="Content portal sections"
          type="backgroundElement"
          style={[styles.sectionTabs, { borderColor: theme.border }]}>
          {(['locations', 'badges'] as PortalSection[]).map((section) => (
            <Pressable
              key={section}
              accessibilityRole="tab"
              accessibilityLabel={section === 'locations' ? 'Locations' : 'Badges'}
              accessibilityState={{ selected: portalSection === section }}
              onPress={() => setPortalSection(section)}
              style={({ pressed }) => [
                styles.sectionTab,
                portalSection === section && styles.sectionTabSelected,
                pressed && styles.pressed,
              ]}>
              <ThemedText
                style={portalSection === section ? styles.sectionTabTextSelected : undefined}>
                {section === 'locations' ? 'Locations' : 'Badges'}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>

        {portalSection === 'locations' ? (
          <>

        <ThemedView
          type="backgroundElement"
          style={[styles.linkRow, { borderColor: theme.border }]}>
          <ThemedView style={styles.toolbarCopy}>
            <ThemedText type="subtitle" style={styles.workspaceTitle}>
              Locations
            </ThemedText>
            {!formMode && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add New Location"
                accessibilityHint="Create a new location entry for the app."
                onPress={openCreateForm}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.buttonText}>
                  Add New Location
                </ThemedText>
              </Pressable>
            )}
          </ThemedView>
        </ThemedView>

        {statusMessage && (
          <ThemedText
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            themeColor="textSecondary"
            style={styles.statusMessage}>
            {statusMessage}
          </ThemedText>
        )}

        {!formMode && (
          <ThemedView
            type="backgroundElement"
            style={[styles.searchCard, { borderColor: theme.border }]}>
            <TextInput
              accessibilityLabel="Search locations"
              accessibilityHint="Filter the location list by name, key, category, or badge tag."
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={setSearch}
              placeholder="Search for a Location"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.borderStrong,
                  color: theme.text,
                },
              ]}
              value={search}
            />

            <ThemedText type="smallBold">Status</ThemedText>

            <ThemedView
              accessibilityRole="radiogroup"
              accessibilityLabel="Filter locations by status"
              style={styles.statusFilterRow}>
              {(Object.keys(locationStatusLabels) as LocationStatusFilter[]).map(
                (value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={locationStatusLabels[value]}
                    accessibilityState={{
                      selected: locationStatusFilter === value,
                    }}
                    onPress={() => setLocationStatusFilter(value)}
                    style={({ pressed }) => [
                      styles.statusFilterButton,
                      locationStatusFilter === value &&
                        styles.statusFilterButtonSelected,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      style={styles.statusFilterText}>
                      {locationStatusLabels[value]}
                    </ThemedText>
                  </Pressable>
                ),
              )}
            </ThemedView>

            <ThemedText type="smallBold">View</ThemedText>

            <ThemedView
              accessibilityRole="radiogroup"
              accessibilityLabel="Choose location view"
              style={styles.statusFilterRow}>
              {(['list', 'grid'] as ViewMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: locationViewMode === mode,
                  }}
                  onPress={() => setLocationViewMode(mode)}
                  style={({ pressed }) => [
                    styles.statusFilterButton,
                    locationViewMode === mode &&
                      styles.statusFilterButtonSelected,
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText style={styles.statusFilterText}>
                    {mode === 'list' ? 'List' : 'Grid'}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>

            {hasLocationFilters ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear location filters"
                onPress={() => {
                  setSearch('');
                  setLocationStatusFilter('all');
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
        )}

        {formMode ? (
          <ThemedView
            type="backgroundElement"
            style={[styles.formCard, { borderColor: theme.border }]}>
            <ThemedText type="subtitle" style={styles.formTitle}>
              {formMode === 'create'
                ? 'Add a New Location'
                : 'Edit Location'}
            </ThemedText>

            <SectionHelpHeading
              label="BASIC DETAILS"
              items={[
                {
                  label: 'Location Name',
                  description: 'The public title visitors see on the map and in location details. Use the clearest familiar name for the place.',
                },
                {
                  label: 'Stable Key',
                  description: 'The permanent internal ID used by links and badge rules. During creation it is generated from the name until you edit it. Use lowercase letters, numbers, and single hyphens. Existing keys are locked because other content may rely on them.',
                },
              ]}
            />

            <ThemedText type="smallBold">Location Name</ThemedText>
            <TextInput
              accessibilityLabel="Location name"
              autoCapitalize="words"
              onChangeText={(value) => updateField('name', value)}
              placeholder="Name"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.formInput,
                {
                  backgroundColor: theme.background,
                  borderColor: formValidation?.fieldMessages.name
                    ? Palette.danger
                    : theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.name}
            />

            {renderFieldError('name')}

            <ThemedText type="smallBold">Stable Key</ThemedText>
            <TextInput
              accessibilityLabel="Stable key"
              autoCapitalize="none"
              autoCorrect={false}
              editable={
                !saving &&
                (
                  formMode === 'create' ||
                  locationStableKeyEditingUnlocked
                )
              }
              onChangeText={updateLocationStableKey}
              placeholder="stable-key"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.formInput,
                formMode === 'edit' &&
                  !locationStableKeyEditingUnlocked &&
                  styles.lockedStableKeyInput,
                {
                  backgroundColor: theme.background,
                  borderColor: formValidation?.fieldMessages.key
                    ? Palette.danger
                    : theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.key}
            />

            {renderFieldError('key')}

            {formMode === 'edit' && locationStableKeyEditingUnlocked ? (
              <ThemedText type="small" themeColor="textSecondary">
                Editing is unlocked. Save only after checking anything that
                may use the old key.
              </ThemedText>
            ) : null}

            {formMode === 'create' &&
            suggestedLocationStableKey &&
            form.key !== suggestedLocationStableKey ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Use suggested stable key ${suggestedLocationStableKey}`}
                disabled={saving}
                onPress={useSuggestedLocationStableKey}
                style={({ pressed }) => [
                  styles.inlineSecondaryButton,
                  saving && styles.disabledButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.secondaryButtonText}>
                  Use Suggested Key: {suggestedLocationStableKey}
                </ThemedText>
              </Pressable>
            ) : null}

            {formMode === 'edit' &&
            !locationStableKeyEditingUnlocked &&
            !locationStableKeyChangeRequested ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change location stable key"
                disabled={saving}
                onPress={() => setLocationStableKeyChangeRequested(true)}
                style={({ pressed }) => [
                  styles.inlineSecondaryButton,
                  saving && styles.disabledButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.secondaryButtonText}>
                  Change Stable Key
                </ThemedText>
              </Pressable>
            ) : null}

            {formMode === 'edit' &&
            locationStableKeyChangeRequested &&
            !locationStableKeyEditingUnlocked ? (
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
                  Badge rules may reference this location by its current key.
                  Changing it can stop those rules from recognizing future
                  check-ins until they are updated.
                </ThemedText>
                <ThemedView style={styles.formActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    onPress={() => {
                      setLocationStableKeyEditingUnlocked(true);
                      setLocationStableKeyChangeRequested(false);
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
                    onPress={() => setLocationStableKeyChangeRequested(false)}
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

            {formMode === 'edit' &&
            locationStableKeyEditingUnlocked ? (
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
                  The original key is {originalLocationStableKey}. Restore it
                  before saving if this change is not intentional.
                </ThemedText>
                {form.key !== originalLocationStableKey ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Restore original stable key ${originalLocationStableKey}`}
                    disabled={saving}
                    onPress={() => {
                      updateField('key', originalLocationStableKey);
                      setLocationStableKeyEditingUnlocked(false);
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
                    onPress={() => setLocationStableKeyEditingUnlocked(false)}
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

            <SectionHelpHeading
              label="STORY CONTENT"
              items={[
                {
                  label: 'Lore or Legend',
                  description: 'Turn this on when the story includes folklore, oral tradition, legend, or details that are not historically confirmed. Visitors will see a clear notice in the location details.',
                },
                {
                  label: 'Description',
                  description: 'The main story visitors read after opening this location. Keep it engaging, accurate, and focused on why the place is worth discovering.',
                },
                {
                  label: 'Fun Fact',
                  description: 'An optional short detail shown separately in the location details. Use something memorable that adds to the story without repeating the main description.',
                },
                {
                  label: 'Source',
                  description: 'The optional citation, publication, archive, organization, or URL supporting the location information.',
                },
                {
                  label: 'Gemini Editorial Notes',
                  description: 'Private optional instructions for a Gemini draft, such as the desired tone, facts to emphasize, or details to avoid. They are never published or saved with the location.',
                },
              ]}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="Mark this location as lore or legend"
              accessibilityHint="Shows readers that this location story includes folklore, legend, oral tradition, or historically unverified details."
              accessibilityState={{
                checked: form.isLore,
                disabled: saving,
              }}
              disabled={saving}
              onPress={() => updateField('isLore', !form.isLore)}
              style={({ pressed }) => [
                styles.loreToggle,
                {
                  borderColor: form.isLore
                    ? Palette.lightBronze
                    : theme.borderStrong,
                },
                form.isLore && styles.loreToggleSelected,
                saving && styles.disabledButton,
                pressed && styles.pressed,
              ]}>
              <ThemedView
                style={[
                  styles.loreCheckbox,
                  {
                    backgroundColor: form.isLore
                      ? Palette.lightBronze
                      : theme.background,
                    borderColor: form.isLore
                      ? Palette.lightBronze
                      : theme.borderStrong,
                  },
                ]}>
                {form.isLore ? (
                  <ThemedText
                    accessible={false}
                    style={styles.loreCheckboxMark}>
                    ✓
                  </ThemedText>
                ) : null}
              </ThemedView>

              <ThemedView style={styles.loreToggleCopy}>
                <ThemedText type="smallBold">
                  Mark This Location as Lore or Legend
                </ThemedText>
              </ThemedView>
            </Pressable>

            <ThemedText type="smallBold">Description</ThemedText>
            <TextInput
              accessibilityLabel="Description"
              multiline
              onChangeText={(value) => updateField('description', value)}
              placeholder="Description"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.formTextArea,
                {
                  backgroundColor: theme.background,
                  borderColor: formValidation?.fieldMessages.description
                    ? Palette.danger
                    : theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.description}
            />

            {renderFieldError('description')}

            {formMode && (
              <ThemedView style={styles.geminiContainer}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    geminiOpen
                      ? 'Close Gemini tools'
                      : 'Draft description with Gemini'
                  }
                  accessibilityHint={
                    geminiOpen
                      ? 'Hide the Gemini drafting tools.'
                      : 'Opens Gemini tools to draft a new description.'
                  }
                  accessibilityState={{
                    expanded: geminiOpen,
                    disabled: geminiBusy,
                    busy: geminiBusy,
                  }}
                  disabled={geminiBusy || saving}
                  onPress={() => setGeminiOpen((value) => !value)}
                  style={({ pressed }) => [
                    styles.geminiButton,
                    geminiBusy && styles.disabledButton,
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText style={styles.geminiButtonText}>
                    {geminiOpen
                      ? 'Close Gemini Tools'
                      : 'Draft Description with Gemini'}
                  </ThemedText>
                </Pressable>

                {geminiOpen && (
                  <ThemedView style={styles.geminiPanel}>
                    <ThemedText
                      themeColor="textSecondary"
                      style={styles.geminiHelp}>
                      Gemini uses the current form to create a draft. It does not save or publish anything automatically.
                    </ThemedText>

                    <ThemedText type="smallBold">
                      Editorial Notes (Optional)
                    </ThemedText>
                    <TextInput
                      accessibilityLabel="Editorial notes for Gemini"
                      accessibilityHint="Optional notes to guide the draft. Maximum 2,000 characters."
                      autoCapitalize="sentences"
                      autoCorrect
                      maxLength={2000}
                      multiline
                      onChangeText={setGeminiNotes}
                      placeholder="Optional editorial notes for the draft"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.geminiInput,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.textSecondary,
                          color: theme.text,
                        },
                      ]}
                      value={geminiNotes}
                    />

                    {geminiStatusMessage && (
                      <ThemedText
                        accessibilityLiveRegion="assertive"
                        accessibilityRole="alert"
                        themeColor="textSecondary"
                        style={styles.geminiStatusMessage}>
                        {geminiStatusMessage}
                      </ThemedText>
                    )}

                    <ThemedView style={styles.geminiActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Generate draft"
                        accessibilityHint="Create a draft description from the current location."
                        accessibilityState={{
                          disabled: geminiBusy || saving,
                          busy: geminiBusy,
                        }}
                        disabled={geminiBusy || saving}
                        onPress={handleGenerateGeminiDraft}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          geminiBusy && styles.disabledButton,
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText style={styles.buttonText}>
                          {geminiBusy ? 'Generating Draft...' : 'Generate Draft'}
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Close Gemini tools"
                        accessibilityHint="Hide the Gemini drafting controls without changing the current description."
                        disabled={geminiBusy || saving}
                        onPress={() => setGeminiOpen(false)}
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          geminiBusy && styles.disabledButton,
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText style={styles.secondaryButtonText}>
                          Close Gemini Tools
                        </ThemedText>
                      </Pressable>
                    </ThemedView>

                    {geminiBusy && (
                      <ThemedView style={styles.geminiBusyRow}>
                        <ActivityIndicator
                          accessibilityLabel="Generating Gemini draft"
                          accessibilityRole="progressbar"
                          size="small"
                        />

                        <ThemedText themeColor="textSecondary">
                          Gemini is drafting a description. This may take a while.
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                )}
              </ThemedView>
            )}

            <ThemedText type="smallBold">Fun Fact (Optional)</ThemedText>
            <TextInput
              accessibilityLabel="Fun fact"
              autoCapitalize="sentences"
              maxLength={1000}
              multiline
              onChangeText={(value) => updateField('funFact', value)}
              placeholder="An interesting detail about this location"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.formTextArea,
                {
                  backgroundColor: theme.background,
                  borderColor: formValidation?.fieldMessages.funFact
                    ? Palette.danger
                    : theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.funFact}
            />

            {renderFieldError('funFact')}

            <ThemedText type="smallBold">Source (Optional)</ThemedText>
            <TextInput
              accessibilityLabel="Source"
              autoCapitalize="sentences"
              maxLength={2000}
              multiline
              onChangeText={(value) => updateField('source', value)}
              placeholder="Citation, publication, or URL"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.formTextArea,
                {
                  backgroundColor: theme.background,
                  borderColor: formValidation?.fieldMessages.source
                    ? Palette.danger
                    : theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.source}
            />

            {renderFieldError('source')}

            <SectionHelpHeading
              label="MAP DETAILS"
              items={[
                {
                  label: 'Latitude',
                  description: 'The north-south decimal coordinate that positions the map marker. Copy the full decimal value from a reliable map source.',
                },
                {
                  label: 'Longitude',
                  description: 'The east-west decimal coordinate that positions the map marker. Locations around Harvard and Boston normally use a negative longitude.',
                },
                {
                  label: 'Location Category',
                  description: 'The required broad public-facing type visitors see for this location. Choose the closest overall category and use badge tags for narrower subjects such as public-art, black-history, or transportation.',
                },
              ]}
            />

            <ThemedText type="smallBold">Latitude</ThemedText>
            <TextInput
              accessibilityLabel="Latitude"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="decimal-pad"
              onChangeText={(value) => updateField('latitude', value)}
              placeholder="Latitude"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.formInput,
                {
                  backgroundColor: theme.background,
                  borderColor: formValidation?.fieldMessages.latitude
                    ? Palette.danger
                    : theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.latitude}
            />

            {renderFieldError('latitude')}

            <ThemedText type="smallBold">Longitude</ThemedText>
            <TextInput
              accessibilityLabel="Longitude"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="decimal-pad"
              onChangeText={(value) => updateField('longitude', value)}
              placeholder="Longitude"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.formInput,
                {
                  backgroundColor: theme.background,
                  borderColor: formValidation?.fieldMessages.longitude
                    ? Palette.danger
                    : theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.longitude}
            />

            {renderFieldError('longitude')}

            <ThemedText type="smallBold">
              Location Category (Required)
            </ThemedText>
            <LocationCategoryPicker
              disabled={saving}
              hasError={Boolean(
                formValidation?.fieldMessages.category,
              )}
              onChange={(category) =>
                updateField('category', category)
              }
              value={form.category}
            />

            {renderFieldError('category')}

            <SectionHelpHeading
              label="BADGE CONNECTIONS"
              items={[
                {
                  label: 'Badge Tags',
                  description: 'The topics this location counts toward for badge progress. Every location needs at least one. Reuse an existing tag so related locations contribute to the same badges, or add a new tag when needed.',
                },
              ]}
            />

            <ThemedView
              style={[
                styles.badgeTagField,
                formValidation?.fieldMessages.badgesText &&
                  styles.badgeTagFieldError,
              ]}>
              <ThemedText type="smallBold">Badge Tags (Required)</ThemedText>
              <BadgeTagPicker
                availableTags={availableBadgeTags}
                disabled={saving}
                maxSelected={MAX_LOCATION_BADGE_TAGS}
                minimumSelected={1}
                mode="multiple"
                onChange={(tags) =>
                  updateField('badgesText', tags.join(', '))
                }
                selectedTags={selectedBadgeTags}
              />

              {renderFieldError('badgesText')}
            </ThemedView>

            <ThemedView style={styles.advancedSection}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: advancedGroupingOpen }}
                onPress={() =>
                  setAdvancedGroupingOpen((current) => !current)
                }
                style={({ pressed }) => [
                  styles.advancedToggle,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">
                  ADVANCED GROUPING FIELDS
                </ThemedText>
                <ThemedText>{advancedGroupingOpen ? '▲' : '▼'}</ThemedText>
              </Pressable>

              {advancedGroupingOpen ? (
                <ThemedView style={styles.advancedFields}>
                  <ThemedText type="small" themeColor="textSecondary">
                    These optional future-facing identifiers connect locations
                    used by story- or region-based badge rules. Leave them blank
                    unless related locations intentionally share the same key.
                  </ThemedText>

                  <ThemedText type="smallBold">Story Key (Optional)</ThemedText>
                  <TextInput
                    accessibilityLabel="Story key"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={(value) => updateField('storyKey', value)}
                    placeholder="Story key (optional)"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.textSecondary,
                        color: theme.text,
                      },
                    ]}
                    value={form.storyKey}
                  />

                  <ThemedText type="smallBold">Region Key (Optional)</ThemedText>
                  <TextInput
                    accessibilityLabel="Region key"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={(value) => updateField('regionKey', value)}
                    placeholder="Region key (optional)"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.textSecondary,
                        color: theme.text,
                      },
                    ]}
                    value={form.regionKey}
                  />
                </ThemedView>
              ) : null}
            </ThemedView>

            <ThemedView
              type="backgroundSelected"
              style={styles.formActionsPanel}>
              <ThemedView style={styles.formActionsCopy}>
                <ThemedText type="smallBold">Ready to Finish?</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Save to publish these location details to the app.
                </ThemedText>
              </ThemedView>

              {formValidation ? (
                <ThemedView
                  accessibilityLiveRegion="assertive"
                  accessibilityRole="alert"
                  style={styles.formValidationAlert}>
                  <ThemedText
                    type="smallBold"
                    style={styles.formValidationAlertText}>
                    Can’t Save Yet
                  </ThemedText>
                  <ThemedText style={styles.formValidationAlertText}>
                    {formValidation.message}
                  </ThemedText>
                </ThemedView>
              ) : null}

              <ThemedView style={styles.formActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  formMode === 'create'
                    ? 'Create location'
                    : 'Save changes'
                }
                accessibilityHint={
                  formMode === 'create'
                    ? 'Creates this location in the app content.'
                    : 'Saves the current location changes.'
                }
                disabled={saving || geminiBusy}
                onPress={submitForm}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (saving || geminiBusy) && styles.disabledButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.buttonText}>
                    {saving
                    ? formMode === 'create'
                      ? 'Creating Location...'
                      : 'Saving Changes...'
                    : formMode === 'create'
                      ? 'Create Location'
                      : 'Save Changes'}
                </ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                accessibilityHint="Returns to the searchable location list without saving."
                disabled={saving}
                onPress={closeForm}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  saving && styles.disabledButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.secondaryButtonText}>
                  Cancel
                </ThemedText>
              </Pressable>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        ) : adminLocations === undefined ? null : adminLocations.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            No locations have been added yet.
          </ThemedText>
        ) : filteredLocations.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            No locations match your search and selected status.
          </ThemedText>
        ) : (
          <ThemedView
            style={[
              styles.locationList,
              locationViewMode === 'grid' && styles.locationGrid,
            ]}>
            {filteredLocations.map((location) => {
              const retiredDate = location.retiredAt === undefined
                ? null
                : new Date(location.retiredAt).toLocaleDateString();
              const confirming =
                confirmingLocationId === location._id;
              const changing = changingLocationId === location._id;

              return (
                <ThemedView
                  key={location._id}
                  type="backgroundElement"
                  style={[
                    styles.locationCard,
                    locationViewMode === 'grid' && styles.locationGridCard,
                    { borderColor: theme.border },
                  ]}>
                  <ThemedView
                    style={[
                      styles.locationCardHeader,
                      locationViewMode === 'grid' &&
                        styles.locationCardHeaderGrid,
                    ]}>
                    <ThemedView
                      style={[
                        styles.locationCardCopy,
                        locationViewMode === 'grid' &&
                          styles.locationCardCopyGrid,
                      ]}>
                      <ThemedText type="smallBold" style={styles.locationName}>
                        {location.name}
                      </ThemedText>

                      <ThemedText themeColor="textSecondary">
                        {location.category}
                      </ThemedText>

                      {location.isLore ? (
                        <ThemedView style={styles.lorePill}>
                          <ThemedText
                            type="smallBold"
                            style={styles.lorePillText}>
                            Lore / Legend
                          </ThemedText>
                        </ThemedView>
                      ) : null}

                      <ThemedText type="small" themeColor="textSecondary">
                        {location.key || 'No stable key'}
                      </ThemedText>
                    </ThemedView>

                    <ThemedView
                      style={[
                        styles.statusPill,
                        location.retired
                          ? styles.statusPillRetired
                          : styles.statusPillActive,
                      ]}>
                      <ThemedText type="smallBold" style={styles.statusPillText}>
                        {location.retired ? 'Retired' : 'Active'}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>

                  {(location.latitude != null && location.longitude != null) && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {`Latitude ${location.latitude}, Longitude ${location.longitude}`}
                    </ThemedText>
                  )}

                  {location.retired && retiredDate ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {`Retired on ${retiredDate}`}
                    </ThemedText>
                  ) : null}

                  <ThemedView style={styles.badgeRow}>
                    {(location.badges?.length ?? 0) > 0 ? (
                      [...new Set(location.badges)].map((badgeTag) => (
                        <ThemedView
                          key={`${location._id}-${badgeTag}`}
                          style={styles.badgePill}>
                          <ThemedText type="small" style={styles.badgePillText}>
                            {badgeTag}
                          </ThemedText>
                        </ThemedView>
                      ))
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">
                        No badge tags
                      </ThemedText>
                    )}
                  </ThemedView>

                  <ThemedView
                    style={[
                      styles.formActions,
                      styles.locationCardActions,
                    ]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${location.name}`}
                      accessibilityHint="Opens the location form so you can edit this location."
                      disabled={changingLocationId !== null}
                      onPress={() => openEditForm(location)}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        styles.locationCardActionButton,
                        changingLocationId !== null && styles.disabledButton,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText style={styles.secondaryButtonText}>
                        Edit
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        location.retired
                          ? `Reactivate ${location.name}`
                          : `Retire ${location.name}`
                      }
                      accessibilityHint="Opens a confirmation before changing this location's status."
                      disabled={changingLocationId !== null}
                      onPress={() => setConfirmingLocationId(location._id)}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        styles.locationCardActionButton,
                        changingLocationId !== null && styles.disabledButton,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText style={styles.secondaryButtonText}>
                        {location.retired ? 'Reactivate' : 'Retire'}
                      </ThemedText>
                    </Pressable>
                  </ThemedView>

                  {confirming ? (
                    <ThemedView
                      type="backgroundElement"
                      style={styles.locationStatusConfirmation}>
                      <ThemedText accessibilityLiveRegion="polite">
                        {location.retired
                          ? 'Reactivating this location returns it to the public map and allows new check-ins. Existing history remains unchanged.'
                          : 'Retiring this location hides it from the public map and blocks new check-ins. Existing visits, badge progress, and awards remain.'}
                      </ThemedText>

                      <ThemedView style={styles.formActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{
                            busy: changing,
                            disabled: changing,
                          }}
                          disabled={changing}
                          onPress={() => changeLocationRetiredState(location)}
                          style={({ pressed }) => [
                            styles.primaryButton,
                            changing && styles.disabledButton,
                            pressed && styles.pressed,
                          ]}>
                          <ThemedText style={styles.buttonText}>
                            {changing
                              ? 'Saving status...'
                              : location.retired
                                ? 'Confirm Reactivation'
                                : 'Confirm Retirement'}
                          </ThemedText>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Cancel status change"
                          disabled={changing}
                          onPress={() => setConfirmingLocationId(null)}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            changing && styles.disabledButton,
                            pressed && styles.pressed,
                          ]}>
                          <ThemedText style={styles.secondaryButtonText}>
                            Cancel
                          </ThemedText>
                        </Pressable>
                      </ThemedView>
                    </ThemedView>
                  ) : null}
                </ThemedView>
              );
            })}
          </ThemedView>
        )}
          </>
        ) : null}

        <BadgeManager visible={portalSection === 'badges'} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  centeredText: {
    textAlign: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  headerSection: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: PortalContentWidth,
    alignSelf: 'center',
    padding: Spacing.five,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  eyebrow: {
    letterSpacing: 1.6,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
  },
  subtitle: {
    maxWidth: 560,
  },
  linkRow: {
    width: '100%',
    maxWidth: PortalContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  toolbarCopy: {
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  workspaceTitle: {
    fontSize: 26,
    lineHeight: 34,
  },
  sectionTabs: {
    width: '100%',
    maxWidth: PortalContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
    padding: Spacing.one,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  sectionTab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  sectionTabSelected: {
    backgroundColor: Palette.lightBronze,
  },
  sectionTabTextSelected: {
    color: Palette.ink,
  },
  linkButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.lightBronze,
  },
  linkButtonText: {
    color: Palette.ink,
  },
  secondaryLinkButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.teaGreen,
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
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  disabledButton: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: Palette.ink,
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: Palette.ink,
    textAlign: 'center',
  },
  statusMessage: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  searchCard: {
    width: '100%',
    maxWidth: PortalContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  searchHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  searchHeaderCopy: {
    flex: 1,
    minWidth: 220,
    gap: Spacing.one,
  },
  searchInput: {
    minHeight: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  statusFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  statusFilterButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  statusFilterButtonSelected: {
    backgroundColor: Palette.lightBronze,
  },
  statusFilterText: {
    color: Palette.ink,
  },
  clearButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  summaryCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  formCard: {
    width: '100%',
    maxWidth: PortalContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  formTitle: {
    fontSize: 26,
    lineHeight: 34,
  },
  formInput: {
    minHeight: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  lockedStableKeyInput: {
    opacity: 0.7,
  },
  stableKeyWarning: {
    gap: Spacing.two,
    borderWidth: 2,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  stableKeyWarningTitle: {
    color: Palette.danger,
  },
  inlineSecondaryButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  warningButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.danger,
  },
  warningButtonText: {
    color: Palette.onDanger,
    textAlign: 'center',
  },
  formTextArea: {
    minHeight: 120,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlignVertical: 'top',
  },
  loreToggle: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  loreToggleSelected: {
    backgroundColor: Palette.teaGreen,
  },
  loreCheckbox: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 6,
  },
  loreCheckboxMark: {
    color: Palette.ink,
    lineHeight: 20,
  },
  loreToggleCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  fieldErrorText: {
    color: Palette.danger,
    lineHeight: 20,
  },
  badgeTagField: {
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  badgeTagFieldError: {
    borderColor: Palette.danger,
    borderWidth: 2,
  },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  formActionsPanel: {
    marginTop: Spacing.four,
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  formActionsCopy: {
    gap: Spacing.one,
  },
  formValidationAlert: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: Palette.danger,
  },
  formValidationAlertText: {
    color: Palette.onDanger,
  },
  geminiContainer: {
    gap: Spacing.two,
  },
  geminiButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.lightBronze,
  },
  geminiButtonText: {
    color: Palette.ink,
    textAlign: 'center',
  },
  geminiPanel: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  geminiHelp: {
    lineHeight: 20,
  },
  geminiStatusMessage: {
    lineHeight: 20,
  },
  geminiInput: {
    minHeight: 120,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlignVertical: 'top',
  },
  geminiActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  geminiBusyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  locationList: {
    width: '100%',
    maxWidth: PortalContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  locationCard: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  locationGridCard: {
    flexBasis: 360,
    flexGrow: 1,
    maxWidth: 510,
    minWidth: 320,
    minHeight: 330,
  },
  locationCardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  locationCardHeaderGrid: {
    flexDirection: 'row',
  },
  locationCardCopy: {
    flex: 1,
    minWidth: 220,
    gap: Spacing.one,
  },
  locationCardCopyGrid: {
    minWidth: 0,
    width: '100%',
  },
  locationName: {
    fontSize: 18,
    lineHeight: 24,
  },
  advancedSection: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  advancedToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  locationCardActions: {
    marginTop: 'auto',
    paddingTop: Spacing.two,
  },
  locationCardActionButton: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 112,
  },
  advancedFields: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  statusPill: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  statusPillActive: {
    backgroundColor: Palette.teaGreen,
  },
  statusPillRetired: {
    backgroundColor: Palette.beige,
  },
  statusPillText: {
    color: Palette.ink,
  },
  lorePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: Palette.lightBronze,
  },
  lorePillText: {
    color: Palette.ink,
  },
  locationStatusConfirmation: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  badgePill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.beige,
  },
  badgePillText: {
    color: Palette.ink,
  },
});
