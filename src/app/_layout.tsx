import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';

const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

const convexUrl =
  process.env.EXPO_PUBLIC_CONVEX_URL ?? '';

if (!publishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local.',
  );
}

if (!convexUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_CONVEX_URL in .env.local.',
  );
}

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}>
      <ConvexProviderWithClerk
        client={convex}
        useAuth={useAuth}>
        <ThemeProvider
          value={
            colorScheme === 'dark'
              ? DarkTheme
              : DefaultTheme
          }>
          <AppTabs />
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}