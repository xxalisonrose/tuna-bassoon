import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarPreview } from '@/components/avatar-preview';
import { LorcoinIcon } from '@/components/lorcoin-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  MaxContentWidth,
  Palette,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppTabBar } from '@/contexts/app-tab-bar-context';
import {
  applyAvatarItem,
  avatarCategories,
  avatarItemOptions,
  avatarPresets,
  getAvatarItemPrice,
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

  return 'Unable to update your wardrobe right now.';
}

function selectionsMatch(first: AvatarSelection, second: AvatarSelection) {
  return Object.keys(first).every(
    (key) =>
      first[key as keyof AvatarSelection] ===
      second[key as keyof AvatarSelection],
  );
}

type WardrobePreview = {
  slot: AvatarItemSlot;
  itemId: string;
  itemName: string;
  price: number;
};

type OutfitPurchasePreview = {
  outfitId: string;
  outfitName: string;
  selection: AvatarSelection;
  missingItemIds: string[];
  missingItemNames: string[];
  price: number;
};

function getAvatarItemName(itemId: string) {
  for (const options of Object.values(avatarItemOptions)) {
    const item = options.find((option) => option.id === itemId);

    if (item !== undefined) {
      return item.name;
    }
  }

  return itemId;
}

export default function CustomizeAvatarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { setHidden: setTabBarHidden } = useAppTabBar();
  const { isAuthenticated, isLoading: isAuthenticationLoading } =
    useConvexAuth();
  const avatarProfile = useQuery(
    api.users.getMyAvatarProfile,
    isAuthenticated ? {} : 'skip',
  );
  const wallet = useQuery(
    api.lorcoins.getMyWallet,
    isAuthenticated ? {} : 'skip',
  );
  const saveMyAvatarProfile = useMutation(api.users.saveMyAvatarProfile);
  const purchaseAvatarItem = useMutation(api.lorcoins.purchaseAvatarItem);
  const purchaseAvatarItems = useMutation(api.lorcoins.purchaseAvatarItems);
  const [draftSelection, setDraftSelection] = useState<AvatarSelection | null>(
    null,
  );
  const [activeCategory, setActiveCategory] = useState<AvatarCategoryId>('top');
  const [saving, setSaving] = useState(false);
  const [previewPurchase, setPreviewPurchase] =
    useState<WardrobePreview | null>(null);
  const [previewOutfitPurchase, setPreviewOutfitPurchase] =
    useState<OutfitPurchasePreview | null>(null);
  const [confirmingPurchase, setConfirmingPurchase] = useState(false);
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [purchasingOutfitId, setPurchasingOutfitId] = useState<string | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const savedSelection = normalizeAvatarSelection(
    avatarProfile?.selection,
    avatarProfile?.avatarPresetId,
  );
  const editableSelection = draftSelection ?? savedSelection;
  const activeSelection = previewOutfitPurchase
    ? previewOutfitPurchase.selection
    : previewPurchase
      ? applyAvatarItem(
          editableSelection,
          previewPurchase.slot,
          previewPurchase.itemId,
        )
      : editableSelection;
  const matchingPresetId = getMatchingAvatarPresetId(activeSelection);
  const hasUnsavedChanges = !selectionsMatch(
    editableSelection,
    savedSelection,
  );
  const previewSize = Math.min(Math.max(width * 0.38, 128), 190);
  const unlockedAvatarItemIds = new Set(
    avatarProfile?.unlockedAvatarItemIds ?? [],
  );
  const purchasedAvatarItemIds = new Set(
    avatarProfile?.purchasedAvatarItemIds ?? [],
  );
  const previewPrice =
    previewPurchase?.price ?? previewOutfitPurchase?.price ?? 0;
  const purchaseShortfall =
    wallet === undefined || wallet === null
      ? 0
      : Math.max(0, previewPrice - wallet.balance);

  useFocusEffect(
    useCallback(() => {
      setTabBarHidden(true);

      return () => setTabBarHidden(false);
    }, [setTabBarHidden]),
  );

  const returnToPassport = () => {
    if (
      hasUnsavedChanges ||
      previewPurchase !== null ||
      previewOutfitPurchase !== null
    ) {
      setConfirmingDiscard(true);
      return;
    }

    router.replace('/collection');
  };

  const discardAndReturnToPassport = () => {
    setConfirmingDiscard(false);
    setDraftSelection(null);
    setPreviewPurchase(null);
    setPreviewOutfitPurchase(null);
    router.replace('/collection');
  };

  const updateSelection = (selection: AvatarSelection) => {
    setDraftSelection(selection);
    setPreviewPurchase(null);
    setPreviewOutfitPurchase(null);
    setConfirmingPurchase(false);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const previewOrChooseItem = (
    slot: AvatarItemSlot,
    itemId: string,
    itemName: string,
  ) => {
    const price = getAvatarItemPrice(itemId);
    const owned = price === 0 || purchasedAvatarItemIds.has(itemId);

    setStatusMessage(null);
    setErrorMessage(null);
    setPreviewOutfitPurchase(null);

    if (owned) {
      updateSelection(applyAvatarItem(editableSelection, slot, itemId));
      return;
    }

    setPreviewPurchase({ itemId, itemName, price, slot });
    setConfirmingPurchase(false);
  };

  const previewOrChooseOutfit = (
    outfitId: string,
    outfitName: string,
    selection: AvatarSelection,
  ) => {
    const missingItemIds = Array.from(
      new Set(
        Object.values(selection).filter(
          (itemId) =>
            getAvatarItemPrice(itemId) > 0 &&
            !purchasedAvatarItemIds.has(itemId),
        ),
      ),
    );

    if (missingItemIds.length === 0) {
      updateSelection({ ...selection });
      return;
    }

    setPreviewPurchase(null);
    setPreviewOutfitPurchase({
      outfitId,
      outfitName,
      selection: { ...selection },
      missingItemIds,
      missingItemNames: missingItemIds.map(getAvatarItemName),
      price: missingItemIds.reduce(
        (total, itemId) => total + getAvatarItemPrice(itemId),
        0,
      ),
    });
    setConfirmingPurchase(false);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const openPurchaseConfirmation = () => {
    if (previewPurchase === null || wallet === undefined || wallet === null) {
      return;
    }

    if (wallet.balance < previewPurchase.price) {
      setErrorMessage(
        `You need ${previewPurchase.price - wallet.balance} more Lorcoins to buy ${previewPurchase.itemName}.`,
      );
      return;
    }

    setErrorMessage(null);
    setConfirmingPurchase(true);
  };

  const confirmPurchase = async () => {
    if (previewPurchase === null) {
      return;
    }

    const purchase = previewPurchase;
    setPurchasingItemId(purchase.itemId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const result = await purchaseAvatarItem({ itemId: purchase.itemId });

      if (result.status === 'insufficient_funds') {
        setConfirmingPurchase(false);
        setErrorMessage(
          `You need ${result.needed} more Lorcoins to buy ${purchase.itemName}.`,
        );
        return;
      }

      setDraftSelection(
        applyAvatarItem(editableSelection, purchase.slot, purchase.itemId),
      );
      setPreviewPurchase(null);
      setConfirmingPurchase(false);
      setStatusMessage(`${purchase.itemName} purchased and equipped.`);
    } catch (error) {
      setConfirmingPurchase(false);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPurchasingItemId(null);
    }
  };

  const openOutfitPurchaseConfirmation = () => {
    if (
      previewOutfitPurchase === null ||
      wallet === undefined ||
      wallet === null
    ) {
      return;
    }

    if (wallet.balance < previewOutfitPurchase.price) {
      setErrorMessage(
        `You need ${previewOutfitPurchase.price - wallet.balance} more Lorcoins to complete ${previewOutfitPurchase.outfitName}.`,
      );
      return;
    }

    setErrorMessage(null);
    setConfirmingPurchase(true);
  };

  const confirmOutfitPurchase = async () => {
    if (previewOutfitPurchase === null) {
      return;
    }

    const purchase = previewOutfitPurchase;
    setPurchasingOutfitId(purchase.outfitId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const result = await purchaseAvatarItems({
        itemIds: purchase.missingItemIds,
      });

      if (result.status === 'insufficient_funds') {
        setConfirmingPurchase(false);
        setErrorMessage(
          `You need ${result.needed} more Lorcoins to complete ${purchase.outfitName}.`,
        );
        return;
      }

      setDraftSelection({ ...purchase.selection });
      setPreviewOutfitPurchase(null);
      setConfirmingPurchase(false);
      setStatusMessage(
        `${purchase.outfitName} is complete. Choose Save Avatar to wear it on the map.`,
      );
    } catch (error) {
      setConfirmingPurchase(false);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPurchasingOutfitId(null);
    }
  };

  const saveAvatar = async () => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const result = await saveMyAvatarProfile({
        selection: editableSelection,
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
          <ThemedView type="backgroundElement" style={styles.messageCard}>
            <ThemedText accessibilityRole="header" type="title">
              Sign In to Customize
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Sign in before choosing an avatar.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={returnToPassport}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
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

  const selectedSlot = activeCategory === 'outfits' ? null : activeCategory;
  const visibleItems =
    selectedSlot === null ? [] : avatarItemOptions[selectedSlot];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.fixedTopContent}>
          <View style={styles.headingRow}>
            <View style={styles.titleRow}>
              <Pressable
                accessibilityLabel="Back to Passport"
                accessibilityRole="button"
                onPress={returnToPassport}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">‹ Passport</ThemedText>
              </Pressable>
              <ThemedText accessibilityRole="header" type="subtitle">
                Dressing Room
              </ThemedText>
            </View>
            <ThemedView
              accessibilityLabel={`${wallet?.balance ?? 0} Lorcoins available`}
              accessible
              type="backgroundElement"
              style={styles.walletChip}
            >
              <LorcoinIcon size={20} />
              <ThemedText type="smallBold">
                {wallet === undefined ? '…' : wallet?.balance ?? 0}
              </ThemedText>
            </ThemedView>
          </View>

          <ThemedView type="backgroundElement" style={styles.previewCard}>
            <AvatarPreview selection={activeSelection} size={previewSize} />
            <View style={styles.previewCopy}>
              <ThemedText type="subtitle">
                {matchingPresetId === 'custom'
                  ? 'Custom Look'
                  : avatarPresets.find(
                      (preset) => preset.id === matchingPresetId,
                    )?.name}
              </ThemedText>
              <ThemedText
                type="smallBold"
                style={
                  hasUnsavedChanges ||
                  previewPurchase !== null ||
                  previewOutfitPurchase !== null
                    ? styles.unsavedMessage
                    : styles.successMessage
                }
              >
                {previewOutfitPurchase
                  ? `Previewing ${previewOutfitPurchase.outfitName}`
                  : previewPurchase
                    ? `Previewing ${previewPurchase.itemName}`
                    : hasUnsavedChanges
                      ? 'Not saved yet'
                      : 'Saved look'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Your avatar stays here while you browse the wardrobe.
              </ThemedText>
            </View>
          </ThemedView>
        </View>

        <ScrollView
          style={styles.wardrobeScroll}
          contentContainerStyle={styles.scrollContent}
          nativeID={Platform.OS === 'web' ? 'app-page-scroll-view' : undefined}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
          {previewPurchase ? (
            <ThemedView
              type="backgroundElement"
              style={styles.purchasePreviewCard}
            >
              <ThemedText accessibilityRole="header" type="subtitle">
                Previewing {previewPurchase.itemName}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                This item is only on your preview. Your Lorcoins will not be
                spent until you choose Buy and confirm the purchase.
              </ThemedText>
              <View style={styles.purchaseDetailsRow}>
                <View style={styles.coinAmountRow}>
                  <LorcoinIcon />
                  <ThemedText type="smallBold">
                    {previewPurchase.price} Lorcoins
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Balance: {wallet?.balance ?? 0}
                </ThemedText>
              </View>
              {wallet !== undefined &&
              wallet !== null &&
              wallet.balance < previewPurchase.price ? (
                <ThemedText
                  accessibilityLiveRegion="polite"
                  style={styles.errorMessage}
                >
                  You need {previewPurchase.price - wallet.balance} more
                  Lorcoins to buy this item.
                </ThemedText>
              ) : null}
              <ThemedText type="smallBold">
                Buy or cancel this preview from the bar below.
              </ThemedText>
            </ThemedView>
          ) : null}

          {previewOutfitPurchase ? (
            <ThemedView
              type="backgroundElement"
              style={styles.purchasePreviewCard}
            >
              <ThemedText accessibilityRole="header" type="subtitle">
                Complete {previewOutfitPurchase.outfitName}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                You already own part of this look. Buy the remaining{' '}
                {previewOutfitPurchase.missingItemIds.length}{' '}
                {previewOutfitPurchase.missingItemIds.length === 1
                  ? 'piece'
                  : 'pieces'}
                : {previewOutfitPurchase.missingItemNames.join(', ')}.
              </ThemedText>
              <View style={styles.purchaseDetailsRow}>
                <View style={styles.coinAmountRow}>
                  <LorcoinIcon />
                  <ThemedText type="smallBold">
                    {previewOutfitPurchase.price} Lorcoins
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Balance: {wallet?.balance ?? 0}
                </ThemedText>
              </View>
              {wallet !== undefined &&
              wallet !== null &&
              wallet.balance < previewOutfitPurchase.price ? (
                <ThemedText
                  accessibilityLiveRegion="polite"
                  style={styles.errorMessage}
                >
                  You need {previewOutfitPurchase.price - wallet.balance} more
                  Lorcoins to complete this outfit.
                </ThemedText>
              ) : null}
              <ThemedText type="smallBold">
                Buy or cancel this preview from the bar below.
              </ThemedText>
            </ThemedView>
          ) : null}

          <View style={styles.section}>
            <ThemedText accessibilityRole="header" type="subtitle">
              Wardrobe
            </ThemedText>
            <View
              accessibilityRole="tablist"
              accessibilityLabel="Avatar wardrobe categories"
              style={styles.categoryList}
            >
              {avatarCategories.map((category) => {
                const selected = activeCategory === category.id;

                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setActiveCategory(category.id);
                      setPreviewPurchase(null);
                      setPreviewOutfitPurchase(null);
                      setConfirmingPurchase(false);
                      setErrorMessage(null);
                    }}
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
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={selected ? { color: theme.link } : undefined}
                    >
                      {category.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ThemedView type="backgroundElement" style={styles.economyCard}>
            <ThemedText type="smallBold">Earn and spend Lorcoins</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              New check-ins earn 5, badges earn 50, and each new wardrobe piece
              costs 100 Lorcoins.
            </ThemedText>
          </ThemedView>

          {activeCategory === 'outfits' ? (
            <View style={styles.choiceGrid}>
              {avatarPresets.map((preset) => {
                const selected = matchingPresetId === preset.id;
                const missingItemIds = Array.from(
                  new Set(
                    Object.values(preset.selection).filter(
                      (itemId) =>
                        getAvatarItemPrice(itemId) > 0 &&
                        !purchasedAvatarItemIds.has(itemId),
                    ),
                  ),
                );
                const missingItemCount = missingItemIds.length;
                const missingPrice = missingItemIds.reduce(
                  (total, itemId) =>
                    total + getAvatarItemPrice(itemId),
                  0,
                );
                const isPurchasing = purchasingOutfitId === preset.id;

                return (
                  <Pressable
                    key={preset.id}
                    accessibilityLabel={`${preset.name}. ${preset.description}`}
                    accessibilityRole="radio"
                    accessibilityState={{ busy: isPurchasing, selected }}
                    disabled={isPurchasing}
                    onPress={() =>
                      previewOrChooseOutfit(
                        preset.id,
                        preset.name,
                        preset.selection,
                      )
                    }
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
                      isPurchasing && styles.lockedChoiceCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <AvatarPreview selection={preset.selection} size={150} />
                    <View style={styles.choiceCopy}>
                      <ThemedText type="smallBold">{preset.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {preset.description}
                      </ThemedText>
                      <ThemedText
                        type="smallBold"
                        style={selected ? { color: theme.link } : undefined}
                      >
                        {isPurchasing
                          ? 'Buying missing pieces...'
                          : missingItemCount > 0
                            ? `Buy remaining ${missingItemCount} ${missingItemCount === 1 ? 'piece' : 'pieces'} — ${missingPrice} Lorcoins`
                          : selected
                            ? 'Equipped'
                            : 'Equip Complete Look'}
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
              style={styles.choiceGrid}
            >
              {visibleItems.map((item) => {
                const missionLocked =
                  item.unlockMissionKey !== undefined &&
                  !unlockedAvatarItemIds.has(item.id);
                const price = item.price ?? 0;
                const owned =
                  price === 0 || purchasedAvatarItemIds.has(item.id);
                const isPurchasing = purchasingItemId === item.id;
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
                    accessibilityState={{
                      busy: isPurchasing,
                      disabled: missionLocked || isPurchasing,
                      selected,
                    }}
                    disabled={missionLocked || isPurchasing}
                    onPress={() =>
                      previewOrChooseItem(activeCategory, item.id, item.name)
                    }
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
                      missionLocked && styles.lockedChoiceCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <AvatarPreview selection={previewSelection} size={150} />
                    <View style={styles.choiceCopy}>
                      <ThemedText type="smallBold">{item.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.description}
                      </ThemedText>
                      {price > 0 ? (
                        <View style={styles.coinAmountRow}>
                          <LorcoinIcon size={18} />
                          <ThemedText
                            type="smallBold"
                            style={styles.itemPrice}
                          >
                            {owned ? 'Owned' : `${price} Lorcoins`}
                          </ThemedText>
                        </View>
                      ) : null}
                      <ThemedText
                        type="smallBold"
                        style={selected ? { color: theme.link } : undefined}
                      >
                        {missionLocked
                          ? 'Locked Mission Reward'
                          : isPurchasing
                            ? 'Buying...'
                            : !owned
                              ? selected
                                ? 'Previewing — Buy Above'
                                : 'Preview Item'
                              : selected
                                ? 'Equipped'
                                : 'Choose Item'}
                      </ThemedText>
                      {missionLocked && item.unlockMessage ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.unlockMessage}
                        </ThemedText>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <ThemedView type="backgroundElement" style={styles.comingSoonCard}>
            <ThemedText accessibilityRole="header" type="subtitle">
              More Wardrobe Categories Are Coming
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Coat patterns, backpacks, seasonal costumes, and more accessories
              will arrive as aligned artwork is completed.
            </ThemedText>
          </ThemedView>

        </ScrollView>

        <ThemedView
          type="backgroundElement"
          style={[styles.actionDock, { borderTopColor: theme.border }]}
        >
          {errorMessage ? (
            <ThemedText
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.errorMessage}
            >
              {errorMessage}
            </ThemedText>
          ) : statusMessage ? (
            <ThemedText
              accessibilityLiveRegion="polite"
              style={styles.successMessage}
            >
              {statusMessage}
            </ThemedText>
          ) : (
            <ThemedText
              accessibilityLiveRegion="polite"
              type="smallBold"
              style={
                purchaseShortfall > 0
                  ? styles.errorMessage
                  : previewPurchase ||
                      previewOutfitPurchase ||
                      hasUnsavedChanges
                    ? styles.unsavedMessage
                    : styles.successMessage
              }
            >
              {purchaseShortfall > 0
                ? `You need ${purchaseShortfall} more Lorcoins to buy this look.`
                : previewPurchase || previewOutfitPurchase
                  ? 'Preview only — finish the purchase or cancel it.'
                  : hasUnsavedChanges
                    ? 'Your changes have not been saved.'
                    : 'Your current look is saved.'}
            </ThemedText>
          )}

          <View style={styles.dockActions}>
            {previewPurchase ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled:
                    wallet === undefined ||
                    wallet === null ||
                    wallet.balance < previewPurchase.price,
                }}
                disabled={
                  wallet === undefined ||
                  wallet === null ||
                  wallet.balance < previewPurchase.price
                }
                onPress={openPurchaseConfirmation}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (wallet === undefined ||
                    wallet === null ||
                    wallet.balance < previewPurchase.price) &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.coinButtonCopy}>
                  <LorcoinIcon size={20} />
                  <ThemedText
                    style={styles.primaryButtonText}
                    type="smallBold"
                  >
                    Buy for {previewPurchase.price}
                  </ThemedText>
                </View>
              </Pressable>
            ) : previewOutfitPurchase ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled:
                    wallet === undefined ||
                    wallet === null ||
                    wallet.balance < previewOutfitPurchase.price,
                }}
                disabled={
                  wallet === undefined ||
                  wallet === null ||
                  wallet.balance < previewOutfitPurchase.price
                }
                onPress={openOutfitPurchaseConfirmation}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (wallet === undefined ||
                    wallet === null ||
                    wallet.balance < previewOutfitPurchase.price) &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.coinButtonCopy}>
                  <LorcoinIcon size={20} />
                  <ThemedText
                    style={styles.primaryButtonText}
                    type="smallBold"
                  >
                    Buy the Rest for {previewOutfitPurchase.price}
                  </ThemedText>
                </View>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  busy: saving,
                  disabled: saving || !hasUnsavedChanges,
                }}
                disabled={saving || !hasUnsavedChanges}
                onPress={saveAvatar}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (saving || !hasUnsavedChanges) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {saving ? (
                  <ActivityIndicator
                    accessibilityLabel="Saving avatar"
                    color={Palette.ink}
                    size="small"
                  />
                ) : (
                  <ThemedText
                    style={styles.primaryButtonText}
                    type="smallBold"
                  >
                    {hasUnsavedChanges ? 'Save Avatar' : 'Avatar Saved'}
                  </ThemedText>
                )}
              </Pressable>
            )}

            {previewPurchase || previewOutfitPurchase ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPreviewPurchase(null);
                  setPreviewOutfitPurchase(null);
                  setConfirmingPurchase(false);
                  setErrorMessage(null);
                }}
                style={({ pressed }) => [
                  styles.dockSecondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">Cancel Preview</ThemedText>
              </Pressable>
            ) : hasUnsavedChanges ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => updateSelection(savedSelection)}
                style={({ pressed }) => [
                  styles.dockSecondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">Undo</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={returnToPassport}
                style={({ pressed }) => [
                  styles.dockSecondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">Done</ThemedText>
              </Pressable>
            )}
          </View>
        </ThemedView>
      </SafeAreaView>

      <Modal
        animationType="fade"
        onRequestClose={() => setConfirmingPurchase(false)}
        transparent
        visible={confirmingPurchase && previewPurchase !== null}
      >
        <SafeAreaView style={styles.confirmationLayer}>
          {previewPurchase ? (
            <ThemedView
              accessibilityLabel={`Confirm purchase of ${previewPurchase.itemName} for ${previewPurchase.price} Lorcoins.`}
              accessibilityViewIsModal
              type="backgroundElement"
              style={styles.confirmationCard}
            >
              <ThemedText accessibilityRole="header" type="subtitle">
                Buy {previewPurchase.itemName}?
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                This will permanently add the item to your wardrobe and equip
                it in your current look.
              </ThemedText>
              <View style={styles.confirmationBalance}>
                <View style={styles.coinAmountRow}>
                  <LorcoinIcon size={28} />
                  <ThemedText type="smallBold">
                    Cost: {previewPurchase.price} Lorcoins
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Your balance after purchase:{' '}
                  {Math.max(
                    0,
                    (wallet?.balance ?? 0) - previewPurchase.price,
                  )}
                </ThemedText>
              </View>
              <View style={styles.purchaseActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: purchasingItemId === previewPurchase.itemId,
                    disabled: purchasingItemId !== null,
                  }}
                  disabled={purchasingItemId !== null}
                  onPress={() => void confirmPurchase()}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    purchasingItemId !== null && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {purchasingItemId === previewPurchase.itemId ? (
                    <ActivityIndicator
                      accessibilityLabel="Buying wardrobe item"
                      color={Palette.ink}
                      size="small"
                    />
                  ) : (
                    <View style={styles.coinButtonCopy}>
                      <LorcoinIcon size={20} />
                      <ThemedText
                        style={styles.primaryButtonText}
                        type="smallBold"
                      >
                        Yes, Spend {previewPurchase.price}
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={purchasingItemId !== null}
                  onPress={() => setConfirmingPurchase(false)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    purchasingItemId !== null && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold">No, Keep Previewing</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ) : null}
        </SafeAreaView>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setConfirmingPurchase(false)}
        transparent
        visible={confirmingPurchase && previewOutfitPurchase !== null}
      >
        <SafeAreaView style={styles.confirmationLayer}>
          {previewOutfitPurchase ? (
            <ThemedView
              accessibilityLabel={`Confirm purchase of the missing ${previewOutfitPurchase.outfitName} pieces for ${previewOutfitPurchase.price} Lorcoins.`}
              accessibilityViewIsModal
              type="backgroundElement"
              style={styles.confirmationCard}
            >
              <ThemedText accessibilityRole="header" type="subtitle">
                Complete {previewOutfitPurchase.outfitName}?
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                This buys only the pieces you do not already own:{' '}
                {previewOutfitPurchase.missingItemNames.join(', ')}.
              </ThemedText>
              <View style={styles.confirmationBalance}>
                <View style={styles.coinAmountRow}>
                  <LorcoinIcon size={28} />
                  <ThemedText type="smallBold">
                    Cost: {previewOutfitPurchase.price} Lorcoins
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Your balance after purchase:{' '}
                  {Math.max(
                    0,
                    (wallet?.balance ?? 0) - previewOutfitPurchase.price,
                  )}
                </ThemedText>
              </View>
              <View style={styles.purchaseActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    busy:
                      purchasingOutfitId === previewOutfitPurchase.outfitId,
                    disabled: purchasingOutfitId !== null,
                  }}
                  disabled={purchasingOutfitId !== null}
                  onPress={() => void confirmOutfitPurchase()}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    purchasingOutfitId !== null && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {purchasingOutfitId === previewOutfitPurchase.outfitId ? (
                    <ActivityIndicator
                      accessibilityLabel="Buying missing outfit pieces"
                      color={Palette.ink}
                      size="small"
                    />
                  ) : (
                    <View style={styles.coinButtonCopy}>
                      <LorcoinIcon size={20} />
                      <ThemedText
                        style={styles.primaryButtonText}
                        type="smallBold"
                      >
                        Yes, Spend {previewOutfitPurchase.price}
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={purchasingOutfitId !== null}
                  onPress={() => setConfirmingPurchase(false)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    purchasingOutfitId !== null && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold">
                    No, Keep Previewing
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ) : null}
        </SafeAreaView>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setConfirmingDiscard(false)}
        transparent
        visible={confirmingDiscard}
      >
        <SafeAreaView style={styles.confirmationLayer}>
          <ThemedView
            accessibilityLabel="Discard unsaved avatar changes?"
            accessibilityViewIsModal
            type="backgroundElement"
            style={styles.confirmationCard}
          >
            <ThemedText accessibilityRole="header" type="subtitle">
              Leave the Dressing Room?
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Your preview and unsaved changes will be lost.
            </ThemedText>
            <View style={styles.purchaseActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmingDiscard(false)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  style={styles.primaryButtonText}
                  type="smallBold"
                >
                  Keep Editing
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={discardAndReturnToPassport}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">Discard and Leave</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </SafeAreaView>
      </Modal>
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
    flex: 1,
    width: '100%',
  },
  fixedTopContent: {
    alignSelf: 'center',
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    width: '100%',
  },
  wardrobeScroll: {
    flex: 1,
    minHeight: 0,
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
    alignSelf: 'center',
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    width: '100%',
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingRight: Spacing.two,
  },
  walletChip: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  messageCard: {
    borderRadius: Spacing.four,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  previewCard: {
    alignItems: 'center',
    borderRadius: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'center',
    minHeight: 150,
    overflow: 'hidden',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  previewCopy: {
    flex: 1,
    gap: Spacing.one,
    maxWidth: 360,
  },
  purchasePreviewCard: {
    borderRadius: Spacing.four,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  purchaseDetailsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  coinAmountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  coinButtonCopy: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  purchaseActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  section: { gap: Spacing.three },
  economyCard: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    padding: Spacing.three,
  },
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
  lockedChoiceCard: {
    opacity: 0.62,
  },
  itemPrice: {
    color: '#9A6500',
  },
  confirmationLayer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.56)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  confirmationCard: {
    borderRadius: Spacing.four,
    gap: Spacing.three,
    maxWidth: 520,
    padding: Spacing.four,
    width: '100%',
  },
  confirmationBalance: {
    gap: Spacing.two,
  },
  comingSoonCard: {
    borderRadius: Spacing.four,
    gap: Spacing.two,
    padding: Spacing.four,
  },
  actionDock: {
    alignSelf: 'center',
    borderRadius: Spacing.four,
    borderTopWidth: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    paddingBottom: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    width: '100%',
  },
  dockActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dockSecondaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.teaGreen,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 50,
    minWidth: 92,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
  unsavedMessage: {
    color: '#9A6500',
    fontWeight: '700',
  },
  errorMessage: {
    color: Palette.danger,
    fontWeight: '700',
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
});
