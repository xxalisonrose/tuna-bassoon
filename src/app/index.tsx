import { useAuth } from '@clerk/expo';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import {
  useConvexAuth,
  useQuery,
} from 'convex/react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';
import { api } from '../../convex/_generated/api';

function AuthControls() {
  const { isLoaded, isSignedIn, signOut } = useAuth();

  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexLoading,
  } = useConvexAuth();

  const { startHostedAuth } = useHostedAuth();

  const [error, setError] = useState<string | null>(null);

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isConvexAuthenticated ? {} : 'skip',
  );

  const startAuth = async (
    mode: 'sign-in' | 'sign-up',
  ) => {
    setError(null);

    try {
      if (Platform.OS === 'web') {
        await startHostedAuth({ mode });
      } else {
        await startHostedAuth({
          mode,
          redirectUrl: 'tunabassoonapp://callback',
        });
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Authentication failed.',
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
          : 'Unable to sign out.',
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

  const backendIsConnecting =
    isConvexLoading ||
    (isConvexAuthenticated && currentUser === undefined);

  const backendIsConnected =
    isConvexAuthenticated &&
    currentUser !== undefined &&
    currentUser !== null;

  return (
    <ThemedView
      type="backgroundElement"
      style={styles.authCard}>
      <ThemedText
        accessibilityRole="header"
        type="subtitle">
        {isSignedIn
          ? 'You are signed in'
          : 'Start exploring'}
      </ThemedText>

      <ThemedText themeColor="textSecondary">
        {isSignedIn
          ? 'Visit the map to explore Harvard locations.'
          : 'Sign in to save places, earn badges, and collect stamps.'}
      </ThemedText>

      {isSignedIn && (
        <ThemedView
          accessibilityLiveRegion="polite"
          style={styles.backendStatus}>
          {backendIsConnecting ? (
            <>
              <ActivityIndicator
                accessibilityLabel="Connecting secure profile"
                size="small"
              />

              <ThemedText type="small">
                Connecting secure profile...
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedView
                accessible={false}
                importantForAccessibility="no"
                style={[
                  styles.statusDot,
                  backendIsConnected
                    ? styles.statusDotConnected
                    : styles.statusDotError,
                ]}
              />

              <ThemedText type="small">
                {backendIsConnected
                  ? 'Secure profile connected'
                  : 'Profile connection needs attention'}
              </ThemedText>
            </>
          )}
        </ThemedView>
      )}

      {isSignedIn ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          accessibilityHint="Signs you out of your Tuna Bassoon account"
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.authButton,
            pressed && styles.authButtonPressed,
          ]}>
          <Text style={styles.authButtonText}>
            Sign out
          </Text>
        </Pressable>
      ) : (
        <ThemedView style={styles.authActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityHint="Opens the sign-in screen"
            onPress={() => startAuth('sign-in')}
            style={({ pressed }) => [
              styles.authButton,
              styles.authActionButton,
              pressed && styles.authButtonPressed,
            ]}>
            <Text style={styles.authButtonText}>
              Sign in
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityHint="Opens the account creation screen"
            onPress={() => startAuth('sign-up')}
            style={({ pressed }) => [
              styles.authButton,
              styles.authActionButton,
              pressed && styles.authButtonPressed,
            ]}>
            <Text style={styles.authButtonText}>
              Create account
            </Text>
          </Pressable>
        </ThemedView>
      )}

      {error && (
        <ThemedText
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.authError}>
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
          <ThemedText
            accessibilityRole="header"
            type="title"
            style={styles.title}>
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
  backendStatus: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotConnected: {
    backgroundColor: '#18864B',
  },
  statusDotError: {
    backgroundColor: '#B42318',
  },
  authButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A51C30',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  authActionButton: {
    flex: 1,
  },
  authButtonPressed: {
    opacity: 0.75,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  authError: {
    color: '#B42318',
  },
});