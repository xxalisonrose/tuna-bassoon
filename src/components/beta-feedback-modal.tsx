import { useMutation } from 'convex/react';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { buildProfile } from '@/lib/build-profile';
import { api } from '../../convex/_generated/api';

const MAXIMUM_MESSAGE_LENGTH = 2_000;

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'string'
  ) {
    return error.data;
  }

  return 'Your feedback could not be sent. Check your connection and try again.';
}

export function BetaFeedbackModal({
  onClose,
  visible,
}: {
  onClose: () => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const submitFeedback = useMutation(api.betaFeedback.submit);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmedMessage = message.trim();
  const canSubmit = trimmedMessage.length >= 5 && !submitting;

  const close = () => {
    if (submitting) {
      return;
    }

    setMessage('');
    setSubmitted(false);
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        buildProfile,
        message: trimmedMessage,
        sourcePlatform: Platform.OS,
        sourceRoute: 'map',
      });
      setSubmitted(true);
      setMessage('');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={close}
      transparent
      visible={visible}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ThemedView
              accessibilityViewIsModal
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }]}
            >
              {submitted ? (
                <View style={styles.successContent}>
                  <View accessible={false} style={styles.successIcon}>
                    <ThemedText style={styles.successIconText}>✓</ThemedText>
                  </View>
                  <ThemedText
                    accessibilityLiveRegion="polite"
                    accessibilityRole="header"
                    type="title"
                    style={styles.centeredText}
                  >
                    Feedback Sent
                  </ThemedText>
                  <ThemedText
                    style={styles.centeredText}
                    themeColor="textSecondary"
                  >
                    Thanks for helping improve Lorcal. Dan and Ali can now see
                    your note in the admin panel.
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={close}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={styles.primaryButtonText}
                    >
                      Done
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.headingRow}>
                    <View style={styles.headingCopy}>
                      <ThemedText accessibilityRole="header" type="title">
                        Beta Feedback
                      </ThemedText>
                      <ThemedText themeColor="textSecondary">
                        Tell us what worked, what felt confusing, or what broke.
                        Your note is private and goes directly to the Lorcal
                        admin panel.
                      </ThemedText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Close beta feedback"
                      disabled={submitting}
                      onPress={close}
                      style={({ pressed }) => [
                        styles.closeButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText style={styles.closeButtonText}>×</ThemedText>
                    </Pressable>
                  </View>

                  <ThemedView
                    type="backgroundSelected"
                    style={styles.explanationCard}
                  >
                    <ThemedText type="smallBold">Helpful details</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Mention what you were trying to do, what happened, and
                      what you expected. Your account name and basic app context
                      are included so we can understand the report.
                    </ThemedText>
                  </ThemedView>

                  <View style={styles.field}>
                    <ThemedText type="smallBold">Your feedback</ThemedText>
                    <TextInput
                      accessibilityLabel="Your beta feedback"
                      autoCapitalize="sentences"
                      autoCorrect
                      editable={!submitting}
                      maxLength={MAXIMUM_MESSAGE_LENGTH}
                      multiline
                      onChangeText={(value) => {
                        setMessage(value);
                        setError(null);
                      }}
                      placeholder="Example: I opened a location from the list, but the map did not move to its pin..."
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.background,
                          borderColor: error
                            ? Palette.danger
                            : theme.borderStrong,
                          color: theme.text,
                        },
                      ]}
                      textAlignVertical="top"
                      value={message}
                    />
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.characterCount}
                    >
                      {message.length.toLocaleString()} /{' '}
                      {MAXIMUM_MESSAGE_LENGTH.toLocaleString()}
                    </ThemedText>
                  </View>

                  {error ? (
                    <ThemedText
                      accessibilityLiveRegion="assertive"
                      accessibilityRole="alert"
                      style={styles.errorText}
                    >
                      {error}
                    </ThemedText>
                  ) : null}

                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !canSubmit }}
                      disabled={!canSubmit}
                      onPress={() => void submit()}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        !canSubmit && styles.disabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      {submitting ? (
                        <ActivityIndicator color={Palette.paper} />
                      ) : (
                        <ThemedText
                          type="smallBold"
                          style={styles.primaryButtonText}
                        >
                          Send Feedback
                        </ThemedText>
                      )}
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={submitting}
                      onPress={close}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        submitting && styles.disabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText type="smallBold">Cancel</ThemedText>
                    </Pressable>
                  </View>
                </>
              )}
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'rgba(20, 26, 19, 0.72)',
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  card: {
    alignSelf: 'center',
    borderRadius: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
    maxWidth: 620,
    padding: Spacing.four,
    width: '100%',
  },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  headingCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: Palette.beige,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeButtonText: {
    color: Palette.ink,
    fontSize: 28,
    lineHeight: 30,
  },
  explanationCard: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 23,
    minHeight: 170,
    padding: Spacing.three,
  },
  characterCount: {
    alignSelf: 'flex-end',
  },
  errorText: {
    color: Palette.danger,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.bronzeDeep,
    borderRadius: Spacing.two,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  primaryButtonText: {
    color: Palette.paper,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.beige,
    borderColor: Palette.borderStrong,
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  successContent: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: Palette.teaGreen,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  successIconText: {
    color: Palette.bronzeDeep,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  centeredText: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
