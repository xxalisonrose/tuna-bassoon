import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const defaultBadgeCongratulations = [
  'Great job!',
  'Super sleuth!',
  'Awesome job!',
  'Fantastic find!',
  'Way to explore!',
  'You did it!',
  'Another achievement unlocked!',
  'Keep up the great work!',
  'Curiosity pays off!',
  'What a discovery!',
] as const;

type BadgeCongratulationsManagerProps = {
  badgeName: string;
  disabled: boolean;
  messages: string[];
  onChange: (messages: string[]) => void;
};

function validateMessages(messages: string[]) {
  if (messages.length === 0) {
    return 'Add at least one congratulations message.';
  }

  const seenMessages = new Set<string>();

  for (const value of messages) {
    const message = value.trim();

    if (!message) {
      return 'Congratulations messages cannot be blank.';
    }

    const duplicateKey = message.toLowerCase();

    if (seenMessages.has(duplicateKey)) {
      return `The message “${message}” appears more than once.`;
    }

    seenMessages.add(duplicateKey);
  }

  return null;
}

export function BadgeCongratulationsManager({
  badgeName,
  disabled,
  messages,
  onChange,
}: BadgeCongratulationsManagerProps) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [confirmingDeleteIndex, setConfirmingDeleteIndex] =
    useState<number | null>(null);
  const [statusMessage, setStatusMessage] =
    useState<string | null>(null);

  const beginEditing = () => {
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

  const applyChanges = () => {
    const validation = validateMessages(draft);

    if (validation !== null) {
      setStatusMessage(validation);
      return;
    }

    onChange(draft.map((message) => message.trim()));
    setEditing(false);
    setDraft([]);
    setConfirmingDeleteIndex(null);
    setStatusMessage(
      'Message pool updated. Save the badge to apply these changes.',
    );
  };

  const messageCount = editing ? draft.length : messages.length;
  const displayName = badgeName.trim() || 'this badge';
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
      accessibilityLabel={`Congratulations message pool for ${displayName}`}
      type="backgroundElement"
      style={[styles.container, { borderColor: theme.border }]}>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headingCopy}>
          <ThemedText type="smallBold">
            Badge-specific congratulations
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            When {displayName} is earned or levels up, its popup
            randomly chooses one message from this pool. The choice is
            not stored after the popup is dismissed.
          </ThemedText>
          <ThemedText type="small">
            {messageCount} available {messageCount === 1 ? 'message' : 'messages'}
          </ThemedText>
        </ThemedView>

        {!editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={beginEditing}
            style={[
              styles.secondaryButton,
              disabled && styles.disabled,
            ]}>
            <ThemedText style={styles.secondaryButtonText}>
              Manage congratulations
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

      {editing ? (
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
                editable={!disabled}
                maxLength={160}
                onChangeText={(value) => updateMessage(index, value)}
                placeholder="Example: You found another layer!"
                placeholderTextColor={theme.textSecondary}
                style={inputStyle}
                value={message}
              />

              {confirmingDeleteIndex === index ? (
                <ThemedView style={styles.confirmation}>
                  <ThemedText accessibilityLiveRegion="polite">
                    Delete this message from {displayName}&apos;s pool?
                    It will stop appearing after you save the badge.
                  </ThemedText>
                  <ThemedView style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={disabled}
                      onPress={() => deleteMessage(index)}
                      style={styles.dangerButton}>
                      <ThemedText style={styles.dangerButtonText}>
                        Confirm deletion
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={disabled}
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
                      : 'Removes this message after confirmation.'
                  }
                  accessibilityState={{
                    disabled: disabled || draft.length === 1,
                  }}
                  disabled={disabled || draft.length === 1}
                  onPress={() => setConfirmingDeleteIndex(index)}
                  style={[
                    styles.secondaryButton,
                    (disabled || draft.length === 1) && styles.disabled,
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
            accessibilityState={{
              disabled: disabled || draft.length >= 100,
            }}
            disabled={disabled || draft.length >= 100}
            onPress={() => {
              setDraft((current) => [...current, '']);
              setConfirmingDeleteIndex(null);
              setStatusMessage(null);
            }}
            style={[
              styles.secondaryButton,
              (disabled || draft.length >= 100) && styles.disabled,
            ]}>
            <ThemedText style={styles.secondaryButtonText}>
              Add message
            </ThemedText>
          </Pressable>

          <ThemedView style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={applyChanges}
              style={[
                styles.primaryButton,
                disabled && styles.disabled,
              ]}>
              <ThemedText style={styles.primaryButtonText}>
                Use this message pool
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={disabled}
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
    padding: Spacing.three,
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
