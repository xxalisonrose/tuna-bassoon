import { useMutation, useQuery } from 'convex/react';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  Palette,
  PortalContentWidth,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  applyAvatarItem,
  avatarCategories,
  avatarItemOptions,
  standardAvatarSelection,
  type AvatarItemOption,
  type AvatarItemSlot,
} from '@/lib/avatar';
import {
  getAvatarItemFit,
  type AvatarFit,
  type AvatarFitOverrides,
} from '@/lib/avatar-fit';
import { api } from '../../../convex/_generated/api';

type FitItem = AvatarItemOption & {
  slot: AvatarItemSlot;
};

type AdjustableFitKey = keyof Pick<
  AvatarFit,
  'left' | 'top' | 'width' | 'height' | 'rotation'
>;

type FitHandle =
  | 'move'
  | 'north'
  | 'northEast'
  | 'east'
  | 'southEast'
  | 'south'
  | 'southWest'
  | 'west'
  | 'northWest';

type FitInteraction = {
  handle: FitHandle;
  pageX: number;
  pageY: number;
  startFit: AvatarFit;
};

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
  fitItems.find((item) => item.id === 'fire_tee') ?? fitItems[0];

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
        ]}>
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
        ]}>
        <ThemedText style={styles.adjustButtonText}>+</ThemedText>
      </Pressable>
    </View>
  );
}

function resizeAvatarFit({
  deltaX,
  deltaY,
  interaction,
  lockProportions,
}: {
  deltaX: number;
  deltaY: number;
  interaction: FitInteraction;
  lockProportions: boolean;
}) {
  const { handle, startFit } = interaction;
  const normalizedHandle = handle.toLowerCase();
  const movesNorth = normalizedHandle.includes('north');
  const movesSouth = normalizedHandle.includes('south');
  const movesWest = normalizedHandle.includes('west');
  const movesEast = normalizedHandle.includes('east');
  const isCorner = (movesNorth || movesSouth) && (movesWest || movesEast);

  if (handle === 'move') {
    return {
      ...startFit,
      left: roundFitValue(clamp(startFit.left + deltaX, -100, 150)),
      top: roundFitValue(clamp(startFit.top + deltaY, -100, 150)),
    };
  }

  let width = startFit.width;
  let height = startFit.height;

  if (movesEast) {
    width = startFit.width + deltaX;
  } else if (movesWest) {
    width = startFit.width - deltaX;
  }
  if (movesSouth) {
    height = startFit.height + deltaY;
  } else if (movesNorth) {
    height = startFit.height - deltaY;
  }

  if (isCorner && lockProportions) {
    const widthScale = width / startFit.width;
    const heightScale = height / startFit.height;
    const scale =
      Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
        ? widthScale
        : heightScale;
    const safeScale = clamp(
      scale,
      Math.max(4 / startFit.width, 4 / startFit.height),
      Math.min(150 / startFit.width, 150 / startFit.height),
    );
    width = startFit.width * safeScale;
    height = startFit.height * safeScale;
  } else {
    width = clamp(width, 4, 150);
    height = clamp(height, 4, 150);
  }

  return {
    ...startFit,
    height: roundFitValue(height),
    left: roundFitValue(
      movesWest ? startFit.left + startFit.width - width : startFit.left,
    ),
    top: roundFitValue(
      movesNorth ? startFit.top + startFit.height - height : startFit.top,
    ),
    width: roundFitValue(width),
  };
}

const resizeHandles: readonly Exclude<FitHandle, 'move'>[] = [
  'north',
  'northEast',
  'east',
  'southEast',
  'south',
  'southWest',
  'west',
  'northWest',
];

function getResizeHandleStyle(handle: Exclude<FitHandle, 'move'>) {
  switch (handle) {
    case 'north':
      return styles.handleNorth;
    case 'northEast':
      return styles.handleNorthEast;
    case 'east':
      return styles.handleEast;
    case 'southEast':
      return styles.handleSouthEast;
    case 'south':
      return styles.handleSouth;
    case 'southWest':
      return styles.handleSouthWest;
    case 'west':
      return styles.handleWest;
    case 'northWest':
      return styles.handleNorthWest;
  }
}

