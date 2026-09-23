import {
  useConvexAuth,
  useAction,
  useMutation,
  useQuery,
} from 'convex/react';
import { useState } from 'react';
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
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const GENERATION_TIMEOUT_MS = 120_000;

function getEditorErrorMessage(
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

export default function EditorScreen() {
  const { isAuthenticated, isLoading: isAuthLoading } =
    useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );
  const locations = useQuery(api.locations.getLocations);

  const generate = useAction(
    api.locationAgent.generateLocationDescription,
  );

  const approve = useMutation(
    api.locationAgent.approveLocationDescription,
  );

  const [selectedId, setSelectedId] =
    useState<Id<'locations'> | null>(null);

  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedLocation = locations?.find(
    (location) => location._id === selectedId,
  );

  const announce = (text: string) => {
    AccessibilityInfo.announceForAccessibility(text);
  };

  const handleSelectLocation = (
    locationId: Id<'locations'>,
    locationName: string,
  ) => {
    setSelectedId(locationId);
    setDraft(null);
    setMessage(null);
    announce(`${locationName} selected.`);
  };

  const handleGenerate = async () => {
    if (!selectedId) {
      const text = 'Choose a location before drafting a description.';
      setMessage(text);
      announce(text);
      return;
    }

    setBusy(true);
    setMessage(
      'Gemini is drafting. This may take a moment during high demand.',
    );

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const generationPromise = generate({
        locationId: selectedId,
        editorialNotes: notes.trim() || undefined,
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
        setMessage(text);
        announce(text);
        return;
      }

      if (result.status === 'unavailable') {
        setMessage(result.message);
        announce(result.message);
        return;
      }

      setDraft(result.description);

      const text = 'Draft ready for review.';
      setMessage(text);
      announce(text);
    } catch (error) {
      const text = getEditorErrorMessage(
        error,
        'Unable to generate a draft right now. Please try again.',
      );

      setMessage(text);
      announce(text);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedId || !draft) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      await approve({
        locationId: selectedId,
        description: draft,
      });

      setDraft(null);

      const text = 'Description approved and published.';
      setMessage(text);
      announce(text);
    } catch (error) {
      const text = getEditorErrorMessage(
        error,
        'Unable to save the description.',
      );

      setMessage(text);
      announce(text);
    } finally {
      setBusy(false);
    }
  };

  if (isAuthLoading) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ActivityIndicator
          accessibilityLabel="Checking editor access"
          accessibilityRole="progressbar"
          size="large"
        />

        <ThemedText accessibilityLiveRegion="polite">
          Checking editor access...
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
          Sign in before accessing the Editor.
        </ThemedText>
      </ThemedView>
    );
  }

  if (currentUser === undefined) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ActivityIndicator
          accessibilityLabel="Checking editor access"
          accessibilityRole="progressbar"
          size="large"
        />

        <ThemedText accessibilityLiveRegion="polite">
          Checking editor access...
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
          Sign in before accessing the Editor.
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
          This tool is limited to authorized project editors.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      accessibilityLabel="Location editor"
      contentContainerStyle={styles.content}>
      <ThemedView style={styles.container}>
        <ThemedText
          accessibilityRole="header"
          type="title"
          style={styles.title}>
          Location editor
        </ThemedText>

        <ThemedText themeColor="textSecondary">
          Draft consistent descriptions with Gemini, then review
          and approve them before they appear on the map.
        </ThemedText>

        <ThemedText
          accessibilityRole="header"
          type="smallBold">
          Choose a location
        </ThemedText>

        <ThemedView
  accessibilityRole="radiogroup"
  accessibilityLabel="Locations"
  style={styles.locationList}>
          {locations === undefined ? (
            <ActivityIndicator
              accessibilityLabel="Loading locations"
            />
          ) : locations.length === 0 ? (
            <ThemedText themeColor="textSecondary">
              No locations have been added yet.
            </ThemedText>
          ) : (
            locations.map((location) => {
              const isSelected = selectedId === location._id;

              return (
                <Pressable
                  key={location._id}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: isSelected,
                  }}
                  accessibilityLabel={location.name}
                  accessibilityHint={
                    isSelected
                      ? 'This location is selected.'
                      : 'Select this location to draft its description.'
                  }
                  onPress={() =>
                    handleSelectLocation(
                      location._id,
                      location.name,
                    )
                  }
                  style={[
                    styles.locationButton,
                    isSelected &&
                      styles.locationButtonSelected,
                  ]}>
                  <ThemedText type="smallBold">
                    {location.name}
                  </ThemedText>

                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    numberOfLines={2}>
                    {location.description}
                  </ThemedText>
                </Pressable>
              );
            })
          )}
        </ThemedView>

        {selectedLocation && (
          <>
            <ThemedText
              nativeID="editor-notes-label"
              type="smallBold">
              Optional editorial notes
            </ThemedText>

            <TextInput
              accessibilityLabel="Optional editorial notes"
              accessibilityHint="Add guidance for the generated location description."
              accessibilityRole="text"
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="For example: emphasize the location's connection to student life."
              placeholderTextColor="#777777"
              style={styles.notes}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                busy
                  ? 'Generating location description'
                  : 'Draft description with Gemini'
              }
              accessibilityHint="Generates a draft description for the selected location."
              accessibilityState={{
                busy,
                disabled: busy,
              }}
              disabled={busy}
              onPress={handleGenerate}
              style={({ pressed }) => [
                styles.primaryButton,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {busy ? (
                <ActivityIndicator
                  accessibilityLabel="Generating description"
                  color="#ffffff"
                />
              ) : (
                <ThemedText style={styles.buttonText}>
                  Draft with Gemini
                </ThemedText>
              )}
            </Pressable>
          </>
        )}

        {draft && (
          <ThemedView
            accessibilityLabel="Generated description draft"
            accessibilityRole="summary"
            type="backgroundElement"
            style={styles.draftCard}>
            <ThemedText type="smallBold">
              Draft description
            </ThemedText>

            <ThemedText>{draft}</ThemedText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Approve and publish description"
              accessibilityHint="Publishes the reviewed draft for this location."
              accessibilityState={{
                busy,
                disabled: busy,
              }}
              disabled={busy}
              onPress={handleApprove}
              style={({ pressed }) => [
                styles.approveButton,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {busy ? (
                <ActivityIndicator
                  accessibilityLabel="Publishing description"
                  color="#ffffff"
                />
              ) : (
                <ThemedText style={styles.buttonText}>
                  Approve and publish
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>
        )}

        {message && (
          <ThemedText
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            themeColor="textSecondary">
            {message}
          </ThemedText>
        )}
      </ThemedView>
    </ScrollView>
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
  content: {
    flexGrow: 1,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
  },
  locationList: {
    gap: Spacing.two,
  },
  locationButton: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },
  locationButtonSelected: {
    borderColor: '#A51C30',
    borderWidth: 2,
  },
  notes: {
    minHeight: 88,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: Spacing.two,
    color: '#111111',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    backgroundColor: '#A51C30',
  },
  approveButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    backgroundColor: '#18864B',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  draftCard: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.two,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.75,
  },
});
