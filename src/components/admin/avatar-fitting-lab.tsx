import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  useWindowDimensions,
} from 'react-native';

import { AvatarPreview } from '@/components/avatar-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  MaxContentWidth,
  Palette,
  PortalContentWidth,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  applyAvatarItem,
  avatarCategories,
  avatarItemOptions,
  trailBasicsSelection,
  type AvatarItemOption,
  type AvatarItemSlot,
} from '@/lib/avatar';
import {
  getAvatarItemFit,
  type AvatarFit,
  type AvatarFitOverrides,
} from '@/lib/avatar-fit';

type FitItem = AvatarItemOption & {
  slot: AvatarItemSlot;
};

type AdjustableFitKey = keyof Pick<
  AvatarFit,
  'left' | 'top' | 'width' | 'height' | 'rotation'
>;

const fitItems: FitItem[] = Object.entries(avatarItemOptions).flatMap(
  ([slot, items]) =>
    items
      .filter((item) => getAvatarItemFit(item.id) !== undefined)
      .map((item) => ({
        ...item,
        slot: slot as AvatarItemSlot,
      })),
);

const initialItem =
  fitItems.find((item) => item.id === 'winter_polka_sweater') ?? fitItems[0];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundFitValue(value: number) {
  return Math.round(value * 10) / 10;
}