function AvatarFitTransformBox({
  fit,
  itemName,
  lockProportions,
  onFitChange,
  previewSize,
}: {
  fit: AvatarFit;
  itemName: string;
  lockProportions: boolean;
  onFitChange: (fit: AvatarFit) => void;
  previewSize: number;
}) {
  const interactionRef = useRef<FitInteraction | null>(null);

  const beginInteraction = (
    handle: FitHandle,
    event: GestureResponderEvent,
  ) => {
    event.stopPropagation();
    interactionRef.current = {
      handle,
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
      startFit: fit,
    };
  };

  const updateInteraction = (event: GestureResponderEvent) => {
    const interaction = interactionRef.current;

    if (!interaction) {
      return;
    }

    const deltaX =
      ((event.nativeEvent.pageX - interaction.pageX) / previewSize) * 100;
    const deltaY =
      ((event.nativeEvent.pageY - interaction.pageY) / previewSize) * 100;

    onFitChange(
      resizeAvatarFit({
        deltaX,
        deltaY,
        interaction,
        lockProportions,
      }),
    );
  };

  const finishInteraction = () => {
    interactionRef.current = null;
  };

  return (
    <View
      style={[
        styles.transformBox,
        {
          height: `${fit.height}%`,
          left: `${fit.left}%`,
          top: `${fit.top}%`,
          transform: [{ rotate: `${fit.rotation}deg` }],
          width: `${fit.width}%`,
        },
      ]}>
      <View
        accessibilityHint="Drag to move this clothing item over Scout."
        accessibilityLabel={`Move ${itemName}`}
        accessible
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => beginInteraction('move', event)}
        onResponderMove={updateInteraction}
        onResponderRelease={finishInteraction}
        onResponderTerminate={finishInteraction}
        onStartShouldSetResponder={() => true}
        style={styles.moveIndicator}
      />
      {resizeHandles.map((handle) => (
        <View
          key={handle}
          accessibilityLabel={`Resize ${itemName} from ${handle}`}
          accessibilityRole="adjustable"
          accessible
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(event) => beginInteraction(handle, event)}
          onResponderMove={updateInteraction}
          onResponderRelease={finishInteraction}
          onResponderTerminate={finishInteraction}
          onStartShouldSetResponder={() => true}
          style={[styles.resizeHandle, getResizeHandleStyle(handle)]}
        />
      ))}
    </View>
  );
}

