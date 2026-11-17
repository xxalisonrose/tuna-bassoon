import { Image, type ImageSource } from 'expo-image';
import type { ReactNode } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing } from '@/constants/theme';

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

export function AuthenticationPassportShell({
  children,
}: {
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const wideLayout = width >= 900;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nativeID={Platform.OS === 'web' ? 'app-page-scroll-view' : undefined}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
          <View
            style={[
              styles.passport,
              wideLayout && styles.passportWide,
            ]}
          >
            <View
              style={[
                styles.cover,
                wideLayout && styles.coverWide,
              ]}
            >
              <View style={styles.coverInset}>
                <ThemedText style={styles.coverKicker}>
                  THE LORCAL
                </ThemedText>
                <ThemedText
                  accessibilityRole="header"
                  style={styles.coverTitle}
                >
                  EXPLORER{`\n`}PASSPORT
                </ThemedText>

                <View
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  style={styles.coverSeal}
                >
                  <View style={styles.coverSealInner}>
                    <ThemedText style={styles.coverSealStar}>✦</ThemedText>
                    <ThemedText style={styles.coverSealLetter}>L</ThemedText>
                    <ThemedText style={styles.coverSealCaption}>
                      EXPLORE LOCAL
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.coverRule} />
                <ThemedText style={styles.coverMotto}>
                  STORIES LIVE HERE
                </ThemedText>
              </View>
            </View>

            <View style={styles.page}>
              <View style={styles.pageHeader}>
                <ThemedText style={styles.pageKicker}>
                  EXPLORER ENTRY
                </ThemedText>
                <ThemedText style={styles.pageNumber}>№ 0001</ThemedText>
              </View>

              <ThemedText
                accessibilityRole="header"
                style={styles.pageTitle}
              >
                Your next discovery starts here.
              </ThemedText>
              <ThemedText style={styles.pageIntroduction}>
                Sign in to uncover local stories, check in where they
                happened, and fill your Passport as you explore.
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
                  Your check-ins, badges, and Scout stay with your secure
                  account.
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
          </View>
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
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  passport: {
    borderRadius: Spacing.four,
    elevation: 10,
    maxWidth: 560,
    overflow: 'hidden',
    shadowColor: '#171A12',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    width: '100%',
  },
  passportWide: {
    flexDirection: 'row',
    maxWidth: 1040,
  },
  cover: {
    backgroundColor: '#334633',
    minHeight: 310,
    padding: Spacing.three,
  },
  coverWide: {
    flex: 1,
    minHeight: 620,
  },
  coverInset: {
    alignItems: 'center',
    borderColor: Palette.lightBronze,
    borderRadius: Spacing.three,
    borderWidth: 2,
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  coverKicker: {
    color: Palette.papayaWhip,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 4,
  },
  coverTitle: {
    color: Palette.papayaWhip,
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
    lineHeight: 38,
    textAlign: 'center',
  },
  coverSeal: {
    alignItems: 'center',
    borderColor: Palette.lightBronze,
    borderRadius: 62,
    borderWidth: 3,
    height: 124,
    justifyContent: 'center',
    width: 124,
  },
  coverSealInner: {
    alignItems: 'center',
    borderColor: Palette.lightBronze,
    borderRadius: 52,
    borderWidth: 1,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  coverSealStar: {
    color: Palette.lightBronze,
    fontSize: 22,
    lineHeight: 24,
  },
  coverSealLetter: {
    color: Palette.papayaWhip,
    fontFamily: 'serif',
    fontSize: 44,
    fontWeight: '700',
    lineHeight: 47,
  },
  coverSealCaption: {
    color: Palette.lightBronze,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  coverRule: {
    backgroundColor: Palette.lightBronze,
    height: 1,
    width: 96,
  },
  coverMotto: {
    color: Palette.lightBronze,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
  },
  page: {
    backgroundColor: Palette.paper,
    flex: 1,
    gap: Spacing.three,
    minHeight: 580,
    padding: Spacing.four,
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
