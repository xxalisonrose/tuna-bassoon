import {
  useConvexAuth,
  useMutation,
  useQuery,
} from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarPreview } from '@/components/avatar-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  MaxContentWidth,
  Palette,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  applyAvatarItem,
  avatarCategories,
  avatarItemOptions,
  avatarPresets,
  getAvatarSlotValue,
  getMatchingAvatarPresetId,
  normalizeAvatarSelection,
  type AvatarCategoryId,
  type AvatarItemSlot,
  type AvatarSelection,
} from '@/lib/avatar';
import { api } from '../../../convex/_generated/api';

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'string'
  ) {
    return error.data;
  }

  return 'Unable to save your avatar right now.';
}

function selectionsMatch(
  first: AvatarSelection,
  second: AvatarSelection,
) {
  return Object.keys(first).every(
    (key) =>
      first[key as keyof AvatarSelection] ===
      second[key as keyof AvatarSelection],
  );
}

export default function CustomizeAvatarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const {
    isAuthenticated,
    isLoading: isAuthenticationLoading,
  } = useConvexAuth();
  const avatarProfile = useQuery(
    api.users.getMyAvatarProfile,
    isAuthenticated ? {} : 'skip',
  );
  const saveMyAvatarProfile = useMutation(
    api.users.saveMyAvatarProfile,
  );
  const [draftSelection, setDraftSelection] =
    useState<AvatarSelection | null>(null);
  const [activeCategory, setActiveCategory] =
    useState<AvatarCategoryId>('outfits');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const savedSelection = normalizeAvatarSelection(
    avatarProfile?.selection,
    avatarProfile?.avatarPresetId,
  );
  const activeSelection = draftSelection ?? savedSelection;
  const matchingPresetId = getMatchingAvatarPresetId(activeSelection);
  const hasUnsavedChanges = !selectionsMatch(
    activeSelection,
    savedSelection,
  );
  const previewSize = Math.min(Math.max(width - 64, 240), 430);

  const returnToPassport = () => {
    router.replace('/collection');
  };

  const updateSelection = (selection: AvatarSelection) => {
    setDraftSelection(selection);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const chooseItem = (slot: AvatarItemSlot, itemId: string) => {
    updateSelection(applyAvatarItem(activeSelection, slot, itemId));
  };

  const saveAvatar = async () => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const result = await saveMyAvatarProfile({
        selection: activeSelection,
      });
      setDraftSelection(result.selection);
      setStatusMessage('Avatar saved. Your Passport has been updated.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (isAuthenticationLoading) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ActivityIndicator
          accessibilityLabel="Loading avatar customization"
          accessibilityRole="progressbar"
          size="large"
        />
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.signedOutSafeArea}>
          <ThemedView
            type="backgroundElement"
            style={styles.messageCard}>
            <ThemedText accessibilityRole="header" type="title">
              Sign In to Customize
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Sign in from the Home tab before choosing an avatar.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={returnToPassport}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Back to Passport</ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (avatarProfile === undefined) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ActivityIndicator
          accessibilityLabel="Loading your avatar"
          accessibilityRole="progressbar"
          size="large"
        />
        <ThemedText themeColor="textSecondary">
          Opening the dressing room...
        </ThemedText>
      </ThemedView>
    );
  }

  const selectedSlot =
    activeCategory === 'outfits' ? null : activeCategory;
  const visibleItems =
    selectedSlot === null ? [] : avatarItemOptions[selectedSlot];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heading}>
            <ThemedText accessibilityRole="header" type="title">
              Customize Avatar
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Mix individual clothing and accessories, or begin with a
              complete outfit.
            </ThemedText>
          </View>

          <ThemedView
            type="backgroundElement"
            style={styles.previewCard}>
            <AvatarPreview
              selection={activeSelection}
              size={previewSize}
            />
            <ThemedText type="smallBold">
              {matchingPresetId === 'custom'
                ? 'Custom Look'
                : avatarPresets.find(
                    (preset) => preset.id === matchingPresetId,
                  )?.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {hasUnsavedChanges ? 'Unsaved Changes' : 'Saved Look'}
            </ThemedText>
          </ThemedView>

          <View style={styles.section}>
            <ThemedText accessibilityRole="header" type="subtitle">
              Wardrobe
            </ThemedText>
            <View
              accessibilityRole="tablist"
              accessibilityLabel="Avatar wardrobe categories"
              style={styles.categoryList}>
              {avatarCategories.map((category) => {
                const selected = activeCategory === category.id;

                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setActiveCategory(category.id)}
                    style={({ pressed }) => [
                      styles.categoryButton,
                      {
                        backgroundColor: selected
                          ? theme.backgroundSelected
                          : theme.backgroundElement,
                        borderColor: selected
                          ? theme.borderStrong
                          : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={selected ? { color: theme.link } : undefined}>
                      {category.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {activeCategory === 'outfits' ? (
            <View style={styles.choiceGrid}>
              {avatarPresets.map((preset) => {
                const selected = matchingPresetId === preset.id;

                return (
                  <Pressable
                    key={preset.id}
                    accessibilityLabel={`${preset.name}. ${preset.description}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => updateSelection({ ...preset.selection })}
                    style={({ pressed }) => [
                      styles.choiceCard,
                      {
                        backgroundColor: selected
                          ? theme.backgroundSelected
                          : theme.backgroundElement,
                        borderColor: selected
                          ? theme.borderStrong
                          : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <AvatarPreview selection={preset.selection} size={150} />
                    <View style={styles.choiceCopy}>
                      <ThemedText type="smallBold">{preset.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {preset.description}
                      </ThemedText>
                      <ThemedText
                        type="smallBold"
                        style={selected ? { color: theme.link } : undefined}>
                        {selected ? 'Equipped' : 'Equip Outfit'}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={`Choose ${
                avatarCategories.find(
                  (category) => category.id === activeCategory,
                )?.label ?? 'an item'
              }`}
              style={styles.choiceGrid}>
              {visibleItems.map((item) => {
                const selected =
                  getAvatarSlotValue(activeSelection, activeCategory) ===
                  item.id;
                const previewSelection = applyAvatarItem(
                  activeSelection,
                  activeCategory,
                  item.id,
                );

                return (
                  <Pressable
                    key={item.id}
                    accessibilityLabel={`${item.name}. ${item.description}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => chooseItem(activeCategory, item.id)}
                    style={({ pressed }) => [
                      styles.choiceCard,
                      {
                        backgroundColor: selected
                          ? theme.backgroundSelected
                          : theme.backgroundElement,
                        borderColor: selected
                          ? theme.borderStrong
                          : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <AvatarPreview selection={previewSelection} size={150} />
                    <View style={styles.choiceCopy}>
                      <ThemedText type="smallBold">{item.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.description}
                      </ThemedText>
                      <ThemedText
                        type="smallBold"
                        style={selected ? { color: theme.link } : undefined}>
                        {selected ? 'Equipped' : 'Choose Item'}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <ThemedView
            type="backgroundElement"
            style={styles.comingSoonCard}>
            <ThemedText accessibilityRole="header" type="subtitle">
              More Wardrobe Categories Are Coming
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Coat patterns, hats, backpacks, and handheld items will join
              these starter pieces as aligned artwork is completed.
            </ThemedText>
          </ThemedView>

          {statusMessage ? (
            <ThemedText
              accessibilityLiveRegion="polite"
              style={styles.successMessage}>
              {statusMessage}
            </ThemedText>
          ) : null}

          {errorMessage ? (
            <ThemedText
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.errorMessage}>
              {errorMessage}
            </ThemedText>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={saveAvatar}
              style={({ pressed }) => [
                styles.primaryButton,
                saving && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {saving ? (
                <ActivityIndicator
                  accessibilityLabel="Saving avatar"
                  color={Palette.ink}
                  size="small"
                />
              ) : (
                <ThemedText style={styles.primaryButtonText} type="smallBold">
                  Save Avatar
                </ThemedText>
              )}
            </Pressable>

            {hasUnsavedChanges ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => updateSelection(savedSelection)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">Undo Changes</ThemedText>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={returnToPassport}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Back to Passport</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredContainer: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  safeArea: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  signedOutSafeArea: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    width: '100%',
  },
  scrollContent: {
    gap: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  heading: { gap: Spacing.two },
  messageCard: {
    borderRadius: Spacing.four,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  previewCard: {
    alignItems: 'center',
    borderRadius: Spacing.four,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  section: { gap: Spacing.three },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  categoryButton: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  choiceCard: {
    alignItems: 'center',
    borderRadius: Spacing.four,
    borderWidth: 2,
    flexDirection: 'row',
    flexGrow: 1,
    gap: Spacing.three,
    minWidth: 280,
    padding: Spacing.three,
  },
  choiceCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  comingSoonCard: {
    borderRadius: Spacing.four,
    gap: Spacing.two,
    padding: Spacing.four,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.lightBronze,
    borderRadius: Spacing.two,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 50,
    minWidth: 180,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  primaryButtonText: { color: Palette.ink },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.teaGreen,
    borderRadius: Spacing.two,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 50,
    minWidth: 180,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  successMessage: {
    color: '#18864B',
    fontWeight: '700',
  },
  errorMessage: {
    color: Palette.danger,
    fontWeight: '700',
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
});
