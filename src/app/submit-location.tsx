import {
  useAction,
  useConvexAuth,
  useMutation,
  useQuery,
} from 'convex/react';
import * as Location from 'expo-location';
import { useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { DraggableScrollView } from '@/components/draggable-scroll-view';
import {
  SubmissionLocationPicker,
  type SubmissionCoordinates,
} from '@/components/submission-location-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  Palette,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../convex/_generated/api';

type FormState = {
  name: string;
  description: string;
  funFact: string;
  source: string;
  locationInput: string;
  locationNotes: string;
  isLore: boolean;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  funFact: '',
  source: '',
  locationInput: '',
  locationNotes: '',
  isLore: false,
};

const HARVARD_YARD: SubmissionCoordinates = [-71.1167, 42.377];

const statusLabels: Record<string, string> = {
  ready: 'Awaiting Review',
  needs_attention: 'Needs Attention',
  possible_duplicate: 'Possible Duplicate',
  suggested_edit: 'Suggested Edit',
  already_published: 'Suggested Edit',
  published: 'Published',
  kept_existing: 'Existing Location Kept',
  dismissed: 'Not Published',
  rejected_by_filter: 'Held for Review',
};

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'string'
  ) {
    return error.data;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to submit this location right now.';
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  required = false,
  multiline = false,
  keyboardType,
  maximumLength,
  onFocus,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  helper?: string;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
  maximumLength: number;
  onFocus?: (field: View | null) => void;
}) {
  const theme = useTheme();
  const fieldRef = useRef<View>(null);

  return (
    <View collapsable={false} ref={fieldRef} style={styles.field}>
      <View style={styles.fieldHeading}>
        <ThemedText type="smallBold">
          {label}{required ? ' (Required)' : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {value.length} / {maximumLength}
        </ThemedText>
      </View>
      {helper ? (
        <ThemedText type="small" themeColor="textSecondary">
          {helper}
        </ThemedText>
      ) : null}
      <TextInput
        accessibilityLabel={`${label}${required ? ', required' : ''}`}
        keyboardType={keyboardType}
        maxLength={maximumLength}
        multiline={multiline}
        onChangeText={onChangeText}
        onFocus={() => onFocus?.(fieldRef.current)}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          multiline && styles.textArea,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        value={value}
      />
    </View>
  );
}

export default function SubmitLocationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const focusedFieldRef = useRef<View | null>(null);
  useScrollToTop(scrollViewRef);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );
  const submissions = useQuery(
    api.adminIngest.getMyLocationSubmissions,
    isAuthenticated && currentUser?.canSubmitContent ? {} : 'skip',
  );
  const submitLocationProposal = useMutation(
    api.adminIngest.submitLocationProposal,
  );
  const resolveLocationInput = useAction(
    api.contentLocationLookup.resolveSubmissionLocationInput,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [mapCenter, setMapCenter] =
    useState<SubmissionCoordinates>(HARVARD_YARD);
  const [selectedCoordinates, setSelectedCoordinates] =
    useState<SubmissionCoordinates | null>(null);
  const selectedCoordinatesRef =
    useRef<SubmissionCoordinates | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [lookingUpLocation, setLookingUpLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const scrollFocusedFieldIntoView = useCallback(() => {
    const field = focusedFieldRef.current;
    const scrollView = scrollViewRef.current;

    if (!field || !scrollView) {
      return;
    }

    field.measureInWindow((_fieldX, fieldY) => {
      scrollView.scrollTo({
        animated: true,
        y: Math.max(
          0,
          scrollOffsetRef.current +
            fieldY -
            safeAreaInsets.top -
            Spacing.three,
        ),
      });
    });
  }, [safeAreaInsets.top]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const subscription = Keyboard.addListener(
      'keyboardDidShow',
      scrollFocusedFieldIntoView,
    );
    return () => subscription.remove();
  }, [scrollFocusedFieldIntoView]);

  const keepFocusedFieldVisible = (field: View | null) => {
    if (Platform.OS !== 'ios' || !field) {
      return;
    }

    focusedFieldRef.current = field;
    setTimeout(scrollFocusedFieldIntoView, 220);
    if (Keyboard.isVisible()) {
      setTimeout(scrollFocusedFieldIntoView, 60);
    }
  };

  useEffect(() => {
    let active = true;

    if (!currentUser?.canSubmitContent) {
      return;
    }

    void Location.getForegroundPermissionsAsync()
      .then(async (permission) => {
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!active || selectedCoordinatesRef.current) {
          return;
        }
        const coordinates: SubmissionCoordinates = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        selectedCoordinatesRef.current = coordinates;
        setMapCenter(coordinates);
        setSelectedCoordinates(coordinates);
        setLocationMessage('The pin started at your current location.');
      })
      .catch(() => {
        // The map remains usable at its Harvard Yard fallback.
      });

    return () => {
      active = false;
    };
  }, [currentUser?.canSubmitContent]);

  const canSubmit =
    form.name.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.source.trim().length > 0 &&
    selectedCoordinates !== null &&
    !submitting;

  const update = <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const chooseCoordinates = (coordinates: SubmissionCoordinates) => {
    selectedCoordinatesRef.current = coordinates;
    setSelectedCoordinates(coordinates);
    setMapCenter(coordinates);
    setLocationMessage('Location pin selected.');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const locateCurrentPosition = async () => {
    setLocating(true);
    setLocationMessage(null);

    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationMessage(
          'Location access was not granted. Search for the place or tap the map instead.',
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      chooseCoordinates([
        position.coords.longitude,
        position.coords.latitude,
      ]);
      setLocationMessage('The pin is at your current location.');
    } catch {
      setLocationMessage(
        'Your current location is temporarily unavailable. Search for the place or tap the map instead.',
      );
    } finally {
      setLocating(false);
    }
  };

  const findEnteredLocation = async () => {
    const input = form.locationInput.trim();
    if (!input) {
      setLocationMessage('Enter an address, place name, or Google Maps link.');
      return;
    }

    setLookingUpLocation(true);
    setLocationMessage(null);

    try {
      const result = await resolveLocationInput({ input });
      chooseCoordinates([result.longitude, result.latitude]);
      setLocationMessage(`Pin placed at ${result.displayName}.`);
    } catch (error) {
      setLocationMessage(getErrorMessage(error));
    } finally {
      setLookingUpLocation(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) {
      setErrorMessage(
        selectedCoordinates
          ? 'Complete all required fields before submitting.'
          : 'Choose the location by searching, using your current location, or tapping the map.',
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!selectedCoordinates) {
        throw new Error('Choose a location pin before submitting.');
      }
      const result = await submitLocationProposal({
        name: form.name,
        description: form.description,
        funFact: form.funFact.trim() || undefined,
        source: form.source,
        locationInput: form.locationInput.trim() || undefined,
        locationNotes: form.locationNotes.trim() || undefined,
        latitude: selectedCoordinates[1],
        longitude: selectedCoordinates[0],
        isLore: form.isLore,
      });

      const suggestions = [
        result.suggestions.category
          ? `category: ${result.suggestions.category}`
          : null,
        result.suggestions.badges.length > 0
          ? `badge tags: ${result.suggestions.badges.join(', ')}`
          : null,
      ].filter(Boolean);
      setSuccessMessage(
        result.moderationFiltered
          ? 'Your suggestion was received and held for administrator review by the automatic content-safety filter. It has not been published.'
          : `Your suggestion was added to the private review queue.${suggestions.length > 0 ? ` Automatic suggestions included ${suggestions.join(' and ')}.` : ''} Nothing was published yet.`,
      );
      setForm(emptyForm);
      selectedCoordinatesRef.current = null;
      setSelectedCoordinates(null);
      setLocationMessage(null);
      scrollViewRef.current?.scrollTo({ animated: true, y: 0 });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || (isAuthenticated && currentUser === undefined)) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator
          accessibilityLabel="Loading content submission access"
          accessibilityRole="progressbar"
          size="large"
        />
      </ThemedView>
    );
  }

  if (!isAuthenticated || !currentUser?.canSubmitContent) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.messageSafeArea}>
          <ThemedView
            type="backgroundElement"
            style={[styles.messageCard, { borderColor: theme.border }]}>
            <ThemedText accessibilityRole="header" type="title">
              Submission Access Required
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Location suggestions are currently available to administrators
              and Trusted Contributors. More ways to qualify will be added as
              the community program develops.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/settings')}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Back to Settings</ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <DraggableScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
          scrollViewRef={scrollViewRef}
          onScrollOffsetChange={(offset) => {
            scrollOffsetRef.current = offset;
          }}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.heading}>
            <ThemedText accessibilityRole="header" type="title">
              Submit a Location
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Share a place that belongs on the Tuna Bassoon map. Your idea
              stays private until an administrator reviews it.
            </ThemedText>
          </View>

          {successMessage ? (
            <ThemedView
              accessibilityLiveRegion="polite"
              style={[
                styles.feedbackCard,
                { backgroundColor: theme.accentSoft },
              ]}>
              <ThemedText type="smallBold">Submission Received</ThemedText>
              <ThemedText>{successMessage}</ThemedText>
            </ThemedView>
          ) : null}

          {errorMessage ? (
            <ThemedView
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={[
                styles.feedbackCard,
                { borderColor: theme.danger, borderWidth: 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.danger }}>
                Check Your Submission
              </ThemedText>
              <ThemedText>{errorMessage}</ThemedText>
            </ThemedView>
          ) : null}

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText accessibilityRole="header" type="subtitle">
              Place the Location Pin
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Search for an address or place, paste a Google Maps link, use
              your current location, or tap directly on the map. You can move
              the pin again before submitting.
            </ThemedText>

            <FormField
              label="Address, Place, or Google Maps Link"
              maximumLength={1500}
              onChangeText={(value) => update('locationInput', value)}
              onFocus={keepFocusedFieldVisible}
              placeholder="Harvard Hall, Cambridge MA or a Google Maps link"
              helper="Address searches use OpenStreetMap to place the pin."
              value={form.locationInput}
            />

            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={lookingUpLocation || !form.locationInput.trim()}
                onPress={() => void findEnteredLocation()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  (lookingUpLocation || !form.locationInput.trim()) &&
                    styles.disabled,
                ]}>
                {lookingUpLocation ? (
                  <ActivityIndicator color={Palette.paper} size="small" />
                ) : (
                  <ThemedText
                    type="smallBold"
                    style={styles.primaryButtonText}>
                    Find This Place
                  </ThemedText>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={locating}
                onPress={() => void locateCurrentPosition()}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                  locating && styles.disabled,
                ]}>
                {locating ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <ThemedText type="smallBold">
                    Use My Current Location
                  </ThemedText>
                )}
              </Pressable>
            </View>

            <SubmissionLocationPicker
              center={mapCenter}
              onSelect={chooseCoordinates}
              selectedCoordinates={selectedCoordinates}
            />

            <ThemedView
              accessibilityLiveRegion="polite"
              style={[
                styles.pinStatus,
                {
                  backgroundColor: selectedCoordinates
                    ? theme.accentSoft
                    : theme.surfaceWarm,
                },
              ]}>
              <ThemedText type="smallBold">
                {selectedCoordinates
                  ? 'Location Pin Selected'
                  : 'Location Pin Required'}
              </ThemedText>
              <ThemedText type="small">
                {locationMessage ??
                  (selectedCoordinates
                    ? 'The proposed location is ready.'
                    : 'Search, use your location, or tap the map to continue.')}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText accessibilityRole="header" type="subtitle">
              Location Details
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Automatic suggestions may fill in a category, map icon, and
              related badge tags. Administrators can correct those suggestions
              during review.
            </ThemedText>

            <FormField
              label="Location Name"
              maximumLength={120}
              onChangeText={(value) => update('name', value)}
              onFocus={keepFocusedFieldVisible}
              placeholder="Example: Apthorp House"
              required
              value={form.name}
            />
            <FormField
              label="Description"
              maximumLength={5000}
              multiline
              onChangeText={(value) => update('description', value)}
              onFocus={keepFocusedFieldVisible}
              placeholder="What makes this place interesting or important?"
              required
              value={form.description}
            />
            <FormField
              label="Additional Location Details"
              maximumLength={1000}
              multiline
              onChangeText={(value) => update('locationNotes', value)}
              onFocus={keepFocusedFieldVisible}
              placeholder="Optional nearby landmark, building entrance, or directions"
              helper="Add this only when the pin or address needs clarification."
              value={form.locationNotes}
            />
            <FormField
              label="Source"
              maximumLength={1000}
              multiline
              onChangeText={(value) => update('source', value)}
              onFocus={keepFocusedFieldVisible}
              placeholder="Publication, museum, book, article, organization, or URL"
              helper="A URL is helpful when available, but it is not required."
              required
              value={form.source}
            />
            <FormField
              label="Fun Fact"
              maximumLength={1000}
              multiline
              onChangeText={(value) => update('funFact', value)}
              onFocus={keepFocusedFieldVisible}
              placeholder="Optional extra detail"
              value={form.funFact}
            />

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <ThemedText type="smallBold">
                  Includes Lore or Legend
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Mark this when some of the story may be traditional,
                  legendary, or not fully verifiable.
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: form.isLore }}
                accessibilityLabel="Includes Lore or Legend"
                onPress={() => update('isLore', !form.isLore)}
                style={[
                  styles.switchTrack,
                  {
                    backgroundColor: form.isLore
                      ? theme.accent
                      : theme.border,
                  },
                ]}>
                <View
                  style={[
                    styles.switchThumb,
                    form.isLore && styles.switchThumbOn,
                  ]}
                />
              </Pressable>
            </View>
          </ThemedView>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit Location for Review"
              disabled={!canSubmit}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                !canSubmit && styles.disabled,
              ]}>
              {submitting ? (
                <ActivityIndicator color={Palette.paper} />
              ) : (
                <ThemedText
                  type="smallBold"
                  style={styles.primaryButtonText}>
                  Submit for Review
                </ThemedText>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/settings')}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
          </View>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText accessibilityRole="header" type="subtitle">
              Your Recent Submissions
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Only you and administrators can see these proposals before they
              are published.
            </ThemedText>
            {submissions === undefined ? (
              <ActivityIndicator
                accessibilityLabel="Loading recent submissions"
                size="small"
              />
            ) : submissions.length === 0 ? (
              <ThemedText themeColor="textSecondary">
                You have not submitted a location yet.
              </ThemedText>
            ) : (
              submissions.map((submission) => (
                <View
                  key={submission.id}
                  style={[styles.submissionRow, { borderColor: theme.border }]}>
                  <View style={styles.submissionCopy}>
                    <ThemedText type="smallBold">{submission.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Submitted {formatDate(submission.createdAt)}
                    </ThemedText>
                  </View>
                  <ThemedView
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          submission.status === 'published'
                            ? theme.accentSoft
                            : theme.surfaceWarm,
                      },
                    ]}>
                    <ThemedText type="smallBold">
                      {statusLabels[submission.status] ?? 'In Review'}
                    </ThemedText>
                  </ThemedView>
                </View>
              ))
            )}
          </ThemedView>
        </DraggableScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  messageSafeArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  messageCard: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
    maxWidth: 560,
    padding: Spacing.four,
    width: '100%',
  },
  scrollContent: {
    alignSelf: 'center',
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset + Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    width: '100%',
  },
  heading: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  feedbackCard: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  fieldHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  textArea: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  toggleCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  switchTrack: {
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    padding: 3,
    width: 56,
  },
  switchThumb: {
    backgroundColor: Palette.paper,
    borderRadius: 999,
    height: 26,
    width: 26,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  pinStatus: {
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.bronzeDeep,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  primaryButtonText: {
    color: Palette.paper,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  submissionRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
  },
  submissionCopy: {
    flex: 1,
    gap: Spacing.one,
    minWidth: 180,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.5,
  },
});
