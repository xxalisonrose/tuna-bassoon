import { useMutation } from 'convex/react';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../convex/_generated/api';

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const usernamePattern = /^[A-Za-z0-9][A-Za-z0-9_-]*[A-Za-z0-9]$/;

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'string'
  ) {
    return error.data;
  }

  return error instanceof Error
    ? error.message
    : 'Unable to save that username. Try again.';
}

export function UsernameEditorModal({
  currentUsername,
  onClose,
  onSaved,
  visible,
}: {
  currentUsername?: string | null;
  onClose: () => void;
  onSaved?: (username: string) => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const setMyUsername = useMutation(api.users.setMyUsername);
  const [username, setUsername] = useState(currentUsername ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localError = useMemo(() => {
    const trimmed = username.trim();

    if (!trimmed) {
      return null;
    }
    if (
      trimmed.length < USERNAME_MIN_LENGTH ||
      trimmed.length > USERNAME_MAX_LENGTH
    ) {
      return `Use ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.`;
    }
    if (!usernamePattern.test(trimmed)) {
      return 'Begin and end with a letter or number. Underscores and hyphens are allowed in the middle.';
    }
    return null;
  }, [username]);

  const save = async () => {
    if (saving || localError || username.trim().length === 0) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await setMyUsername({ username: username.trim() });
      onSaved?.(result.username);
      onClose();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setSaving(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView
          accessibilityViewIsModal
          type="backgroundElement"
          style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.heading}>
            <ThemedText accessibilityRole="header" type="title">
              {currentUsername ? 'Change Your Username' : 'Choose a Username'}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              This public name identifies you on community submissions and
              future social features. Your email remains private.
            </ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold">Username</ThemedText>
            <TextInput
              accessibilityLabel="Username"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={USERNAME_MAX_LENGTH}
              onChangeText={(value) => {
                setUsername(value);
                setError(null);
              }}
              onSubmitEditing={() => void save()}
              placeholder="harvard-explorer"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: localError || error
                    ? Palette.danger
                    : theme.borderStrong,
                  color: theme.text,
                },
              ]}
              value={username}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Use 3-20 letters, numbers, underscores, or hyphens. Usernames
              are unique and can normally be changed once every seven days.
            </ThemedText>
            {localError ? (
              <ThemedText style={styles.errorText}>{localError}</ThemedText>
            ) : null}
          </View>

          {error ? (
            <ThemedText
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save Username"
              disabled={
                saving ||
                username.trim().length === 0 ||
                localError !== null
              }
              onPress={() => void save()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                (saving || localError !== null) && styles.disabled,
              ]}>
              {saving ? (
                <ActivityIndicator color={Palette.paper} />
              ) : (
                <ThemedText
                  type="smallBold"
                  style={styles.primaryButtonText}>
                  Save Username
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={currentUsername ? 'Cancel' : 'Choose Later'}
              disabled={saving}
              onPress={onClose}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.borderStrong },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">
                {currentUsername ? 'Cancel' : 'Choose Later'}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 26, 19, 0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  card: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
    maxWidth: 560,
    padding: Spacing.four,
    width: '100%',
  },
  heading: {
    gap: Spacing.one,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 18,
    minHeight: 50,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
  errorText: {
    color: Palette.danger,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
});
