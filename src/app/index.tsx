import { useAuth } from '@clerk/expo';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';

function AuthControls() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { startHostedAuth } = useHostedAuth();
  const [error, setError] = useState<string | null>(null);

  const startAuth = async (
    mode: 'sign-in' | 'sign-up'
  ) => {
    setError(null);

    try {
      await startHostedAuth({ mode });
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Authentication failed.'
      );
    }
  };

  const handleSignOut = async () => {
    setError(null);

    try {
      await signOut();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Unable to sign out.'
      );
    }
  };

  if (!isLoaded) {
    return (
      <ActivityIndicator
        size="large"
        accessibilityLabel="Loading authentication"
      />
    );
  }

  return (
    <ThemedView
      type="backgroundElement"
      style={styles.authCard}>
      <ThemedText type="subtitle">
        {isSignedIn
          ? 'You are signed in'
          : 'Start exploring'}
      </ThemedText>

      <ThemedText themeColor="textSecondary">
        {isSignedIn
          ? 'Visit the map to explore Harvard locations.'
          : 'Sign in to save places, earn badges, and collect stamps.'}
      </ThemedText>

      {isSignedIn ? (
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.authButton,
            pressed && styles.authButtonPressed,
          ]}>
          <ThemedText style={styles.authButtonText}>
            Sign out
          </ThemedText>
        </Pressable>
      ) : (
        <ThemedView style={styles.authActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => startAuth('sign-in')}
            style={({ pressed }) => [
              styles.authButton,
              pressed && styles.authButtonPressed,
            ]}>
            <ThemedText style={styles.authButtonText}>
              Sign in
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => startAuth('sign-up')}
            style={({ pressed }) => [
              styles.authButton,
              pressed && styles.authButtonPressed,
            ]}>
            <ThemedText style={styles.authButtonText}>
              Create account
            </ThemedText>
          </Pressable>
        </ThemedView>
      )}

      {error && (
        <ThemedText style={styles.authError}>
          {error}
        </ThemedText>
      )}
    </ThemedView>
  );
}

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <ThemedText type="title" style={styles.title}>
            Tuna Bassoon
          </ThemedText>

          <ThemedText
            style={styles.subtitle}
            themeColor="textSecondary">
            Explore the history, landmarks, and stories of
            Harvard through an interactive map.
          </ThemedText>
        </ThemedView>

        <AuthControls />
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
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.five,
  },
  heroSection: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 420,
    textAlign: 'center',
    lineHeight: 24,
  },
  authCard: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  authActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  authButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#A51C30',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  authButtonPressed: {
    opacity: 0.75,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  authError: {
    color: '#B42318',
  },
});