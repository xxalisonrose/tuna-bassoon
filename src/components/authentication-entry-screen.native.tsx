import { useAuth, useSSO } from '@clerk/expo';
import { useSignInWithApple } from '@clerk/expo/apple';
import { useSignInWithGoogle } from '@clerk/expo/google';
import { AuthView, type AuthViewMode } from '@clerk/expo/native';
import { useConvexAuth } from 'convex/react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
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

function AuthenticationLoadingScreen({ message }: { message: string }) {
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
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const { startSSOFlow } = useSSO();
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const [authMode, setAuthMode] = useState<AuthViewMode | null>(null);
  const [passportOpen, setPassportOpen] = useState(false);
  const [isAppleSignInPending, setIsAppleSignInPending] = useState(false);
  const [isGoogleSignInPending, setIsGoogleSignInPending] = useState(false);

  const handleAppleSignIn = async () => {
    if (isAppleSignInPending) {
      return;
    }

    setIsAppleSignInPending(true);

    try {
      const { createdSessionId, setActive } =
        Platform.OS === 'ios'
          ? await startAppleAuthenticationFlow()
          : await startSSOFlow({ strategy: 'oauth_apple' });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (error: unknown) {
      const appleSignInError = error as {
        code?: number | string;
        message?: string;
      };

      if (
        appleSignInError.code !== 'ERR_REQUEST_CANCELED' &&
        appleSignInError.code !== 'ERR_CANCELED' &&
        !appleSignInError.message?.includes('ERR_REQUEST_CANCELED')
      ) {
        Alert.alert(
          'Apple sign-in did not finish',
          appleSignInError.message ??
            'Please try again or sign in with your email address.',
        );
      }
    } finally {
      setIsAppleSignInPending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleSignInPending) {
      return;
    }

    setIsGoogleSignInPending(true);

    try {
      const { createdSessionId, setActive } =
        await startGoogleAuthenticationFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (error: unknown) {
      const googleSignInError = error as {
        code?: number | string;
        message?: string;
      };

      if (
        googleSignInError.code !== 'SIGN_IN_CANCELLED' &&
        googleSignInError.code !== '-5' &&
        googleSignInError.code !== -5
      ) {
        Alert.alert(
          'Google sign-in did not finish',
          googleSignInError.message ??
            'Please try again or sign in with your email address.',
        );
      }
    } finally {
      setIsGoogleSignInPending(false);
    }
  };

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

  if (authMode) {
    return (
      <ThemedView style={styles.container}>
        <AuthView
          isDismissible={false}
          mode={authMode}
          onHostBack={() => setAuthMode(null)}
        />
      </ThemedView>
    );
  }

  if (!passportOpen) {
    return (
      <AuthenticationPassportCover
        onCreateAccount={() => setAuthMode('signUp')}
        onLogIn={() => setPassportOpen(true)}
      />
    );
  }

  return (
    <AuthenticationPassportPage onClose={() => setPassportOpen(false)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityHint="Opens the Google account picker"
        disabled={isGoogleSignInPending}
        onPress={handleGoogleSignIn}
        style={({ pressed }) => [
          styles.googleButton,
          (pressed || isGoogleSignInPending) && styles.pressed,
        ]}>
        {isGoogleSignInPending ? (
          <ActivityIndicator
            accessibilityLabel="Opening Google sign-in"
            size="small"
          />
        ) : (
          <View style={styles.googleButtonContent}>
            <View style={styles.googleMark}>
              <ThemedText style={styles.googleMarkText}>G</ThemedText>
            </View>
            <ThemedText type="smallBold" style={styles.buttonInkText}>
              Continue with Google
            </ThemedText>
          </View>
        )}
      </Pressable>

      {Platform.OS === 'ios' ? (
        isAppleSignInPending ? (
          <View style={styles.appleButtonPending}>
            <ActivityIndicator
              accessibilityLabel="Opening Apple sign-in"
              size="small"
            />
          </View>
        ) : (
          <AppleAuthentication.AppleAuthenticationButton
            accessibilityLabel="Continue with Apple"
            accessibilityHint="Opens Apple sign-in"
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
            }
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
            }
            cornerRadius={Spacing.two}
            onPress={handleAppleSignIn}
            style={styles.appleButton}
          />
        )
      ) : Platform.OS === 'android' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
          accessibilityHint="Opens Apple sign-in in a secure browser"
          disabled={isAppleSignInPending}
          onPress={handleAppleSignIn}
          style={({ pressed }) => [
            styles.appleAndroidButton,
            (pressed || isAppleSignInPending) && styles.pressed,
          ]}>
          {isAppleSignInPending ? (
            <ActivityIndicator
              accessibilityLabel="Opening Apple sign-in"
              color="#ffffff"
              size="small"
            />
          ) : (
            <ThemedText type="smallBold" style={styles.appleButtonText}>
              Continue with Apple
            </ThemedText>
          )}
        </Pressable>
      ) : null}

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <ThemedText type="small" style={styles.dividerText}>
          or
        </ThemedText>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign In with Email"
        accessibilityHint="Opens the secure Lorcal email sign-in screen"
        onPress={() => setAuthMode('signIn')}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" style={styles.primaryButtonText}>
          Sign In with Email
        </ThemedText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create Account"
        accessibilityHint="Opens the secure account creation screen"
        onPress={() => setAuthMode('signUp')}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" style={styles.buttonInkText}>
          Create Your Passport
        </ThemedText>
      </Pressable>
    </AuthenticationPassportPage>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  googleButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.borderStrong,
    borderRadius: Spacing.two,
    backgroundColor: '#ffffff',
  },
  googleButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  googleMark: {
    alignItems: 'center',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  googleMarkText: {
    color: '#4285F4',
    fontSize: 15,
    fontWeight: '800',
  },
  appleButton: {
    height: 52,
    width: '100%',
  },
  appleButtonPending: {
    alignItems: 'center',
    borderColor: Palette.ink,
    borderRadius: Spacing.two,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: '100%',
  },
  appleAndroidButton: {
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: Spacing.two,
    height: 52,
    justifyContent: 'center',
    width: '100%',
  },
  appleButtonText: {
    color: '#ffffff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.borderStrong,
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
  buttonInkText: {
    color: Palette.ink,
  },
  centeredText: {
    textAlign: 'center',
  },
});
