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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BadgeManager } from '@/components/admin/badge-manager';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const GENERATION_TIMEOUT_MS = 120_000;

type FormMode = 'create' | 'edit';
type PortalSection = 'locations' | 'badges';

type LocationFormState = {
  name: string;
  key: string;
  description: string;
  latitude: string;
  longitude: string;
  category: string;
  badgesText: string;
  storyKey: string;
  regionKey: string;
};

const emptyForm: LocationFormState = {
  name: '',
  key: '',
  description: '',
  latitude: '',
  longitude: '',
  category: '',
  badgesText: '',
  storyKey: '',
  regionKey: '',
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
  const [saving, setSaving] = useState(false);
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

    if (!normalizedSearch) {
      return adminLocations;
    }

    return adminLocations.filter((location) => {
      const searchableText = [
        location.name,
        location.key,
        location.category,
        ...(location.badges ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [adminLocations, search]);

  const openCreateForm = () => {
    setFormMode('create');
    setEditingId(null);
    setForm(emptyForm);
    setStatusMessage(null);
    resetGeminiState();
  };

  const openEditForm = (location: {
    _id: string;
    name: string;
    key?: string;
    description: string;
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
      key: location.key ?? '',
      description: location.description,
      latitude: location.latitude != null ? String(location.latitude) : '',
      longitude: location.longitude != null ? String(location.longitude) : '',
      category: location.category ?? '',
      badgesText: (location.badges ?? []).join(', '),
      storyKey: location.storyKey ?? '',
      regionKey: location.regionKey ?? '',
    });
    setStatusMessage(null);
    resetGeminiState();
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingId(null);
    setForm(emptyForm);
    setStatusMessage(null);
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

  const updateField = (
    field: keyof LocationFormState,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (statusMessage) {
      setStatusMessage(null);
    }
  };

  const parseBadgeTags = (value: string) =>
    value
      .split(/[\n,]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);

  const validateForm = () => {
    const requiredFields: Array<keyof LocationFormState> = [
      'name',
      'key',
      'description',
      'latitude',
      'longitude',
      'category',
    ];

    for (const field of requiredFields) {
      if (!String(form[field]).trim()) {
        return 'Please complete all required fields.';
      }
    }

    const latitude = Number(form.latitude);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      return 'Latitude must be a finite number from -90 through 90.';
    }

    const longitude = Number(form.longitude);
    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return 'Longitude must be a finite number from -180 through 180.';
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.key.trim())) {
      return 'Stable key must use lowercase letters, numbers, and single hyphens only.';
    }

    return null;
  };

  const submitForm = async () => {
    if (saving) {
      return;
    }

    const validationMessage = validateForm();
    if (validationMessage) {
      setStatusMessage(validationMessage);
      return;
    }

    const trimmedKey = form.key.trim();
    const storyKey = form.storyKey.trim() || undefined;
    const regionKey = form.regionKey.trim() || undefined;
    const badges = parseBadgeTags(form.badgesText);

    setSaving(true);
    setStatusMessage(null);
    resetGeminiState();

    try {
      if (formMode === 'create') {
        await createLocation({
          name: form.name.trim(),
          key: trimmedKey,
          description: form.description.trim(),
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

      setStatusMessage(getErrorMessage(error, fallback));
    } finally {
      setSaving(false);
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
        <ThemedView style={styles.headerSection}>
          <ThemedText
            accessibilityRole="header"
            type="title"
            style={styles.title}>
            Content portal
          </ThemedText>

          <ThemedText
            style={styles.subtitle}
            themeColor="textSecondary">
            This website manages content used by the Tuna Bassoon app.
          </ThemedText>
        </ThemedView>

        <ThemedView
          accessibilityRole="tablist"
          accessibilityLabel="Content portal sections"
          type="backgroundElement"
          style={styles.sectionTabs}>
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

        <ThemedView type="backgroundElement" style={styles.linkRow}>
          <Link
            href="/"
            accessibilityLabel="Back to home"
            accessibilityHint="Returns to the main Tuna Bassoon home screen."
            style={styles.linkButton}>
            <ThemedText type="smallBold" style={styles.linkButtonText}>
              Home
            </ThemedText>
          </Link>

          {!formMode && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add new location"
              accessibilityHint="Create a new location entry for the app."
              onPress={openCreateForm}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.buttonText}>
                Add new location
              </ThemedText>
            </Pressable>
          )}
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

        <ThemedView type="backgroundElement" style={styles.searchCard}>
          <ThemedText type="smallBold">Search locations</ThemedText>

          <TextInput
            accessibilityLabel="Search locations"
            accessibilityHint="Filter the location list by name, key, category, or badge tag."
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setSearch}
            placeholder="Search by name, key, category, or tag"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.background,
                borderColor: theme.textSecondary,
                color: theme.text,
              },
            ]}
            value={search}
          />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.summaryCard}>
          {adminLocations === undefined ? (
            <>
              <ActivityIndicator
                accessibilityLabel="Loading location list"
                accessibilityRole="progressbar"
                size="small"
              />

              <ThemedText themeColor="textSecondary">
                Loading location list...
              </ThemedText>
            </>
          ) : (
            <ThemedText themeColor="textSecondary">
              {`Showing ${filteredLocations.length} of ${adminLocations.length} locations`}
            </ThemedText>
          )}
        </ThemedView>

        {formMode ? (
          <ThemedView type="backgroundElement" style={styles.formCard}>
            <ThemedText type="smallBold">
              {formMode === 'create'
                ? 'Add a new location'
                : 'Edit location'}
            </ThemedText>

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
                  borderColor: theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.name}
            />

            <TextInput
              accessibilityLabel="Stable key"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(value) => updateField('key', value)}
              placeholder="stable-key"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.formInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.key}
            />

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
                  borderColor: theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.description}
            />

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
                      ? 'Close Gemini tools'
                      : 'Draft description with Gemini'}
                  </ThemedText>
                </Pressable>

                {geminiOpen && (
                  <ThemedView style={styles.geminiPanel}>
                    <ThemedText
                      themeColor="textSecondary"
                      style={styles.geminiHelp}>
                      Gemini uses the current form to create a draft. It does not save or publish anything automatically.
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
                          {geminiBusy ? 'Generating draft...' : 'Generate draft'}
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
                          Close Gemini tools
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
                  borderColor: theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.latitude}
            />

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
                  borderColor: theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.longitude}
            />

            <TextInput
              accessibilityLabel="Category"
              autoCapitalize="words"
              onChangeText={(value) => updateField('category', value)}
              placeholder="Category"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.formInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.category}
            />

            <TextInput
              accessibilityLabel="Badge tags"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(value) => updateField('badgesText', value)}
              placeholder="Badge tags, comma or newline separated"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.formInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.textSecondary,
                  color: theme.text,
                },
              ]}
              value={form.badgesText}
            />

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
                      ? 'Creating location...'
                      : 'Saving changes...'
                    : formMode === 'create'
                      ? 'Create location'
                      : 'Save changes'}
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
        ) : adminLocations === undefined ? null : adminLocations.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            No locations have been added yet.
          </ThemedText>
        ) : filteredLocations.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            No locations match your search.
          </ThemedText>
        ) : (
          <ThemedView style={styles.locationList}>
            {filteredLocations.map((location) => (
              <ThemedView
                key={location._id}
                type="backgroundElement"
                style={styles.locationCard}>
                <ThemedText type="smallBold">
                  {location.name}
                </ThemedText>

                <ThemedText themeColor="textSecondary">
                  {location.category}
                </ThemedText>

                <ThemedText type="small" themeColor="textSecondary">
                  {location.key || 'No stable key'}
                </ThemedText>

                {(location.latitude != null && location.longitude != null) && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {`Latitude ${location.latitude}, Longitude ${location.longitude}`}
                  </ThemedText>
                )}

                <ThemedView style={styles.badgeRow}>
                  {(location.badges?.length ?? 0) > 0 ? (
                    location.badges.map((badgeTag) => (
                      <ThemedView
                        key={`${location._id}-${badgeTag}`}
                        style={styles.badgePill}>
                        <ThemedText type="small" themeColor="textSecondary">
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

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${location.name}`}
                  accessibilityHint="Opens the location form so you can edit this location."
                  onPress={() => openEditForm(location)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText style={styles.secondaryButtonText}>
                    Edit
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ))}
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
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
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
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  sectionTabs: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
    padding: Spacing.one,
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
    backgroundColor: '#A51C30',
  },
  sectionTabTextSelected: {
    color: '#FFFFFF',
  },
  linkButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: '#A51C30',
  },
  linkButtonText: {
    color: '#FFFFFF',
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#A51C30',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#E0E1E6',
  },
  disabledButton: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#111111',
    textAlign: 'center',
  },
  statusMessage: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  searchCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  searchInput: {
    minHeight: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  formInput: {
    minHeight: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  formTextArea: {
    minHeight: 120,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
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
    backgroundColor: '#A51C30',
  },
  geminiButtonText: {
    color: '#FFFFFF',
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
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
  },
  locationCard: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
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
    borderColor: '#D0D5DD',
  },
});
