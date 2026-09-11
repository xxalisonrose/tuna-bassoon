import { useAuth } from '@clerk/expo';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import * as Device from 'expo-device';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

function AuthControls() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { startHostedAuth } = useHostedAuth();
  const [error, setError] = useState<string | null>(null);

  const startAuth = async (mode: 'sign-in' | 'sign-up') => {
    setError(null);
    try {
      await startHostedAuth({ mode });
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.');
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to sign out.');
    }
  };

  if (!isLoaded) {
    return <ActivityIndicator accessibilityLabel="Loading authentication" />;
  }

  return (
    <ThemedView type="backgroundElement" style={styles.authCard}>
      <ThemedText type="subtitle">
        {isSignedIn ? 'You are signed in' : 'Save your favorite places'}
      </ThemedText>
      {isSignedIn ? (
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.authButton, pressed && styles.authButtonPressed]}>
          <ThemedText style={styles.authButtonText}>Sign out</ThemedText>
        </Pressable>
      ) : (
        <ThemedView style={styles.authActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => startAuth('sign-in')}
            style={({ pressed }) => [styles.authButton, pressed && styles.authButtonPressed]}>
            <ThemedText style={styles.authButtonText}>Sign in</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => startAuth('sign-up')}
            style={({ pressed }) => [styles.authButton, pressed && styles.authButtonPressed]}>
            <ThemedText style={styles.authButtonText}>Sign up</ThemedText>
          </Pressable>
        </ThemedView>
      )}
      {error && <ThemedText style={styles.authError}>{error}</ThemedText>}
    </ThemedView>
  );
}

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Welcome to&nbsp;Expo
          </ThemedText>
        </ThemedView>

        <AuthControls />

        <ThemedText type="code" style={styles.code}>
          get started
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.stepContainer}>
          <HintRow
            title="Try editing"
            hint={<ThemedText type="code">src/app/index.tsx</ThemedText>}
          />
          <HintRow title="Dev tools" hint={getDevMenuHint()} />
          <HintRow
            title="Fresh start"
            hint={<ThemedText type="code">npm run reset-project</ThemedText>}
          />
        </ThemedView>

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  code: {
    textTransform: 'uppercase',
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
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
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
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
