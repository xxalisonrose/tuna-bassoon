import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { useMutation, useQuery } from 'convex/react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../../convex/_generated/api';

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'string'
  ) {
    return error.data;
  }

  return 'Unable to save the congratulations messages.';
}

export function BadgeCongratulationsManager() {
  const theme = useTheme();
  const messages = useQuery(
    api.adminBadgeCongratulations.getMessagesForAdmin,
  );
  const saveMessages = useMutation(
    api.adminBadgeCongratulations.saveMessages,
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmingDeleteIndex, setConfirmingDeleteIndex] =
    useState<number | null>(null);
  const [statusMessage, setStatusMessage] =
    useState<string | null>(null);

  const beginEditing = () => {
    if (messages === undefined) {
      return;
    }

    setDraft([...messages]);
    setConfirmingDeleteIndex(null);
    setStatusMessage(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraft([]);
    setConfirmingDeleteIndex(null);
    setStatusMessage(null);
  };

  const updateMessage = (index: number, message: string) => {
    setDraft((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? message : entry,
      ),
    );
    setStatusMessage(null);
  };

  const deleteMessage = (index: number) => {
    setDraft((current) =>
      current.filter((_, entryIndex) => entryIndex !== index),
    );
    setConfirmingDeleteIndex(null);
    setStatusMessage(null);
  };

  const save = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      await saveMessages({ messages: draft });
      setEditing(false);
      setDraft([]);
      setConfirmingDeleteIndex(null);
      setStatusMessage('Congratulations message bank saved.');
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const messageCount = editing ? draft.length : messages?.length ?? 0;
  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.background,
      borderColor: theme.borderStrong,
      color: theme.text,
    },
  ];

  return (
    <ThemedView
      accessibilityLabel="Badge congratulations message bank"
      type="backgroundElement"
      style={[styles.container, { borderColor: theme.border }]}>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headingCopy}>
          <ThemedText type="smallBold">
            Badge congratulations
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            The app chooses one message for the in-app popup
            whenever a badge is earned or a repeatable badge levels up.
            The choice is not stored after the popup is dismissed.
          </ThemedText>
          {messages !== undefined ? (
            <ThemedText type="small">
              {messageCount} available messages
            </ThemedText>
          ) : null}
        </ThemedView>

        {!editing && messages !== undefined ? (
          <Pressable
            accessibilityRole="button"
            onPress={beginEditing}
            style={styles.secondaryButton}>
            <ThemedText style={styles.secondaryButtonText}>
              Manage Badge Congratulations
            </ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>

      {statusMessage ? (
        <ThemedText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.status}>
          {statusMessage}
        </ThemedText>
      ) : null}

      {messages === undefined ? (
        <ActivityIndicator
          accessibilityLabel="Loading congratulations messages"
          accessibilityRole="progressbar"
        />
      ) : editing ? (
        <ThemedView style={styles.editor}>
          {draft.map((message, index) => (
            <ThemedView
              key={index}
              type="backgroundSelected"
              style={[styles.messageCard, { borderColor: theme.border }]}>
              <ThemedText type="smallBold">
                Message {index + 1}
              </ThemedText>
              <TextInput
                accessibilityLabel={`Congratulations message ${index + 1}`}
                editable={!saving}
                maxLength={160}
                onChangeText={(value) => updateMessage(index, value)}
                placeholder="Example: Awesome job!"
                placeholderTextColor={theme.textSecondary}
                style={inputStyle}
                value={message}
              />

              {confirmingDeleteIndex === index ? (
                <ThemedView style={styles.confirmation}>
                  <ThemedText accessibilityLiveRegion="polite">
                    Delete this message from the bank? It will stop
                    appearing in future popups after you save.
                  </ThemedText>
                  <ThemedView style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={() => deleteMessage(index)}
                      style={styles.dangerButton}>
                      <ThemedText style={styles.dangerButtonText}>
                        Confirm deletion
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={() => setConfirmingDeleteIndex(null)}
                      style={styles.secondaryButton}>
                      <ThemedText style={styles.secondaryButtonText}>
                        Cancel
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                </ThemedView>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint={
                    draft.length === 1
                      ? 'At least one congratulations message is required.'
                      : 'Removes this message after confirmation and saving.'
                  }
                  accessibilityState={{
                    disabled: saving || draft.length === 1,
                  }}
                  disabled={saving || draft.length === 1}
                  onPress={() => setConfirmingDeleteIndex(index)}
                  style={[
                    styles.secondaryButton,
                    (saving || draft.length === 1) && styles.disabled,
                  ]}>
                  <ThemedText style={styles.secondaryButtonText}>
                    Delete message
                  </ThemedText>
                </Pressable>
              )}
            </ThemedView>
          ))}

          <Pressable
            accessibilityRole="button"
            disabled={saving || draft.length >= 100}
            onPress={() => {
              setDraft((current) => [
                ...current,
                '',
              ]);
              setStatusMessage(null);
            }}
            style={[
              styles.secondaryButton,
              (saving || draft.length >= 100) && styles.disabled,
            ]}>
            <ThemedText style={styles.secondaryButtonText}>
              Add message
            </ThemedText>
          </Pressable>

          <ThemedView style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: saving, disabled: saving }}
              disabled={saving}
              onPress={save}
              style={[styles.primaryButton, saving && styles.disabled]}>
              <ThemedText style={styles.primaryButtonText}>
                {saving ? 'Saving...' : 'Save message bank'}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={cancelEditing}
              style={styles.secondaryButton}>
              <ThemedText style={styles.secondaryButtonText}>
                Cancel
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headingCopy: { flex: 1, minWidth: 240, gap: Spacing.one },
  editor: { gap: Spacing.two },
  messageCard: {
    gap: Spacing.one,
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
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
  primaryButtonText: { color: Palette.ink, textAlign: 'center' },
  dangerButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.danger,
  },
  dangerButtonText: { color: Palette.onDanger, textAlign: 'center' },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Palette.teaGreen,
  },
  secondaryButtonText: { color: Palette.ink, textAlign: 'center' },
  confirmation: {
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  status: { lineHeight: 22 },
  disabled: { opacity: 0.6 },
});
