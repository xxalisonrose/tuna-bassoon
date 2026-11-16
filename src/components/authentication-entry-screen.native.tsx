import { useAuth } from '@clerk/expo';
import { useSignInWithGoogle } from '@clerk/expo/google';
import { AuthView, type AuthViewMode } from '@clerk/expo/native';
import { useConvexAuth } from 'convex/react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';

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
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const [authMode, setAuthMode] = useState<AuthViewMode | null>(null);
  const [isGoogleSignInPending, setIsGoogleSignInPending] = useState(false);

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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brandSection}>
            <View
              accessible={false}
              importantForAccessibility="no"
              style={styles.brandMark}>
              <ThemedText style={styles.brandMarkText}>L</ThemedText>
            </View>

            <ThemedText
              accessibilityRole="header"
              type="title"
              style={styles.centeredText}>
              Welcome to Lorcal
            </ThemedText>

            <ThemedText
              themeColor="textSecondary"
              style={[styles.centeredText, styles.introduction]}>
              Explore Harvard stories, check in at real places, and build your
              explorer Passport.
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.authenticationCard}>
            <ThemedText
              accessibilityRole="header"
              type="subtitle"
              style={styles.centeredText}>
              Begin Your Adventure
            </ThemedText>

            <ThemedText
              themeColor="textSecondary"
              style={styles.centeredText}>
              Sign in to save check-ins, earn badges, and use your customized
              explorer on the map.
            </ThemedText>

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
                <ThemedText type="smallBold">Continue with Google</ThemedText>
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText type="small" themeColor="textSecondary">
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
              <ThemedText type="smallBold">Create Account</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.centeredText}>
            Your progress and saved explorer are connected to your secure
            account.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  brandSection: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  brandMark: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Palette.lightBronze,
    borderRadius: 44,
    backgroundColor: Palette.teaGreen,
  },
  brandMarkText: {
    color: Palette.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
  },
  introduction: {
    maxWidth: 480,
    lineHeight: 24,
  },
  authenticationCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
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
  centeredText: {
    textAlign: 'center',
  },
});
