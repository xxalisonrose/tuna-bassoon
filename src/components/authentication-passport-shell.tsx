import { Image, type ImageSource } from 'expo-image';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';

const passportLeather = require('../../assets/images/branding/lorcal-passport-leather.jpg');
const cowMark = require('../../assets/images/branding/lorcal-cow-mark.png');

const passportDiscoveries: readonly {
  image: ImageSource;
  label: string;
}[] = [
  {
    image: require('../../assets/images/map-pins/historic-sites-unvisited.png'),
    label: 'Historic places',
  },
  {
    image: require('../../assets/images/map-pins/mystery-lore-unvisited.png'),
    label: 'Hidden lore',
  },
  {
    image: require('../../assets/images/map-pins/noteworthy-people-unvisited.png'),
    label: 'Local legends',
  },
];

type CoverAction = 'log-in' | 'create-account';

export function AuthenticationPassportCover({
  activeAction = null,
  disabled = false,
  onCreateAccount,
  onLogIn,
}: {
  activeAction?: CoverAction | null;
  disabled?: boolean;
  onCreateAccount: () => void;
  onLogIn: () => void;
}) {
  const { width } = useWindowDimensions();
  const stackActions = width < 360;

  return (
    <View style={styles.coverScreen}>
      <Image
        accessible={false}
        contentFit="cover"
        importantForAccessibility="no"
        source={passportLeather}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.coverShade} />

      <SafeAreaView style={styles.coverSafeArea}>
        <View style={styles.coverInset}>
          <View style={styles.coverHeading}>
            <ThemedText accessibilityRole="header" style={styles.coverTitle}>
              Lorcal
            </ThemedText>
            <ThemedText style={styles.coverSubtitle}>Explore Local</ThemedText>
          </View>

          <Image
            accessible={false}
            contentFit="contain"
            importantForAccessibility="no"
            source={cowMark}
            style={styles.cowMark}
          />

          <View
            style={[
              styles.coverActions,
              stackActions && styles.coverActionsStacked,
            ]}>
            <Pressable
              accessibilityHint="Shows the available sign-in methods"
              accessibilityLabel="Log In"
              accessibilityRole="button"
              disabled={disabled}
              onPress={onLogIn}
              style={({ pressed }) => [
                styles.coverButton,
                pressed && styles.coverButtonPressed,
                disabled && styles.coverButtonDisabled,
              ]}>
              {activeAction === 'log-in' ? (
                <ActivityIndicator
                  accessibilityLabel="Opening log in"
                  color={Palette.papayaWhip}
                  size="small"
                />
              ) : (
                <ThemedText style={styles.coverButtonText}>Log In</ThemedText>
              )}
            </Pressable>

            <Pressable
              accessibilityHint="Opens the account creation screen"
              accessibilityLabel="Create an Account"
              accessibilityRole="button"
              disabled={disabled}
              onPress={onCreateAccount}
              style={({ pressed }) => [
                styles.coverButton,
                pressed && styles.coverButtonPressed,
                disabled && styles.coverButtonDisabled,
              ]}>
              {activeAction === 'create-account' ? (
                <ActivityIndicator
                  accessibilityLabel="Opening account creation"
                  color={Palette.papayaWhip}
                  size="small"
                />
              ) : (
                <ThemedText style={styles.coverButtonText}>
                  Create Account
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

export function AuthenticationPassportPage({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <ThemedView style={styles.pageScreen}>
      <SafeAreaView style={styles.pageSafeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nativeID={Platform.OS === 'web' ? 'app-page-scroll-view' : undefined}
          showsVerticalScrollIndicator={Platform.OS === 'web'}>
          <View style={styles.page}>
            <Pressable
              accessibilityHint="Returns to the Lorcal passport cover"
              accessibilityLabel="Close Passport"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}>
              <ThemedText style={styles.closeButtonText}>
                ‹ Close Passport
              </ThemedText>
            </Pressable>

            <View style={styles.pageHeader}>
              <ThemedText style={styles.pageKicker}>EXPLORER ENTRY</ThemedText>
              <ThemedText style={styles.pageNumber}>№ 0001</ThemedText>
            </View>

            <ThemedText accessibilityRole="header" style={styles.pageTitle}>
              Your next discovery starts here.
            </ThemedText>
            <ThemedText style={styles.pageIntroduction}>
              Sign in to uncover local stories, check in where they happened,
              and fill your Passport as you explore.
            </ThemedText>

            <View style={styles.discoveryRow}>
              {passportDiscoveries.map((discovery) => (
                <View key={discovery.label} style={styles.discovery}>
                  <View style={styles.discoveryStamp}>
                    <Image
                      accessible={false}
                      contentFit="contain"
                      importantForAccessibility="no"
                      source={discovery.image}
                      style={styles.discoveryImage}
                    />
                  </View>
                  <ThemedText style={styles.discoveryLabel}>
                    {discovery.label}
                  </ThemedText>
                </View>
              ))}
            </View>

            <View style={styles.perforation} />

            <View style={styles.authenticationSection}>
              <ThemedText style={styles.authenticationTitle}>
                Open your Passport
              </ThemedText>
              <ThemedText style={styles.authenticationCopy}>
                Your check-ins, badges, and Scout stay with your secure account.
              </ThemedText>
              {children}
            </View>

            <View style={styles.pageFooter}>
              <View style={styles.footerLine} />
              <ThemedText style={styles.footerText}>
                Made for curious people and overlooked places.
              </ThemedText>
              <View style={styles.footerLine} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  coverScreen: {
    backgroundColor: '#07162F',
    flex: 1,
  },
  coverShade: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'rgba(2, 10, 28, 0.1)',
  },
  coverSafeArea: {
    flex: 1,
    padding: 12,
  },
  coverInset: {
    alignItems: 'center',
    borderColor: 'rgba(207, 210, 210, 0.72)',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingTop: 38,
  },
  coverHeading: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  coverTitle: {
    color: '#D3D5D5',
    fontFamily: 'serif',
    fontSize: 56,
    fontWeight: '400',
    letterSpacing: 1,
    lineHeight: 66,
    textAlign: 'center',
  },
  coverSubtitle: {
    color: '#C7CACA',
    fontFamily: 'serif',
    fontSize: 22,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  cowMark: {
    height: 205,
    maxHeight: '30%',
    width: 250,
  },
  coverActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    maxWidth: 560,
    width: '100%',
  },
  coverActionsStacked: {
    flexDirection: 'column',
    gap: Spacing.two,
  },
  coverButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(4, 15, 39, 0.46)',
    borderColor: 'rgba(207, 210, 210, 0.8)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  coverButtonPressed: {
    backgroundColor: 'rgba(215, 217, 216, 0.16)',
    transform: [{ scale: 0.985 }],
  },
  coverButtonDisabled: {
    opacity: 0.55,
  },
  coverButtonText: {
    color: '#D3D5D5',
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  pageScreen: {
    flex: 1,
  },
  pageSafeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  page: {
    backgroundColor: Palette.paper,
    borderRadius: Spacing.four,
    elevation: 10,
    gap: Spacing.three,
    maxWidth: 560,
    minHeight: 580,
    padding: Spacing.four,
    shadowColor: '#171A12',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    width: '100%',
  },
  closeButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  closeButtonPressed: {
    opacity: 0.62,
  },
  closeButtonText: {
    color: Palette.bronzeDeep,
    fontSize: 14,
    fontWeight: '800',
  },
  pageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageKicker: {
    color: Palette.bronzeDeep,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  pageNumber: {
    color: Palette.mutedInk,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  pageTitle: {
    color: Palette.ink,
    fontFamily: 'serif',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
  },
  pageIntroduction: {
    color: Palette.mutedInk,
    fontSize: 16,
    lineHeight: 24,
  },
  discoveryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  discovery: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.one,
  },
  discoveryStamp: {
    alignItems: 'center',
    backgroundColor: Palette.cornsilk,
    borderColor: Palette.border,
    borderRadius: 999,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 70,
    justifyContent: 'center',
    width: 70,
  },
  discoveryImage: {
    height: 52,
    width: 52,
  },
  discoveryLabel: {
    color: Palette.mutedInk,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  perforation: {
    borderColor: Palette.border,
    borderStyle: 'dashed',
    borderTopWidth: 1,
    height: 1,
    marginVertical: Spacing.one,
  },
  authenticationSection: {
    gap: Spacing.two,
  },
  authenticationTitle: {
    color: Palette.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  authenticationCopy: {
    color: Palette.mutedInk,
    lineHeight: 21,
    marginBottom: Spacing.one,
  },
  pageFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 'auto',
  },
  footerLine: {
    backgroundColor: Palette.border,
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  footerText: {
    color: Palette.mutedInk,
    fontSize: 10,
    textAlign: 'center',
  },
});
