import { Link, Slot, type Href } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../convex/_generated/api';

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
          isActive && styles.navLinkActive,
          pressed && styles.navLinkPressed,
          isFocused && styles.navLinkFocused,
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
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );

  const theme = useTheme();

  return (
    <ThemedView style={styles.shell}>
      <ThemedView type="backgroundElement" style={styles.header}>
        <View style={styles.navRow}>
          <ThemedText
            type="smallBold"
            style={[styles.brand, { color: theme.text }]}>
            Tuna Bassoon
          </ThemedText>

          <NavLink href="/" label="Home" />
          <NavLink href="/map" label="Map" />
          <NavLink href="/collection" label="Collection" />

          {currentUser?.isAdmin && (
            <>
              <NavLink href="/admin" label="Content portal" />
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
    backgroundColor: '#000000',
  },
  header: {
    width: '100%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#D0D5DD',
  },
  navRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
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
  navLinkActive: {
    backgroundColor: '#E0E1E6',
  },
  navLinkPressed: {
    opacity: 0.72,
  },
  navLinkFocused: {
    borderColor: '#A51C30',
    shadowColor: '#A51C30',
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
