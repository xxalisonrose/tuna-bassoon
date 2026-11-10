import { useAuth } from '@clerk/expo';
import { useMutation } from 'convex/react';
import * as Location from 'expo-location';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
  useScrollToTop,
} from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuildInfoPanel } from '@/components/admin/build-info-panel';
import { CommunitySubmissionInfoModal } from '@/components/community-submission-info-modal';
import { DraggableScrollView } from '@/components/draggable-scroll-view';
import {
  SettingsTourFinish,
  type TutorialTargetRect,
} from '@/components/settings-tour-finish';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UsernameEditorModal } from '@/components/username-editor-modal';
import {
  BottomTabInset,
  MaxContentWidth,
  Palette,
  Spacing,
} from '@/constants/theme';
import { useRootCurrentUser } from '@/contexts/root-convex-data-context';
import { useTheme } from '@/hooks/use-theme';
import { isBetaBuild } from '@/lib/build-profile';
import { api } from '../../convex/_generated/api';
import SubmitLocationScreen from './submit-location';

type PermissionState = 'checking' | Location.PermissionStatus;
type SettingsTab = 'account' | 'help' | 'community';

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

const standardFaqItems = [
  {
    key: 'about',
    question: 'What is Lorcal?',
    answer:
      'Lorcal is a location-based exploration app that makes discovering the world around you a little more interesting. Whether you’re traveling somewhere new or exploring your own hometown, Lorcal helps you uncover local history, folklore, landmarks, interesting facts, and hidden stories you might otherwise pass right by. Think of it as a travel companion that turns everyday journeys into opportunities to learn something new!',
  },
  {
    key: 'check-in',
    question: 'How do check-ins work?',
    answer:
      'When you’re near a location, you can check in to mark it as visited! Lorcal uses your current GPS location to verify that you’re nearby. You must be within 250 feet of a location to check in. Once completed, your visit is saved in your Passport so you can look back at all the places you’ve explored.',
  },
  {
    key: 'wishlist',
    question: 'What is “Want to Visit”?',
    answer:
      '“Want to Visit” is your personal list of places you’d like to explore someday. See a location that catches your eye? Just tap the heart button to save it to your list and come back to it later. Even after you check in to a location, it will stay on your “Want to Visit” list until you remove it.',
  },
  {
    key: 'badges',
    question: 'What are badges and how do I earn them?',
    answer:
      'As you explore and check in to different locations, you’ll make progress toward earning badges in your Passport. Some badges are awarded for visiting a specific place or taking part in a special event. Others require multiple check-ins to earn and can be leveled up as you continue exploring. For these badges, every five eligible check-ins earns you another level. Keep exploring to see how many badges you can collect!',
  },
  {
    key: 'mission',
    question: 'How do I complete the “Welcome to Lorcal” mission?',
    answer:
      'To complete the “Welcome to Lorcal” mission, you’ll need to check in at five different locations, earn a badge, and save an avatar customization. Once you’ve completed all three steps, you’ll earn the New Explorer badge and a new shirt for your avatar.',
  },
  {
    key: 'location-access',
    question: 'Can I use Lorcal without location access?',
    answer:
      'Absolutely! You can still browse the map, search the locations list, read stories, and save places to your “Want to Visit” list for future adventures. However, checking in requires access to your current location. You can review or change your location permissions at any time under Location and Privacy.',
  },
  {
    key: 'location-data',
    question: 'Does Lorcal continuously track my movement?',
    answer:
      'No! Lorcal uses your current location to show where you are on the map and check whether you’re close enough to a location to check in. It saves your successful check-ins in your Passport, but it does not record or save a continuous route of your movements.',
  },
  {
    key: 'submissions',
    question: 'How can I suggest a location?',
    answer:
      'Have a place you think others should discover? You can unlock Community Contributor access by exploring Lorcal and visiting new locations. You can track your progress in Settings. Once you’ve unlocked access, you can submit your own location suggestions for administrator review. Approved locations can then be added to Lorcal for everyone to explore!',
  },
  {
    key: 'privacy',
    question: 'What account information is public?',
    answer:
      'Your username may be visible to other Lorcal users, but your email address and personal account information are kept private.',
  },
] as const;

