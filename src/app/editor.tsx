import { useAction, useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import {
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

export default function EditorScreen() {
  const locations = useQuery(api.locations.getLocations);
  const generate = useAction(
    api.locationAgent.generateLocationDescription,
  );
  const approve = useMutation(
    api.locationAgent.approveLocationDescription,
  );
  const [selectedId, setSelectedId] = useState<Id<'locations'> | null>(
    null,
  );
  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedLocation = locations?.find(
    (location) => location._id === selectedId,
  );

  const handleGenerate = async () => {
    if (!selectedId) {
      setMessage('Choose a location first.');
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const result = await generate({
        locationId: selectedId,
        editorialNotes: notes.trim() || undefined,
      });
      setDraft(result.description);
      setMessage('Draft ready for review.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to generate a draft.',
      );
    } finally {
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
      setMessage('Description approved and published.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save the description.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Location editor
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Draft consistent descriptions with Gemini, then review
          and approve them before they appear on the map.
        </ThemedText>

        <ThemedText type="smallBold">Choose a location</ThemedText>
        <ThemedView style={styles.locationList}>
          {locations === undefined ? (
            <ActivityIndicator />
          ) : locations.length === 0 ? (
            <ThemedText themeColor="textSecondary">
              No locations have been added yet.
            </ThemedText>
          ) : (
            locations.map((location) => (
              <Pressable
                key={location._id}
                onPress={() => {
                  setSelectedId(location._id);
                  setDraft(null);
                  setMessage(null);
                }}
                style={[
                  styles.locationButton,
                  selectedId === location._id &&
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
            ))
          )}
        </ThemedView>

        {selectedLocation && (
          <>
            <ThemedText type="smallBold">
              Optional editorial notes
            </ThemedText>
            <TextInput
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="For example: emphasize the location's connection to student life."
              placeholderTextColor="#777777"
              style={styles.notes}
            />
            <Pressable
              disabled={busy}
              onPress={handleGenerate}
              style={({ pressed }) => [
                styles.primaryButton,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.buttonText}>
                  Draft with Gemini
                </ThemedText>
              )}
            </Pressable>
          </>
        )}

        {draft && (
          <ThemedView type="backgroundElement" style={styles.draftCard}>
            <ThemedText type="smallBold">
              Draft description
            </ThemedText>
            <ThemedText>{draft}</ThemedText>
            <Pressable
              disabled={busy}
              onPress={handleApprove}
              style={({ pressed }) => [
                styles.approveButton,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.buttonText}>
                Approve and publish
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {message && (
          <ThemedText
            accessibilityLiveRegion="polite"
            themeColor="textSecondary">
            {message}
          </ThemedText>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
