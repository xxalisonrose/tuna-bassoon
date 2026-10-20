import { useAuth } from '@clerk/expo';
import { useConvexAuth, useQuery } from 'convex/react';
import * as Location from 'expo-location';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
  useScrollToTop,
} from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuildInfoPanel } from '@/components/admin/build-info-panel';
import { CommunitySubmissionInfoModal } from '@/components/community-submission-info-modal';
import { DraggableScrollView } from '@/components/draggable-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  Palette,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../convex/_generated/api';
import SubmitLocationScreen from './submit-location';

type PermissionState =
  | 'checking'
  | Location.PermissionStatus;

const permissionLabels: Record<PermissionState, string> = {
  checking: 'Checking',
  [Location.PermissionStatus.UNDETERMINED]: 'Not Requested',
  [Location.PermissionStatus.DENIED]: 'Denied',
  [Location.PermissionStatus.GRANTED]: 'Allowed',
};

const appearanceSettingsPath = Platform.select({
  ios: 'On iPhone or iPad: Settings → Display & Brightness.',
  android: 'On Android: Settings → Display → Dark theme.',
  default:
    'Change Light or Dark Mode in your operating system or browser settings.',
});

const textSizeSettingsPath = Platform.select({
  ios:
    'On iPhone or iPad: Settings → Display & Brightness → Text Size. For larger accessibility sizes, use Settings → Accessibility → Display & Text Size → Larger Text.',
  android: 'On Android: Settings → Display → Display size and text.',
  default:
    'Change text size in your operating system or browser settings.',
});

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);
  const { signOut } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );

  const [permissionState, setPermissionState] =
    useState<PermissionState>('checking');
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [locationMessage, setLocationMessage] =
    useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] =
    useState<string | null>(null);
  const [communityInfoVisible, setCommunityInfoVisible] =
    useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void Location.getForegroundPermissionsAsync()
        .then((permission) => {
          if (active) {
            setPermissionState(permission.status);
          }
        })
        .catch(() => {
          if (active) {
            setLocationMessage(
              'Location permission status is unavailable right now.',
            );
          }
        });

      return () => {
        active = false;
      };
    }, []),
  );

  const requestLocationAccess = async () => {
    setPermissionBusy(true);
    setLocationMessage(null);

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();
      setPermissionState(permission.status);
      setLocationMessage(
        permission.status === Location.PermissionStatus.GRANTED
          ? 'Location access is ready for map positioning and nearby check-ins.'
          : 'Location access was not granted. You can still browse the map, and administrators can use Test GPS.',
      );
    } catch (error) {
      setLocationMessage(
        error instanceof Error
          ? error.message
          : 'Unable to request location access.',
      );
    } finally {
      setPermissionBusy(false);
    }
  };

  const openDeviceSettings = async () => {
    setLocationMessage(null);

    if (Platform.OS === 'web') {
      setLocationMessage(
        'Use the site controls beside the browser address to review location access for this website.',
      );
      return;
    }

    try {
      await Linking.openSettings();
    } catch (error) {
      setLocationMessage(
        error instanceof Error
          ? error.message
          : 'Unable to open device settings.',
      );
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setAccountError(null);

    try {
      await signOut();
    } catch (error) {
      setAccountError(
        error instanceof Error
          ? error.message
          : 'Unable to sign out right now.',
      );
      setSigningOut(false);
    }
  };

  const permissionGranted =
    permissionState === Location.PermissionStatus.GRANTED;
  const accountName =
    currentUser?.name ?? 'Harvard Explorer';
  const accountEmail = currentUser?.email;
  const communityContributor =
    currentUser?.communityContributor;
  const communityRequirements =
    communityContributor?.requirements;
  const communityRoleLabel = currentUser?.isAdmin
    ? 'ADMIN'
    : currentUser?.isRegionalModerator
      ? 'REGIONAL MODERATOR'
      : currentUser?.canSubmitContent
        ? 'COMMUNITY CONTRIBUTOR'
        : 'EXPLORER';

  if (view === 'submit-location') {
    return <SubmitLocationScreen />;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <DraggableScrollView
          scrollViewRef={scrollViewRef}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.heading}>
            <ThemedText
              accessibilityRole="header"
              type="title">
              Settings
            </ThemedText>

            <ThemedText themeColor="textSecondary">
              Manage your account, location access, and app information.
            </ThemedText>
          </View>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.cardHeadingRow}>
              <View style={styles.cardHeadingText}>
                <ThemedText
                  accessibilityRole="header"
                  type="subtitle">
                  Account
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  Your Tuna Bassoon explorer account.
                </ThemedText>
              </View>

              {currentUser?.isAdmin && (
                <ThemedView
                  style={[
                    styles.statusPill,
                    { backgroundColor: theme.accentSoft },
                  ]}>
                  <ThemedText type="smallBold">ADMIN</ThemedText>
                </ThemedView>
              )}
            </View>

            {currentUser === undefined ? (
              <ActivityIndicator
                accessibilityLabel="Loading account information"
                size="small"
              />
            ) : (
              <View style={styles.detailList}>
                <View style={styles.detailRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Name
                  </ThemedText>
                  <ThemedText type="smallBold" selectable>
                    {accountName}
                  </ThemedText>
                </View>

                {accountEmail && (
                  <View style={styles.detailRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Email
                    </ThemedText>
                    <ThemedText type="smallBold" selectable>
                      {accountEmail}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
              accessibilityHint="Returns to the Tuna Bassoon sign-in screen"
              disabled={signingOut}
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.signOutButton,
                pressed && styles.pressed,
                signingOut && styles.disabled,
              ]}>
              {signingOut ? (
                <ActivityIndicator
                  accessibilityLabel="Signing out"
                  color={Palette.danger}
                  size="small"
                />
              ) : (
                <ThemedText
                  type="smallBold"
                  style={styles.signOutButtonText}>
                  Sign Out
                </ThemedText>
              )}
            </Pressable>

            {accountError && (
              <ThemedText
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
                style={styles.errorText}>
                {accountError}
              </ThemedText>
            )}
          </ThemedView>

          {currentUser && communityRequirements && (
            <ThemedView
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.cardHeadingRow}>
                <View style={styles.cardHeadingText}>
                  <ThemedText
                    accessibilityRole="header"
                    type="subtitle">
                    Content Contributions
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {currentUser.canSubmitContent
                      ? 'Suggest locations for the Tuna Bassoon map. Every submission remains private until an administrator reviews and approves it.'
                      : 'Explore the map to unlock the ability to suggest new locations for administrator review.'}
                  </ThemedText>
                </View>

                <ThemedView
                  style={[
                    styles.statusPill,
                    { backgroundColor: theme.accentSoft },
                  ]}>
                  <ThemedText type="smallBold">
                    {communityRoleLabel}
                  </ThemedText>
                </ThemedView>
              </View>

              {currentUser.canSubmitContent ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    Tuna Bassoon checks suggestions for possible duplicates,
                    missing details, and content-safety concerns before placing
                    them in the review queue.
                  </ThemedText>

                  <View style={styles.actionRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Submit a Location"
                      accessibilityHint="Opens the private location suggestion form"
                      onPress={() =>
                        router.push({
                          pathname: '/settings',
                          params: { view: 'submit-location' },
                        })
                      }
                      style={({ pressed }) => [
                        styles.primaryButton,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={styles.primaryButtonText}>
                        Submit a Location
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="About Community Submissions"
                      accessibilityHint="Explains Community Contributor access and submission review"
                      onPress={() => setCommunityInfoVisible(true)}
                      style={({ pressed }) => [
                        styles.helpButton,
                        { borderColor: theme.borderStrong },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        accessible={false}
                        style={styles.helpButtonText}>
                        ?
                      </ThemedText>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.requirementList}>
                  <View style={styles.requirementRow}>
                    <ThemedText type="smallBold">Account Age</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {communityRequirements.accountAgeDays} of{' '}
                      {communityRequirements.accountAgeDaysRequired} days
                    </ThemedText>
                  </View>
                  <View style={styles.requirementRow}>
                    <ThemedText type="smallBold">Unique Places</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {communityRequirements.uniqueVisitCount} of{' '}
                      {communityRequirements.uniqueVisitsRequired}
                    </ThemedText>
                  </View>
                  <View style={styles.requirementRow}>
                    <ThemedText type="smallBold">Different Badges</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {communityRequirements.distinctBadgeCount} of{' '}
                      {communityRequirements.distinctBadgesRequired}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Complete all three requirements to become a Community
                    Contributor. The submission button will appear here
                    automatically.
                  </ThemedText>
                </View>
              )}
            </ThemedView>
          )}

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.cardHeadingRow}>
              <View style={styles.cardHeadingText}>
                <ThemedText
                  accessibilityRole="header"
                  type="subtitle">
                  Location & Privacy
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  Location is used to place your explorer and confirm nearby
                  check-ins. Tuna Bassoon requests foreground access only.
                </ThemedText>
              </View>

              <ThemedView
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: permissionGranted
                      ? theme.accentSoft
                      : theme.surfaceWarm,
                  },
                ]}>
                <ThemedText type="smallBold">
                  {permissionLabels[permissionState]}
                </ThemedText>
              </ThemedView>
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              Your device position is used for the active map experience. It
              is not substituted by Admin Test GPS outside your own testing
              session.
            </ThemedText>

            <View style={styles.actionRow}>
              {!permissionGranted && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Request Location Access"
                  disabled={permissionBusy}
                  onPress={requestLocationAccess}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                    permissionBusy && styles.disabled,
                  ]}>
                  {permissionBusy ? (
                    <ActivityIndicator
                      accessibilityLabel="Requesting location access"
                      color={Palette.paper}
                      size="small"
                    />
                  ) : (
                    <ThemedText
                      type="smallBold"
                      style={styles.primaryButtonText}>
                      Request Location Access
                    </ThemedText>
                  )}
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  Platform.OS === 'web'
                    ? 'How to review browser location access'
                    : 'Open device settings'
                }
                onPress={openDeviceSettings}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">
                  {Platform.OS === 'web'
                    ? 'Browser Permission Help'
                    : 'Open Device Settings'}
                </ThemedText>
              </Pressable>
            </View>

            {locationMessage && (
              <ThemedText
                accessibilityLiveRegion="polite"
                style={styles.feedbackText}>
                {locationMessage}
              </ThemedText>
            )}
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.cardHeadingText}>
              <ThemedText
                accessibilityRole="header"
                type="subtitle">
                Accessibility & Appearance
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Tuna Bassoon follows your device’s light or dark appearance
                and its preferred text size. Buttons and map tools include
                screen-reader labels where their visual icons need names.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                These preferences are changed in your device or browser
                settings, not inside Tuna Bassoon.
              </ThemedText>
            </View>

            <View style={styles.preferenceInfoList}>
              <View
                accessibilityLabel={`Appearance follows your device setting. ${appearanceSettingsPath}`}
                style={styles.preferenceInfo}>
                <ThemedText type="smallBold">Appearance</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Follows your device’s Light or Dark Mode.
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {appearanceSettingsPath}
                </ThemedText>
              </View>
              <View
                accessibilityLabel={`Text size follows your device setting. ${textSizeSettingsPath}`}
                style={styles.preferenceInfo}>
                <ThemedText type="smallBold">Text Size</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Follows your device’s preferred accessibility text size.
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {textSizeSettingsPath}
                </ThemedText>
              </View>
            </View>
          </ThemedView>

          <BuildInfoPanel />
        </DraggableScrollView>

        {communityRequirements ? (
          <CommunitySubmissionInfoModal
            onClose={() => setCommunityInfoVisible(false)}
            requirements={communityRequirements}
            visible={communityInfoVisible}
          />
        ) : null}
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
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset + Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    width: '100%',
  },
  heading: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  cardHeadingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  cardHeadingText: {
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: 620,
    minWidth: 220,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  detailList: {
    gap: Spacing.two,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
    minHeight: 32,
  },
  preferenceInfoList: {
    gap: Spacing.three,
  },
  preferenceInfo: {
    borderLeftColor: Palette.lightBronze,
    borderLeftWidth: 3,
    gap: Spacing.one,
    paddingLeft: Spacing.three,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  requirementList: {
    gap: Spacing.two,
  },
  requirementRow: {
    alignItems: 'center',
    borderBottomColor: Palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
    minHeight: 36,
  },
  helpButton: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  helpButtonText: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.bronzeDeep,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  primaryButtonText: {
    color: Palette.paper,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  signOutButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: Palette.danger,
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 150,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  signOutButtonText: {
    color: Palette.danger,
  },
  feedbackText: {
    color: Palette.bronzeDeep,
  },
  errorText: {
    color: Palette.danger,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
});
