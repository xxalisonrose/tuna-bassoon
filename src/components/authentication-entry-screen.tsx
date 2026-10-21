import { useAuth } from '@clerk/expo';
import { useConvexAuth } from 'convex/react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  MaxContentWidth,
  Palette,
  Spacing,
} from '@/constants/theme';
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nativeID={Platform.OS === 'web' ? 'app-page-scroll-view' : undefined}
          showsVerticalScrollIndicator={Platform.OS === 'web'}>
          <View style={styles.brandSection}>
            <View
              accessible={false}
              importantForAccessibility="no"
              style={styles.brandMark}>
              <ThemedText style={styles.brandMarkText}>TB</ThemedText>
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
              Explore Harvard stories, check in at real places, and build
              your explorer Passport.
            </ThemedText>
          </View>

          <ThemedView
            type="backgroundElement"
            style={styles.authenticationCard}>
            <ThemedText
              accessibilityRole="header"
              type="subtitle"
              style={styles.centeredText}>
              Begin Your Adventure
            </ThemedText>

            <ThemedText
              themeColor="textSecondary"
              style={styles.centeredText}>
              Sign in to save check-ins, earn badges, and use your
              customized explorer on the map.
            </ThemedText>

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
                <ThemedText
                  type="smallBold"
                  style={styles.primaryButtonText}>
                  Sign In
                </ThemedText>
              )}
            </Pressable>

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
                <ThemedText type="smallBold">Create Account</ThemedText>
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
  centeredText: {
    textAlign: 'center',
  },
  errorText: {
    color: Palette.danger,
    textAlign: 'center',
  },
});
