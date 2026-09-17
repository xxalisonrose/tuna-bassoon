import { useAuth } from '@clerk/expo';
import {
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
} from '@clerk/expo/web';
import { useQuery } from 'convex/react';
import {
  ActivityIndicator,
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

function WebAuthControls() {
  const { isLoaded, isSignedIn } = useAuth();

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isSignedIn ? {} : 'skip',
  );

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
        <>
          <ThemedView
            accessibilityLiveRegion="polite"
            style={styles.backendStatus}>
            <ThemedView
              style={[
                styles.statusDot,
                currentUser === undefined
                  ? styles.statusDotLoading
                  : currentUser === null
                    ? styles.statusDotError
                    : styles.statusDotConnected,
              ]}
            />

            <ThemedText type="small">
              {currentUser === undefined
                ? 'Connecting secure profile...'
                : currentUser === null
                  ? 'Profile connection needs attention'
                  : 'Secure profile connected'}
            </ThemedText>
          </ThemedView>

          <SignOutButton>
  <button style={styles.webButton}>
    Sign out
  </button>
</SignOutButton>
        </>
      ) : (
        <ThemedView style={styles.authActions}>
          <SignInButton mode="modal">
            <button style={styles.webButton}>
              Sign in
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button style={styles.webButton}>
              Create account
            </button>
          </SignUpButton>
        </ThemedView>
      )}
    </ThemedView>
  );
}

export default function HomeScreenWeb() {
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

        <WebAuthControls />
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
  statusDotLoading: {
    backgroundColor: '#208AEF',
  },
  statusDotConnected: {
    backgroundColor: '#18864B',
  },
  statusDotError: {
    backgroundColor: '#B42318',
  },
  webButton: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: '#FFFFFF',
    backgroundColor: '#A51C30',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer',
  } as any,
});