function FitControl({
  label,
  onDecrease,
  onIncrease,
  value,
}: {
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
  value: string;
}) {
  return (
    <View style={styles.controlRow}>
      <ThemedText type="smallBold" style={styles.controlLabel}>
        {label}
      </ThemedText>
      <Pressable
        accessibilityLabel={`Decrease ${label}`}
        accessibilityRole="button"
        onPress={onDecrease}
        style={({ pressed }) => [
          styles.adjustButton,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.adjustButtonText}>−</ThemedText>
      </Pressable>
      <ThemedText type="code" style={styles.controlValue}>
        {value}
      </ThemedText>
      <Pressable
        accessibilityLabel={`Increase ${label}`}
        accessibilityRole="button"
        onPress={onIncrease}
        style={({ pressed }) => [
          styles.adjustButton,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.adjustButtonText}>+</ThemedText>
      </Pressable>
    </View>
  );
}

export function AvatarFittingLab() {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const previewSize = Math.min(520, Math.max(280, windowWidth - 96));
  const [activeSlot, setActiveSlot] = useState<AvatarItemSlot>(
    initialItem.slot,
  );
  const [selectedItemId, setSelectedItemId] = useState(initialItem.id);
  const [fitOverrides, setFitOverrides] = useState<AvatarFitOverrides>({});
  const [showGrid, setShowGrid] = useState(true);
  const [dragOffset, setDragOffset] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const selectedItem =
    fitItems.find((item) => item.id === selectedItemId) ?? initialItem;
  const selectedFit = getAvatarItemFit(selectedItem.id, fitOverrides);
  const visibleItems = fitItems.filter((item) => item.slot === activeSlot);
  const previewSelection = applyAvatarItem(
    trailBasicsSelection,
    selectedItem.slot,
    selectedItem.id,
  );

  const updateCurrentFit = (updater: (currentFit: AvatarFit) => AvatarFit) => {
    setFitOverrides((currentOverrides) => {
      const currentFit = getAvatarItemFit(selectedItem.id, currentOverrides);

      if (!currentFit) {
        return currentOverrides;
      }

      return {
        ...currentOverrides,
        [selectedItem.id]: updater(currentFit),
      };
    });
  };

  const adjustFit = (key: AdjustableFitKey, amount: number) => {
    updateCurrentFit((currentFit) => {
      const minimum = key === 'width' || key === 'height' ? 4 : -100;
      const maximum = key === 'rotation' ? 180 : 150;

      return {
        ...currentFit,
        [key]: roundFitValue(clamp(currentFit[key] + amount, minimum, maximum)),
      };
    });
  };

  const startDragging = (event: GestureResponderEvent) => {
    if (!selectedFit) {
      return;
    }

    const touchLeft = (event.nativeEvent.locationX / previewSize) * 100;
    const touchTop = (event.nativeEvent.locationY / previewSize) * 100;

    setDragOffset({
      left: touchLeft - selectedFit.left,
      top: touchTop - selectedFit.top,
    });
  };

  const moveSelectedItem = (event: GestureResponderEvent) => {
    if (!dragOffset) {
      return;
    }

    const touchLeft = (event.nativeEvent.locationX / previewSize) * 100;
    const touchTop = (event.nativeEvent.locationY / previewSize) * 100;

    updateCurrentFit((currentFit) => ({
      ...currentFit,
      left: roundFitValue(clamp(touchLeft - dragOffset.left, -100, 150)),
      top: roundFitValue(clamp(touchTop - dragOffset.top, -100, 150)),
    }));
  };

  const selectItem = (item: FitItem) => {
    setActiveSlot(item.slot);
    setSelectedItemId(item.id);
  };

  const resetCurrentFit = () => {
    setFitOverrides((currentOverrides) => {
      const nextOverrides = { ...currentOverrides };
      delete nextOverrides[selectedItem.id];
      return nextOverrides;
    });
  };

  if (!selectedFit) {
    return null;
  }

  const fitSnippet = `${selectedItem.id}: { left: ${selectedFit.left}, top: ${selectedFit.top}, width: ${selectedFit.width}, height: ${selectedFit.height}, rotation: ${selectedFit.rotation} }`;

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.container, { borderColor: theme.border }]}
    >
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <ThemedText type="subtitle" style={styles.title}>
            Avatar Fitting Lab
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Choose an item, drag it over the cow, then use the fine controls.
            The grid and outlined box make screenshots easy to compare.
          </ThemedText>
        </View>
        <Pressable
          accessibilityLabel={
            showGrid ? 'Hide fitting grid' : 'Show fitting grid'
          }
          accessibilityRole="button"
          onPress={() => setShowGrid((currentValue) => !currentValue)}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.buttonText}>
            {showGrid ? 'Hide Grid' : 'Show Grid'}
          </ThemedText>
        </Pressable>
      </View>

      <View
        accessibilityLabel="Avatar fitting categories"
        accessibilityRole="tablist"
        style={styles.categoryTabs}
      >
        {avatarCategories
          .filter(
            (category) =>
              category.id !== 'outfits' &&
              fitItems.some((item) => item.slot === category.id),
          )
          .map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="tab"
              accessibilityState={{
                selected: activeSlot === category.id,
              }}
              onPress={() => {
                const nextItem = fitItems.find(
                  (item) => item.slot === category.id,
                );

                if (nextItem) {
                  selectItem(nextItem);
                }
              }}
              style={({ pressed }) => [
                styles.categoryTab,
                activeSlot === category.id && styles.categoryTabSelected,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={
                  activeSlot === category.id
                    ? styles.selectedButtonText
                    : undefined
                }
              >
                {category.label}
              </ThemedText>
            </Pressable>
          ))}
      </View>

      <View style={styles.itemList}>
        {visibleItems.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{
              selected: selectedItem.id === item.id,
            }}
            onPress={() => selectItem(item)}
            style={({ pressed }) => [
              styles.itemButton,
              { borderColor: theme.border },
              selectedItem.id === item.id && styles.itemButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="smallBold"
              style={
                selectedItem.id === item.id
                  ? styles.selectedButtonText
                  : undefined
              }
            >
              {item.name}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.workspace}>
        <View style={styles.previewColumn}>
          <View
            style={{
              height: previewSize,
              width: previewSize,
            }}
          >
            <AvatarPreview
              fitOverrides={fitOverrides}
              highlightedItemId={selectedItem.id}
              selection={previewSelection}
              showFitGuides={showGrid}
              size={previewSize}
            />
            <View
              accessibilityHint="Drag in any direction to move the selected item."
              accessibilityLabel={`Move ${selectedItem.name}`}
              accessible
              onMoveShouldSetResponder={() => true}
              onResponderGrant={startDragging}
              onResponderMove={moveSelectedItem}
              onResponderRelease={() => setDragOffset(null)}
              onResponderTerminate={() => setDragOffset(null)}
              onStartShouldSetResponder={() => true}
              style={styles.dragSurface}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Drag anywhere on the preview to move {selectedItem.name}.
          </ThemedText>
        </View>

        <View style={styles.controlColumn}>
          <ThemedText type="subtitle" style={styles.itemTitle}>
            {selectedItem.name}
          </ThemedText>
          <FitControl
            label="Horizontal"
            onDecrease={() => adjustFit('left', -1)}
            onIncrease={() => adjustFit('left', 1)}
            value={`${selectedFit.left.toFixed(1)}%`}
          />
          <FitControl
            label="Vertical"
            onDecrease={() => adjustFit('top', -1)}
            onIncrease={() => adjustFit('top', 1)}
            value={`${selectedFit.top.toFixed(1)}%`}
          />
          <FitControl
            label="Width"
            onDecrease={() => adjustFit('width', -1)}
            onIncrease={() => adjustFit('width', 1)}
            value={`${selectedFit.width.toFixed(1)}%`}
          />
          <FitControl
            label="Height"
            onDecrease={() => adjustFit('height', -1)}
            onIncrease={() => adjustFit('height', 1)}
            value={`${selectedFit.height.toFixed(1)}%`}
          />
          <FitControl
            label="Rotation"
            onDecrease={() => adjustFit('rotation', -1)}
            onIncrease={() => adjustFit('rotation', 1)}
            value={`${selectedFit.rotation.toFixed(1)}°`}
          />

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={resetCurrentFit}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.buttonText}>Reset This Item</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFitOverrides({})}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.buttonText}>Reset All</ThemedText>
            </Pressable>
          </View>

          <ThemedView type="background" style={styles.valueCard}>
            <ThemedText type="smallBold">Fit values</ThemedText>
            <ThemedText selectable type="code" style={styles.fitSnippet}>
              {fitSnippet}
            </ThemedText>
          </ThemedView>

          <View style={styles.mapPreviewRow}>
            <View>
              <ThemedText type="smallBold">Map-size check</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Confirms the silhouette at the size explorers see.
              </ThemedText>
            </View>
            <AvatarPreview
              fitOverrides={fitOverrides}
              selection={previewSelection}
              size={92}
            />
          </View>
        </View>
      </View>

      <ThemedText themeColor="textSecondary" style={styles.note}>
        This lab previews fit values only; it does not spend Lorcoins or change
        any tester&apos;s saved avatar. Share a screenshot or the fit-values
        line when an item looks right, then the approved values can be committed
        for everyone.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.three,
    maxWidth: PortalContentWidth,
    padding: Spacing.four,
    width: '100%',
  },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  headingCopy: {
    flex: 1,
    gap: Spacing.one,
    minWidth: 260,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
  },
  categoryTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  categoryTab: {
    borderRadius: 999,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  categoryTabSelected: {
    backgroundColor: Palette.lightBronze,
  },
  itemList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  itemButton: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  itemButtonSelected: {
    backgroundColor: Palette.teaGreen,
    borderColor: Palette.borderStrong,
  },
  selectedButtonText: {
    color: Palette.ink,
  },
  workspace: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
  previewColumn: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  dragSurface: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  controlColumn: {
    flex: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    minWidth: 280,
  },
  itemTitle: {
    fontSize: 24,
    lineHeight: 32,
  },
  controlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  controlLabel: {
    flex: 1,
    minWidth: 92,
  },
  adjustButton: {
    alignItems: 'center',
    backgroundColor: Palette.teaGreen,
    borderRadius: Spacing.one,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  adjustButtonText: {
    color: Palette.ink,
    fontSize: 24,
    lineHeight: 28,
  },
  controlValue: {
    minWidth: 72,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.teaGreen,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  buttonText: {
    color: Palette.ink,
    textAlign: 'center',
  },
  valueCard: {
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  fitSnippet: {
    lineHeight: 18,
  },
  mapPreviewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  note: {
    maxWidth: MaxContentWidth,
  },
  pressed: {
    opacity: 0.8,
  },
});
