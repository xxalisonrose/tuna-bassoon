import { useAuth } from '@clerk/expo';
import {
  Link,
  Slot,
  type Href,
  usePathname,
  useRouter,
} from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AuthenticationEntryScreen from './authentication-entry-screen';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { PortalContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../convex/_generated/api';

const settingsRoute = '/settings' as Href;

function NavLink({
  href,
  label,
  isActive = false,
}: {
  href: Href;
  label: string;
  isActive?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const theme = useTheme();

  return (
    <Link
      href={href}
      accessibilityRole="link"
      accessibilityLabel={label}
      asChild>
      <Pressable
        accessibilityRole="button"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={({ pressed }) => [
          styles.navLink,
          isActive && { backgroundColor: theme.accentSoft },
          pressed && styles.navLinkPressed,
          isFocused && [
            styles.navLinkFocused,
            {
              borderColor: theme.accent,
              shadowColor: theme.accent,
            },
          ],
        ]}>
        <ThemedText
          type="smallBold"
          themeColor={isActive ? 'text' : 'textSecondary'}
          style={styles.navLinkText}>
          {label}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

export default function AppTabsWeb() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const {
    isAuthenticated,
    isLoading: isConvexLoading,
  } = useConvexAuth();
  const signedOutDuringSessionRef = useRef(false);
  const authenticationReady =
    isLoaded &&
    isSignedIn === true &&
    !isConvexLoading &&
    isAuthenticated;
  const currentUser = useQuery(
    api.users.getCurrentUser,
    authenticationReady ? {} : 'skip',
  );

  const theme = useTheme();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      signedOutDuringSessionRef.current = true;
      return;
    }

    if (!authenticationReady) {
      return;
    }

    if (
      pathname === '/' ||
      signedOutDuringSessionRef.current
    ) {
      signedOutDuringSessionRef.current = false;
      router.replace('/map');
    }
  }, [
    authenticationReady,
    isLoaded,
    isSignedIn,
    pathname,
    router,
  ]);

  if (!authenticationReady) {
    return <AuthenticationEntryScreen />;
  }

  return (
    <ThemedView style={[styles.shell, { backgroundColor: theme.background }]}>
      <ThemedView
        type="backgroundElement"
        style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.navRow}>
          <ThemedText
            type="smallBold"
            style={[styles.brand, { color: theme.text }]}>
            Lorcal
          </ThemedText>

          <NavLink href="/map" label="Map" />
          <NavLink href="/collection" label="Passport" />
          <NavLink href={settingsRoute} label="Settings" />

          {currentUser?.isAdmin && (
            <>
              <NavLink href="/admin" label="Content Portal" />
            </>
          )}
        </View>
      </ThemedView>

      <View style={styles.slotContainer}>
        <Slot />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  header: {
    width: '100%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
  },
  navRow: {
    width: '100%',
    maxWidth: PortalContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brand: {
    marginRight: 'auto',
    paddingVertical: Spacing.one,
  },
  navLink: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  navLinkPressed: {
    opacity: 0.72,
  },
  navLinkFocused: {
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  navLinkText: {
    textAlign: 'center',
  },
  slotContainer: {
    flex: 1,
    minHeight: 0,
  },
});
