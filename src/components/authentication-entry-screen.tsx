import { useAuth } from '@clerk/expo';
import { useConvexAuth } from 'convex/react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  AuthenticationPassportCover,
  AuthenticationPassportPage,
} from '@/components/authentication-passport-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';
import { useStartAuth } from '@/hooks/use-start-auth';

function AuthenticationLoadingScreen({
  message,
}: {
  message: string;
}) {
  return (
    <ThemedView style={styles.loadingContainer}>
      <ActivityIndicator
        accessibilityLabel={message}
        accessibilityRole="progressbar"
        size="large"
      />
      <ThemedText
        accessibilityLiveRegion="polite"
        themeColor="textSecondary"
        style={styles.centeredText}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

export default function AuthenticationEntryScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const {
    isAuthenticated,
    isLoading: isConvexLoading,
  } = useConvexAuth();
  const startAuth = useStartAuth();
  const [passportOpen, setPassportOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<
    'sign-in' | 'sign-up' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLoaded) {
    return <AuthenticationLoadingScreen message="Opening Lorcal..." />;
  }

  if (isSignedIn) {
    return (
      <AuthenticationLoadingScreen
        message={
          isConvexLoading || !isAuthenticated
            ? 'Connecting your explorer profile...'
            : 'Opening the map...'
        }
      />
    );
  }

  const beginAuthentication = async (
    mode: 'sign-in' | 'sign-up',
  ) => {
    setActiveAction(mode);
    setErrorMessage(null);

    try {
      await startAuth(mode);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to open authentication. Please try again.',
      );
    } finally {
      setActiveAction(null);
    }
  };

  const authenticationBusy = activeAction !== null;

  if (!passportOpen) {
    return (
      <AuthenticationPassportCover
        activeAction={
          activeAction === 'sign-up' ? 'create-account' : null
        }
        disabled={authenticationBusy}
        onCreateAccount={() => beginAuthentication('sign-up')}
        onLogIn={() => setPassportOpen(true)}
      />
    );
  }

  return (
    <AuthenticationPassportPage onClose={() => setPassportOpen(false)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign In"
        accessibilityHint="Opens the secure Lorcal sign-in screen"
        disabled={authenticationBusy}
        onPress={() => beginAuthentication('sign-in')}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
          authenticationBusy && styles.disabled,
        ]}>
        {activeAction === 'sign-in' ? (
          <ActivityIndicator
            color={Palette.ink}
            accessibilityLabel="Opening sign in"
            size="small"
          />
        ) : (
          <ThemedText type="smallBold" style={styles.primaryButtonText}>
            Sign In
          </ThemedText>
        )}
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <ThemedText type="small" style={styles.dividerText}>
          new explorer?
        </ThemedText>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create Account"
        accessibilityHint="Opens the secure account creation screen"
        disabled={authenticationBusy}
        onPress={() => beginAuthentication('sign-up')}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
          authenticationBusy && styles.disabled,
        ]}>
        {activeAction === 'sign-up' ? (
          <ActivityIndicator
            accessibilityLabel="Opening account creation"
            size="small"
          />
        ) : (
          <ThemedText type="smallBold" style={styles.buttonInkText}>
            Create Your Passport
          </ThemedText>
        )}
      </Pressable>

      {errorMessage && (
        <ThemedText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.errorText}>
          {errorMessage}
        </ThemedText>
      )}
    </AuthenticationPassportPage>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: Palette.lightBronze,
  },
  primaryButtonText: {
    color: Palette.ink,
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dividerLine: {
    backgroundColor: Palette.borderStrong,
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    color: Palette.mutedInk,
  },
  secondaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.borderStrong,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
  buttonInkText: {
    color: Palette.ink,
  },
  centeredText: {
    textAlign: 'center',
  },
  errorText: {
    color: Palette.danger,
    textAlign: 'center',
  },
});