const betaFaqItem = {
  key: 'beta-trail',
  question: 'Why do I see private beta trail locations?',
  answer:
    'If you’re using a beta version of Lorcal, you may see five temporary tutorial locations created just for your account. These let you test check-ins and earn the Beta Pathfinder badge from anywhere. Don’t worry, these locations are private and can’t be seen by other explorers. They also won’t appear in regular production versions of Lorcal.',
} as const;

const faqItems = isBetaBuild
  ? [...standardFaqItems, betaFaqItem]
  : standardFaqItems;

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { tourFinish, view } = useLocalSearchParams<{
    tourFinish?: string;
    view?: string;
  }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const tutorialReplayButtonRef = useRef<View>(null);
  const tutorialReplayCardYRef = useRef<number | null>(null);
  const lastTourFinishRequestRef = useRef<string | null>(null);
  useScrollToTop(scrollViewRef);
  const { signOut } = useAuth();
  const currentUser = useRootCurrentUser();

  const redeemPromoCode = useMutation(api.lorcoins.redeemPromoCode);

  const [promoCode, setPromoCode] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [permissionState, setPermissionState] =
    useState<PermissionState>('checking');
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [locationMessage, setLocationMessage] =
    useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [communityInfoVisible, setCommunityInfoVisible] = useState(false);
  const [usernameEditorVisible, setUsernameEditorVisible] = useState(false);
  const [expandedFaqKeys, setExpandedFaqKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [tourFinishVisible, setTourFinishVisible] = useState(
    () => tourFinish !== undefined,
  );
  const [tourReplayTarget, setTourReplayTarget] =
    useState<TutorialTargetRect | null>(null);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(() =>
    tourFinish === undefined ? 'account' : 'help',
  );

  const measureTourReplayButton = useCallback(() => {
    tutorialReplayButtonRef.current?.measureInWindow(
      (x, y, width, height) => {
        if (width > 0 && height > 0) {
          setTourReplayTarget({ x, y, width, height });
        }
      },
    );
  }, []);

  const revealTourReplayButton = useCallback(() => {
    const cardY = tutorialReplayCardYRef.current;

    if (cardY === null) {
      return;
    }

    scrollViewRef.current?.scrollTo({
      animated: false,
      y: Math.max(0, cardY - Spacing.two),
    });

    setTimeout(() => {
      requestAnimationFrame(measureTourReplayButton);
    }, 100);
  }, [measureTourReplayButton]);

  useEffect(() => {
    if (
      tourFinish === undefined ||
      tourFinish === lastTourFinishRequestRef.current
    ) {
      return;
    }

    lastTourFinishRequestRef.current = tourFinish;
    setSettingsTab('help');
    setTourFinishVisible(true);
    setTourReplayTarget(null);

    const timer = setTimeout(() => {
      revealTourReplayButton();
    }, 120);
    return () => clearTimeout(timer);
  }, [revealTourReplayButton, tourFinish]);

  const toggleFaqItem = (key: string) => {
    setExpandedFaqKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }

      return nextKeys;
    });
  };

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

  const handleRedeemPromoCode = async () => {
    setPromoBusy(true);
    setPromoMessage(null);
    setPromoError(null);

    try {
      const result = await redeemPromoCode({ code: promoCode });
      setPromoCode('');
      setPromoMessage(
        `Success! 500 Lorcoins added. Your balance is now ${result.balance}.`,
      );
    } catch (error) {
      setPromoError(
        error instanceof Error
          ? error.message
          : 'Unable to redeem that code right now.',
      );
    } finally {
      setPromoBusy(false);
    }
  };

  const replayVisualTutorial = () => {
    router.replace({
      pathname: '/map',
      params: { tour: String(Date.now()) },
    });
  };

  const permissionGranted =
    permissionState === Location.PermissionStatus.GRANTED;
  const accountName = currentUser?.name ?? 'Harvard Explorer';
  const accountEmail = currentUser?.email;
  const communityContributor = currentUser?.communityContributor;
  const communityRequirements = communityContributor?.requirements;
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
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.heading}>
            <ThemedText accessibilityRole="header" type="title">
              Settings
            </ThemedText>

            <ThemedText themeColor="textSecondary">
              Manage your account, location access, and app information.
            </ThemedText>
          </View>

          <View
            accessibilityLabel="Settings sections"
            accessibilityRole="tablist"
            style={[styles.settingsTabs, { borderColor: theme.border }]}
          >
            {([
              ['account', 'Account'],
              ['help', 'App & Help'],
              ['community', 'Community'],
            ] as const).map(([tab, label]) => {
              const selected = settingsTab === tab;

              return (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    if (tab === 'community' && currentUser?.canSubmitContent) {
                      router.push({
                        pathname: '/settings',
                        params: { view: 'submit-location' },
                      });
                      return;
                    }

                    setSettingsTab(tab);
                  }}
                  style={({ pressed }) => [
                    styles.settingsTab,
                    selected && {
                      backgroundColor: theme.accentSoft,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={selected ? styles.settingsTabSelectedText : null}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {settingsTab === 'account' ? (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}
          >
            <View style={styles.cardHeadingRow}>
              <View style={styles.cardHeadingText}>
                <ThemedText accessibilityRole="header" type="subtitle">
                  Account Settings
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  Your Lorcal explorer account.
                </ThemedText>
              </View>

              {currentUser?.isAdmin && (
                <ThemedView
                  style={[
                    styles.statusPill,
                    { backgroundColor: theme.accentSoft },
                  ]}
                >
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

                <View style={styles.detailRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Username
                  </ThemedText>
                  <ThemedText type="smallBold" selectable>
                    {currentUser?.username ?? 'Not chosen'}
                  </ThemedText>
                </View>
              </View>
            )}

            {currentUser ? (
              <View style={styles.usernameActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    currentUser.username
                      ? 'Change Username'
                      : 'Choose Username'
                  }
                  disabled={!currentUser.canChangeUsername}
                  onPress={() => setUsernameEditorVisible(true)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: theme.border },
                    pressed && styles.pressed,
                    !currentUser.canChangeUsername && styles.disabled,
                  ]}
                >
                  <ThemedText type="smallBold">
                    {currentUser.username
                      ? 'Change Username'
                      : 'Choose Username'}
                  </ThemedText>
                </Pressable>

                <ThemedText type="small" themeColor="textSecondary">
                  {currentUser.canChangeUsername
                    ? 'Your username is public. Your email remains visible only to you and administrators.'
                    : `Username changes reopen ${new Date(
                        currentUser.usernameChangeAvailableAt ?? 0,
                      ).toLocaleDateString()}.`}
                </ThemedText>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
              accessibilityHint="Returns to the Lorcal sign-in screen"
              disabled={signingOut}
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.signOutButton,
                pressed && styles.pressed,
                signingOut && styles.disabled,
              ]}
            >
              {signingOut ? (
                <ActivityIndicator
                  accessibilityLabel="Signing out"
                  color={Palette.danger}
                  size="small"
                />
              ) : (
                <ThemedText
                  type="smallBold"
                  style={styles.signOutButtonText}
                >
                  Sign Out
                </ThemedText>
              )}
            </Pressable>

            {accountError && (
              <ThemedText
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
                style={styles.errorText}
              >
                {accountError}
              </ThemedText>
            )}
          </ThemedView>
          ) : null}

          {settingsTab === 'help' ? (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}
          >
            <View style={styles.cardHeadingText}>
              <ThemedText accessibilityRole="header" type="subtitle">
                Promo Codes
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Enter a promo code to receive 500 Lorcoins.
              </ThemedText>
            </View>

            <TextInput
              accessibilityLabel="Promo code"
              autoCapitalize="characters"
              autoCorrect={false}
              onChangeText={(text) => {
                setPromoCode(text);
                setPromoMessage(null);
                setPromoError(null);
              }}
              placeholder="Enter promo code"
              style={[styles.promoCodeInput, { borderColor: theme.border }]}
              value={promoCode}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                busy: promoBusy,
                disabled: promoBusy || !promoCode.trim(),
              }}
              disabled={promoBusy || !promoCode.trim()}
              onPress={() => void handleRedeemPromoCode()}
              style={({ pressed }) => [
                styles.primaryButton,
                (promoBusy || !promoCode.trim()) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {promoBusy ? (
                <ActivityIndicator
                  accessibilityLabel="Redeeming promo code"
                  color={Palette.paper}
                  size="small"
                />
              ) : (
                <ThemedText
                  type="smallBold"
                  style={styles.primaryButtonText}
                >
                  Redeem Code
                </ThemedText>
              )}
            </Pressable>

            {promoMessage ? (
              <ThemedText
                accessibilityLiveRegion="polite"
                style={styles.feedbackText}
              >
                {promoMessage}
              </ThemedText>
            ) : null}

            {promoError ? (
              <ThemedText
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
                style={styles.errorText}
              >
                {promoError}
              </ThemedText>
            ) : null}
          </ThemedView>
          ) : null}

          {settingsTab === 'community' &&
          currentUser && communityRequirements && (
            <ThemedView
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }]}
            >
              <View style={styles.cardHeadingRow}>
                <View style={styles.cardHeadingText}>
                  <ThemedText accessibilityRole="header" type="subtitle">
                    Community Contributions
                  </ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {currentUser.canSubmitContent
                      ? 'Suggest locations for the Lorcal map. Every submission remains private until an administrator reviews and approves it.'
                      : 'Community Contributions let experienced explorers suggest new locations for the Lorcal map. Suggestions remain private until an administrator reviews and approves them.'}
                  </ThemedText>
                </View>

                <ThemedView
                  style={[
                    styles.statusPill,
                    { backgroundColor: theme.accentSoft },
                  ]}
                >
                  <ThemedText type="smallBold">
                    {communityRoleLabel}
                  </ThemedText>
                </ThemedView>
              </View>

              {currentUser.canSubmitContent ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    Lorcal checks suggestions for possible duplicates,
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
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={styles.primaryButtonText}
                      >
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
                      ]}
                    >
                      <ThemedText
                        accessible={false}
                        style={styles.helpButtonText}
                      >
                        ?
                      </ThemedText>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.requirementList}>
                  <ThemedText themeColor="textSecondary">
                    Access is earned by building a trustworthy exploration
                    history. Complete every requirement below and the location
                    submission form will replace this progress list.
                  </ThemedText>
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

          {settingsTab === 'account' ? (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}
          >
            <View style={styles.cardHeadingRow}>
              <View style={styles.cardHeadingText}>
                <ThemedText accessibilityRole="header" type="subtitle">
                  Location & Privacy
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  Location is used to place your explorer and confirm nearby
                  check-ins. Lorcal requests foreground access only.
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
                ]}
              >
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
                  ]}
                >
                  {permissionBusy ? (
                    <ActivityIndicator
                      accessibilityLabel="Requesting location access"
                      color={Palette.paper}
                      size="small"
                    />
                  ) : (
                    <ThemedText
                      type="smallBold"
                      style={styles.primaryButtonText}
                    >
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
                ]}
              >
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
                style={styles.feedbackText}
              >
                {locationMessage}
              </ThemedText>
            )}
          </ThemedView>
          ) : null}

          {settingsTab === 'account' ? (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}
          >
            <View style={styles.cardHeadingText}>
              <ThemedText accessibilityRole="header" type="subtitle">
                Accessibility & Appearance
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Lorcal follows your device’s light or dark appearance and its
                preferred text size. Buttons and map tools include
                screen-reader labels where their visual icons need names.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                These preferences are changed in your device or browser
                settings, not inside Lorcal.
              </ThemedText>
            </View>

            <View style={styles.preferenceInfoList}>
              <View
                accessibilityLabel={`Appearance follows your device setting. ${appearanceSettingsPath}`}
                style={styles.preferenceInfo}
              >
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
                style={styles.preferenceInfo}
              >
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
          ) : null}

          {settingsTab === 'help' ? (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}
          >
            <View style={styles.cardHeadingText}>
              <ThemedText accessibilityRole="header" type="subtitle">
                Frequently Asked Questions
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Quick answers about exploring, check-ins, rewards, and your
                account.
              </ThemedText>
            </View>

            <View style={styles.faqList}>
              {faqItems.map((item) => {
                const expanded = expandedFaqKeys.has(item.key);

                return (
                  <View
                    key={item.key}
                    style={[styles.faqItem, { borderColor: theme.border }]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={item.question}
                      accessibilityHint={
                        expanded
                          ? 'Collapses this answer'
                          : 'Expands this answer'
                      }
                      accessibilityState={{ expanded }}
                      onPress={() => toggleFaqItem(item.key)}
                      style={({ pressed }) => [
                        styles.faqQuestion,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={styles.faqQuestionText}
                      >
                        {item.question}
                      </ThemedText>
                      <ThemedText
                        accessible={false}
                        style={styles.faqIndicator}
                      >
                        {expanded ? '−' : '+'}
                      </ThemedText>
                    </Pressable>

                    {expanded ? (
                      <ThemedText
                        accessibilityLiveRegion="polite"
                        themeColor="textSecondary"
                        style={styles.faqAnswer}
                      >
                        {item.answer}
                      </ThemedText>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </ThemedView>
          ) : null}

          {settingsTab === 'help' ? (
          <ThemedView
            type="backgroundElement"
            onLayout={(event) => {
              tutorialReplayCardYRef.current =
                event.nativeEvent.layout.y;

              if (tourFinishVisible) {
                revealTourReplayButton();
              }
            }}
            style={[styles.card, { borderColor: theme.border }]}
          >
            <View style={styles.cardHeadingText}>
              <ThemedText accessibilityRole="header" type="subtitle">
                Replay Tour
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Replay the guided walkthrough of the map controls, nearby
                places, Passport, and Settings.
              </ThemedText>
            </View>

            <Pressable
              ref={tutorialReplayButtonRef}
              accessibilityRole="button"
              accessibilityLabel="Replay Visual App Tour"
              onLayout={() => {
                if (tourFinishVisible) {
                  requestAnimationFrame(measureTourReplayButton);
                }
              }}
              onPress={replayVisualTutorial}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={styles.primaryButtonText}
              >
                Replay App Tour
              </ThemedText>
            </Pressable>
          </ThemedView>
          ) : null}

          {settingsTab === 'account' && currentUser?.isAdmin
            ? <BuildInfoPanel />
            : null}
        </DraggableScrollView>

        {communityRequirements ? (
          <CommunitySubmissionInfoModal
            onClose={() => setCommunityInfoVisible(false)}
            requirements={communityRequirements}
            visible={communityInfoVisible}
          />
        ) : null}

        <UsernameEditorModal
          key={`${currentUser?.username ?? 'new'}-${usernameEditorVisible ? 'open' : 'closed'}`}
          currentUsername={currentUser?.username}
          onClose={() => setUsernameEditorVisible(false)}
          visible={usernameEditorVisible}
        />

        <SettingsTourFinish
          onDone={() => {
            setTourFinishVisible(false);
            setTourReplayTarget(null);
            router.replace({
              pathname: '/map',
              params: isBetaBuild
                ? { tourBeta: String(Date.now()) }
                : {},
            });
          }}
          target={tourReplayTarget}
          visible={tourFinishVisible}
        />
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
  settingsTabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  settingsTab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.two,
  },
  settingsTabSelectedText: {
    fontWeight: '800',
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
  usernameActions: {
    alignItems: 'flex-start',
    gap: Spacing.two,
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
  faqList: {
    gap: Spacing.two,
  },
  faqItem: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqQuestion: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  faqQuestionText: {
    flex: 1,
  },
  faqIndicator: {
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 26,
  },
  faqAnswer: {
    borderTopColor: Palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    lineHeight: 22,
    padding: Spacing.three,
    paddingTop: Spacing.two,
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
  promoCodeInput: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