export function AvatarFittingLab() {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const previewSize = Math.min(520, Math.max(280, windowWidth - 96));
  const savedFits = useQuery(api.avatarArt.getAvatarItemFits) ?? {};
  const saveAvatarItemFit = useMutation(api.avatarArt.saveAvatarItemFit);
  const resetAvatarItemFit = useMutation(api.avatarArt.resetAvatarItemFit);
  const [optimisticSavedFits, setOptimisticSavedFits] =
    useState<AvatarFitOverrides>({});
  const [draftFits, setDraftFits] = useState<AvatarFitOverrides>({});
  const [activeSlot, setActiveSlot] = useState<AvatarItemSlot>(
    initialItem.slot,
  );
  const [selectedItemId, setSelectedItemId] = useState(initialItem.id);
  const [showGrid, setShowGrid] = useState(true);
  const [lockProportions, setLockProportions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedItem =
    fitItems.find((item) => item.id === selectedItemId) ?? initialItem;
  const effectiveSavedFits = {
    ...savedFits,
    ...optimisticSavedFits,
  };
  const allFitOverrides = {
    ...effectiveSavedFits,
    ...draftFits,
  };
  const selectedFit = getAvatarItemFit(selectedItem.id, allFitOverrides);
  const visibleItems = fitItems.filter((item) => item.slot === activeSlot);
  const previewSelection = applyAvatarItem(
    standardAvatarSelection,
    selectedItem.slot,
    selectedItem.id,
  );
  const selectedHasDraft = draftFits[selectedItem.id] !== undefined;

  if (!selectedFit) {
    return null;
  }

  const updateSelectedFit = (fit: AvatarFit) => {
    setDraftFits((current) => ({ ...current, [selectedItem.id]: fit }));
    setStatus(null);
    setError(null);
  };

  const adjustFit = (key: AdjustableFitKey, amount: number) => {
    const minimum = key === 'width' || key === 'height' ? 4 : -100;
    const maximum = key === 'rotation' ? 180 : 150;

    updateSelectedFit({
      ...selectedFit,
      [key]: roundFitValue(
        clamp(selectedFit[key] + amount, minimum, maximum),
      ),
    });
  };

  const saveCurrentFit = async () => {
    setSaving(true);
    setStatus(null);
    setError(null);

    try {
      const result = await saveAvatarItemFit({
        itemId: selectedItem.id,
        ...selectedFit,
      });
      setOptimisticSavedFits((current) => ({
        ...current,
        [selectedItem.id]: result.fit,
      }));
      setDraftFits((current) => {
        const next = { ...current };
        delete next[selectedItem.id];
        return next;
      });
      setStatus(`${selectedItem.name} saved. The app now uses this fit.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'The clothing fit could not be saved.',
      );
    } finally {
      setSaving(false);
    }
  };

  const resetCurrentFit = async () => {
    setSaving(true);
    setStatus(null);
    setError(null);

    try {
      await resetAvatarItemFit({ itemId: selectedItem.id });
      setOptimisticSavedFits((current) => {
        const next = { ...current };
        delete next[selectedItem.id];
        return next;
      });
      setDraftFits((current) => {
        const next = { ...current };
        delete next[selectedItem.id];
        return next;
      });
      setStatus(
        `${selectedItem.name} reset to the full 1254 × 1254 template.`,
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'The clothing fit could not be reset.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <ThemedText type="subtitle" style={styles.title}>
            Clothing Fit Editor
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Correct 1254 × 1254 artwork starts at full size. Move or resize only
            an item that was exported incorrectly, then press Save Fit.
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowGrid((current) => !current)}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}>
          <ThemedText style={styles.buttonText}>
            {showGrid ? 'Hide Grid' : 'Show Grid'}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.categoryTabs}>
        {avatarCategories
          .filter((category) =>
            fitItems.some((item) => item.slot === category.id),
          )
          .map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeSlot === category.id }}
              onPress={() => {
                const item = fitItems.find(
                  (candidate) => candidate.slot === category.id,
                );
                if (item) {
                  setActiveSlot(item.slot);
                  setSelectedItemId(item.id);
                  setStatus(null);
                  setError(null);
                }
              }}
              style={({ pressed }) => [
                styles.categoryTab,
                activeSlot === category.id && styles.categoryTabSelected,
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={
                  activeSlot === category.id
                    ? styles.selectedButtonText
                    : undefined
                }>
                {category.label}
              </ThemedText>
            </Pressable>
          ))}
      </View>

      <View style={styles.itemList}>
        {visibleItems.map((item) => {
          const adjusted =
            draftFits[item.id] !== undefined ||
            effectiveSavedFits[item.id] !== undefined;

          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedItem.id === item.id }}
              onPress={() => {
                setSelectedItemId(item.id);
                setStatus(null);
                setError(null);
              }}
              style={({ pressed }) => [
                styles.itemButton,
                { borderColor: theme.border },
                selectedItem.id === item.id && styles.itemButtonSelected,
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={
                  selectedItem.id === item.id
                    ? styles.selectedButtonText
                    : undefined
                }>
                {item.name}
              </ThemedText>
              {adjusted ? <View style={styles.adjustedDot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.workspace}>
        <View style={styles.previewColumn}>
          <View style={{ height: previewSize, width: previewSize }}>
            <AvatarPreview
              fitOverrides={allFitOverrides}
              selection={previewSelection}
              showFitGuides={showGrid}
              size={previewSize}
            />
            <AvatarFitTransformBox
              key={selectedItem.id}
              fit={selectedFit}
              itemName={selectedItem.name}
              lockProportions={lockProportions}
              onFitChange={updateSelectedFit}
              previewSize={previewSize}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Drag inside the outline to move. Drag its handles to resize.
          </ThemedText>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: lockProportions }}
            onPress={() => setLockProportions((current) => !current)}
            style={({ pressed }) => [
              styles.proportionToggle,
              lockProportions && styles.proportionToggleSelected,
              pressed && styles.pressed,
            ]}>
            <ThemedText
              type="smallBold"
              style={lockProportions ? styles.selectedButtonText : undefined}>
              {lockProportions ? '✓ ' : ''}Keep proportions
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.controlColumn}>
          <ThemedText type="subtitle">{selectedItem.name}</ThemedText>
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
              accessibilityState={{ busy: saving, disabled: saving }}
              disabled={saving}
              onPress={() => void saveCurrentFit()}
              style={({ pressed }) => [
                styles.primaryButton,
                saving && styles.disabledButton,
                pressed && styles.pressed,
              ]}>
              {saving ? (
                <ActivityIndicator color={Palette.ink} />
              ) : (
                <ThemedText style={styles.buttonText}>
                  {selectedHasDraft ? 'Save Fit' : 'Save Fit'}
                </ThemedText>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={() => void resetCurrentFit()}
              style={({ pressed }) => [
                styles.secondaryButton,
                saving && styles.disabledButton,
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.buttonText}>
                Reset to 1254 Template
              </ThemedText>
            </Pressable>
          </View>

          {status ? (
            <ThemedText accessibilityLiveRegion="polite" style={styles.success}>
              {status}
            </ThemedText>
          ) : null}
          {error ? (
            <ThemedText accessibilityLiveRegion="assertive" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <View style={styles.mapPreviewRow}>
            <View style={styles.mapPreviewCopy}>
              <ThemedText type="smallBold">Map-size check</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Saved adjustments apply here and everywhere Scout appears.
              </ThemedText>
            </View>
            <AvatarPreview
              fitOverrides={allFitOverrides}
              selection={previewSelection}
              size={92}
            />
          </View>
        </View>
      </View>

      <ThemedText themeColor="textSecondary">
        There is no export step and no masking step. Save Fit publishes the
        selected item’s position and size directly to the app.
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
  selectedButtonText: {
    color: Palette.ink,
  },
  itemList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  itemButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.one,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  itemButtonSelected: {
    backgroundColor: Palette.teaGreen,
    borderColor: Palette.borderStrong,
  },
  adjustedDot: {
    backgroundColor: Palette.lightBronze,
    borderRadius: 5,
    height: 10,
    width: 10,
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
  transformBox: {
    borderColor: Palette.cornsilk,
    borderStyle: 'dashed',
    borderWidth: 2,
    position: 'absolute',
  },
  moveIndicator: {
    backgroundColor: 'rgba(254, 250, 224, 0.12)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  resizeHandle: {
    backgroundColor: Palette.cornsilk,
    borderColor: Palette.bronzeDeep,
    borderRadius: 3,
    borderWidth: 2,
    height: 18,
    position: 'absolute',
    width: 18,
    zIndex: 2,
  },
  handleNorth: { left: '50%', marginLeft: -9, top: -10 },
  handleNorthEast: { right: -10, top: -10 },
  handleEast: { marginTop: -9, right: -10, top: '50%' },
  handleSouthEast: { bottom: -10, right: -10 },
  handleSouth: { bottom: -10, left: '50%', marginLeft: -9 },
  handleSouthWest: { bottom: -10, left: -10 },
  handleWest: { left: -10, marginTop: -9, top: '50%' },
  handleNorthWest: { left: -10, top: -10 },
  proportionToggle: {
    borderColor: Palette.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  proportionToggleSelected: {
    backgroundColor: Palette.lightBronze,
  },
  controlColumn: {
    flex: 1,
    gap: Spacing.two,
    minWidth: 280,
  },
  controlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  controlLabel: {
    flex: 1,
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
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.lightBronze,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.four,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.teaGreen,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  buttonText: {
    color: Palette.ink,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
  success: {
    color: '#2E7D32',
  },
  error: {
    color: '#B42318',
  },
  mapPreviewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  mapPreviewCopy: {
    flex: 1,
    gap: Spacing.half,
  },
});
