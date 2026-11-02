import { useEffect, useRef, useState } from 'react';
import {
  Platform,
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
import { exportAvatarFitBatch } from '@/lib/avatar-fit-export';
import {
  isAvatarMaskStamp,
  type AvatarMaskOverrides,
  type AvatarMaskStamp,
} from '@/lib/avatar-mask';

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
  fitItems.find((item) => item.id === 'winter_polka_sweater') ?? fitItems[0];

const fitBatchStorageKey = 'lorcal.avatar-fitting-batch.v1';
const maskBatchStorageKey = 'lorcal.avatar-fitting-masks.v1';
const avatarFitKeys: readonly (keyof AvatarFit)[] = [
  'left',
  'top',
  'width',
  'height',
  'rotation',
];

function readStoredFitOverrides(): AvatarFitOverrides {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(fitBatchStorageKey);

    if (!storedValue) {
      return {};
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (
      !parsedValue ||
      typeof parsedValue !== 'object' ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    const storedOverrides: AvatarFitOverrides = {};

    for (const [itemId, storedFit] of Object.entries(parsedValue)) {
      const defaultFit = getAvatarItemFit(itemId);

      if (
        !defaultFit ||
        !storedFit ||
        typeof storedFit !== 'object' ||
        Array.isArray(storedFit)
      ) {
        continue;
      }

      const fitRecord = storedFit as Record<string, unknown>;
      const restoredFit = { ...defaultFit };
      const isCompleteFit = avatarFitKeys.every((key) => {
        const value = fitRecord[key];

        if (typeof value !== 'number' || !Number.isFinite(value)) {
          return false;
        }

        restoredFit[key] = value;
        return true;
      });

      if (isCompleteFit) {
        storedOverrides[itemId] = restoredFit;
      }
    }

    return storedOverrides;
  } catch {
    return {};
  }
}

function storeFitOverrides(fitOverrides: AvatarFitOverrides) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  try {
    if (Object.keys(fitOverrides).length === 0) {
      window.localStorage.removeItem(fitBatchStorageKey);
      return;
    }

    window.localStorage.setItem(
      fitBatchStorageKey,
      JSON.stringify(fitOverrides),
    );
  } catch {
    // The fitting lab still works in memory when browser storage is disabled.
  }
}

function readStoredMaskOverrides(): AvatarMaskOverrides {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(maskBatchStorageKey);

    if (!storedValue) {
      return {};
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (
      !parsedValue ||
      typeof parsedValue !== 'object' ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue)
        .filter(
          ([itemId, stamps]) =>
            getAvatarItemFit(itemId) !== undefined && Array.isArray(stamps),
        )
        .map(([itemId, stamps]) => [
          itemId,
          (stamps as unknown[]).filter(isAvatarMaskStamp),
        ])
        .filter(([, stamps]) => stamps.length > 0),
    );
  } catch {
    return {};
  }
}

function storeMaskOverrides(maskOverrides: AvatarMaskOverrides) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  try {
    if (Object.keys(maskOverrides).length === 0) {
      window.localStorage.removeItem(maskBatchStorageKey);
      return;
    }

    window.localStorage.setItem(
      maskBatchStorageKey,
      JSON.stringify(maskOverrides),
    );
  } catch {
    // Mask painting still works in memory when browser storage is disabled.
  }
}

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
    const minimumScale = Math.max(4 / startFit.width, 4 / startFit.height);
    const maximumScale = Math.min(150 / startFit.width, 150 / startFit.height);
    const safeScale = clamp(scale, minimumScale, maximumScale);
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
      ]}
    >
      <View
        accessibilityHint="Drag to move this clothing item over the avatar."
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

function AvatarMaskCanvas({
  brushSize,
  fit,
  itemName,
  onStamp,
  previewSize,
  stamps,
}: {
  brushSize: number;
  fit: AvatarFit;
  itemName: string;
  onStamp: (stamp: AvatarMaskStamp) => void;
  previewSize: number;
  stamps: AvatarMaskStamp[];
}) {
  const lastPointRef = useRef<{ pageX: number; pageY: number } | null>(null);
  const fittedWidth = (fit.width / 100) * previewSize;
  const fittedHeight = (fit.height / 100) * previewSize;

  const paintStamp = (event: GestureResponderEvent) => {
    const { locationX, locationY, pageX, pageY } = event.nativeEvent;
    const lastPoint = lastPointRef.current;

    if (
      lastPoint &&
      Math.hypot(pageX - lastPoint.pageX, pageY - lastPoint.pageY) <
        brushSize * 0.3
    ) {
      return;
    }

    lastPointRef.current = { pageX, pageY };
    onStamp({
      radiusX: (brushSize / 2 / fittedWidth) * 100,
      radiusY: (brushSize / 2 / fittedHeight) * 100,
      x: clamp((locationX / fittedWidth) * 100, 0, 100),
      y: clamp((locationY / fittedHeight) * 100, 0, 100),
    });
  };

  const finishPainting = () => {
    lastPointRef.current = null;
  };

  return (
    <View
      style={[
        styles.transformBox,
        styles.maskBox,
        {
          height: `${fit.height}%`,
          left: `${fit.left}%`,
          top: `${fit.top}%`,
          transform: [{ rotate: `${fit.rotation}deg` }],
          width: `${fit.width}%`,
        },
      ]}
    >
      <View
        accessibilityHint="Drag over garment areas that should become transparent."
        accessibilityLabel={`Paint hidden areas on ${itemName}`}
        accessible
        onMoveShouldSetResponder={() => true}
        onResponderGrant={paintStamp}
        onResponderMove={paintStamp}
        onResponderRelease={finishPainting}
        onResponderTerminate={finishPainting}
        onStartShouldSetResponder={() => true}
        style={styles.maskPaintArea}
      />
      {stamps.map((stamp, index) => (
        <View
          key={`${stamp.x}-${stamp.y}-${index}`}
          pointerEvents="none"
          style={[
            styles.maskStamp,
            {
              height: `${stamp.radiusY * 2}%`,
              left: `${stamp.x - stamp.radiusX}%`,
              top: `${stamp.y - stamp.radiusY}%`,
              width: `${stamp.radiusX * 2}%`,
            },
          ]}
        />
      ))}
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
  const [fitOverrides, setFitOverrides] = useState<AvatarFitOverrides>(
    readStoredFitOverrides,
  );
  const [maskOverrides, setMaskOverrides] = useState<AvatarMaskOverrides>(
    readStoredMaskOverrides,
  );
  const [workspaceMode, setWorkspaceMode] = useState<'fit' | 'mask'>('fit');
  const [brushSize, setBrushSize] = useState(28);
  const [showGrid, setShowGrid] = useState(true);
  const [lockProportions, setLockProportions] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const selectedItem =
    fitItems.find((item) => item.id === selectedItemId) ?? initialItem;
  const selectedFit = getAvatarItemFit(selectedItem.id, fitOverrides);
  const visibleItems = fitItems.filter((item) => item.slot === activeSlot);
  const previewSelection = applyAvatarItem(
    trailBasicsSelection,
    selectedItem.slot,
    selectedItem.id,
  );
  const selectedMaskStamps = maskOverrides[selectedItem.id] ?? [];
  const changedItemIds = [
    ...new Set([
      ...Object.keys(fitOverrides),
      ...Object.entries(maskOverrides)
        .filter(([, stamps]) => (stamps?.length ?? 0) > 0)
        .map(([itemId]) => itemId),
    ]),
  ];

  useEffect(() => {
    storeFitOverrides(fitOverrides);
  }, [fitOverrides]);

  useEffect(() => {
    storeMaskOverrides(maskOverrides);
  }, [maskOverrides]);

  const updateCurrentFit = (updater: (currentFit: AvatarFit) => AvatarFit) => {
    setExportStatus(null);
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
    setExportStatus(null);
  };

  const updateSelectedFit = (fit: AvatarFit) => {
    setFitOverrides((currentOverrides) => ({
      ...currentOverrides,
      [selectedItem.id]: fit,
    }));
    setExportStatus(null);
  };

  const addMaskStamp = (stamp: AvatarMaskStamp) => {
    setMaskOverrides((currentOverrides) => ({
      ...currentOverrides,
      [selectedItem.id]: [...(currentOverrides[selectedItem.id] ?? []), stamp],
    }));
    setExportStatus(null);
  };

  const undoMaskStamp = () => {
    setMaskOverrides((currentOverrides) => {
      const nextStamps = (currentOverrides[selectedItem.id] ?? []).slice(0, -1);
      const nextOverrides = { ...currentOverrides };

      if (nextStamps.length > 0) {
        nextOverrides[selectedItem.id] = nextStamps;
      } else {
        delete nextOverrides[selectedItem.id];
      }

      return nextOverrides;
    });
    setExportStatus(null);
  };

  const clearCurrentMask = () => {
    setMaskOverrides((currentOverrides) => {
      const nextOverrides = { ...currentOverrides };
      delete nextOverrides[selectedItem.id];
      return nextOverrides;
    });
    setExportStatus(null);
  };

  const exportBatch = async () => {
    setIsExporting(true);
    setExportStatus('Preparing export...');

    try {
      const result = await exportAvatarFitBatch({
        changedItemIds,
        fitOverrides,
        maskOverrides,
        onProgress: setExportStatus,
      });
      setExportStatus(
        `Downloaded ${result.fileName} with ${result.itemCount} adjusted ${result.itemCount === 1 ? 'item' : 'items'}.`,
      );
    } catch (error) {
      setExportStatus(
        error instanceof Error
          ? error.message
          : 'The avatar fitting batch could not be exported.',
      );
    } finally {
      setIsExporting(false);
    }
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
            Choose an item, drag its outlined box to move it, and drag the
            square handles to resize it. Your edits stay in a batch while you
            work through other items.
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
            {fitOverrides[item.id] ||
            (maskOverrides[item.id]?.length ?? 0) > 0 ? (
              <View
                accessibilityLabel="Edited in this batch"
                style={styles.adjustedDot}
              />
            ) : null}
          </Pressable>
        ))}
      </View>

      <View
        accessibilityLabel="Avatar editing mode"
        accessibilityRole="tablist"
        style={styles.modeTabs}
      >
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: workspaceMode === 'fit' }}
          onPress={() => setWorkspaceMode('fit')}
          style={({ pressed }) => [
            styles.modeTab,
            workspaceMode === 'fit' && styles.modeTabSelected,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText
            type="smallBold"
            style={
              workspaceMode === 'fit' ? styles.selectedButtonText : undefined
            }
          >
            Fit & Resize
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: workspaceMode === 'mask' }}
          onPress={() => setWorkspaceMode('mask')}
          style={({ pressed }) => [
            styles.modeTab,
            workspaceMode === 'mask' && styles.modeTabSelected,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText
            type="smallBold"
            style={
              workspaceMode === 'mask' ? styles.selectedButtonText : undefined
            }
          >
            Mask Hidden Areas
          </ThemedText>
        </Pressable>
      </View>

      <ThemedView type="background" style={styles.batchBar}>
        <View style={styles.batchCopy}>
          <ThemedText type="smallBold">
            Working batch: {changedItemIds.length} edited{' '}
            {changedItemIds.length === 1 ? 'item' : 'items'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {Platform.OS === 'web'
              ? 'Auto-saved in this browser. Switch items, sections, or refresh without losing the batch.'
              : 'Switch categories freely. The batch remains available during this session.'}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled:
              changedItemIds.length === 0 ||
              isExporting ||
              Platform.OS !== 'web',
          }}
          disabled={
            changedItemIds.length === 0 || isExporting || Platform.OS !== 'web'
          }
          onPress={() => void exportBatch()}
          style={({ pressed }) => [
            styles.primaryButton,
            (changedItemIds.length === 0 ||
              isExporting ||
              Platform.OS !== 'web') &&
              styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.buttonText}>
            {isExporting
              ? 'Building Export...'
              : Platform.OS === 'web'
                ? 'Export Batch ZIP'
                : 'Export on Web'}
          </ThemedText>
        </Pressable>
        {exportStatus ? (
          <ThemedText
            accessibilityLiveRegion="polite"
            style={styles.exportStatus}
            type="small"
            themeColor="textSecondary"
          >
            {exportStatus}
          </ThemedText>
        ) : null}
      </ThemedView>

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
              selection={previewSelection}
              showFitGuides={showGrid}
              size={previewSize}
            />
            {workspaceMode === 'fit' ? (
              <AvatarFitTransformBox
                key={selectedItem.id}
                fit={selectedFit}
                itemName={selectedItem.name}
                lockProportions={lockProportions}
                onFitChange={updateSelectedFit}
                previewSize={previewSize}
              />
            ) : (
              <AvatarMaskCanvas
                key={selectedItem.id}
                brushSize={brushSize}
                fit={selectedFit}
                itemName={selectedItem.name}
                onStamp={addMaskStamp}
                previewSize={previewSize}
                stamps={selectedMaskStamps}
              />
            )}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {workspaceMode === 'fit'
              ? 'Drag inside the box to move. Drag its corners or edges to resize.'
              : 'Paint red over garment pixels that should disappear behind the cow. The ZIP preview applies the real transparency.'}
          </ThemedText>
          {workspaceMode === 'fit' ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: lockProportions }}
              onPress={() =>
                setLockProportions((currentValue) => !currentValue)
              }
              style={({ pressed }) => [
                styles.proportionToggle,
                lockProportions && styles.proportionToggleSelected,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={lockProportions ? styles.selectedButtonText : undefined}
              >
                {lockProportions ? '✓ ' : ''}Keep corner proportions
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.controlColumn}>
          <ThemedText type="subtitle" style={styles.itemTitle}>
            {selectedItem.name}
          </ThemedText>
          {workspaceMode === 'fit' ? (
            <>
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
            </>
          ) : (
            <>
              <ThemedText themeColor="textSecondary">
                Use a small brush around necklines and cuffs. Paint only the
                garment areas that should sit behind the body.
              </ThemedText>
              <FitControl
                label="Brush"
                onDecrease={() =>
                  setBrushSize((currentSize) => clamp(currentSize - 4, 8, 80))
                }
                onIncrease={() =>
                  setBrushSize((currentSize) => clamp(currentSize + 4, 8, 80))
                }
                value={`${brushSize}px`}
              />
              <ThemedView type="background" style={styles.valueCard}>
                <ThemedText type="smallBold">Mask stamps</ThemedText>
                <ThemedText type="code">
                  {selectedMaskStamps.length} on this item
                </ThemedText>
              </ThemedView>
            </>
          )}

          <View style={styles.actionRow}>
            {workspaceMode === 'fit' ? (
              <Pressable
                accessibilityRole="button"
                onPress={resetCurrentFit}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.buttonText}>
                  Reset This Fit
                </ThemedText>
              </Pressable>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: selectedMaskStamps.length === 0,
                  }}
                  disabled={selectedMaskStamps.length === 0}
                  onPress={undoMaskStamp}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    selectedMaskStamps.length === 0 && styles.disabledButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.buttonText}>
                    Undo Mask Stroke
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: selectedMaskStamps.length === 0,
                  }}
                  disabled={selectedMaskStamps.length === 0}
                  onPress={clearCurrentMask}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    selectedMaskStamps.length === 0 && styles.disabledButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.buttonText}>
                    Clear This Mask
                  </ThemedText>
                </Pressable>
              </>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setFitOverrides({});
                setMaskOverrides({});
                setExportStatus(null);
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.buttonText}>
                Reset Entire Batch
              </ThemedText>
            </Pressable>
          </View>

          {workspaceMode === 'fit' ? (
            <ThemedView type="background" style={styles.valueCard}>
              <ThemedText type="smallBold">Fit values</ThemedText>
              <ThemedText selectable type="code" style={styles.fitSnippet}>
                {fitSnippet}
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView type="background" style={styles.valueCard}>
              <ThemedText type="smallBold">What the export keeps</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Every brush stamp is saved for later editing, and the ZIP also
                includes a transparent garment layer with the mask already
                applied.
              </ThemedText>
            </ThemedView>
          )}

          {workspaceMode === 'fit' ? (
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
          ) : null}
        </View>
      </View>

      <ThemedText themeColor="textSecondary" style={styles.note}>
        This lab previews fits and hidden-area masks only; it does not spend
        Lorcoins or change any tester&apos;s saved avatar. Exporting creates one
        ZIP with the batch data, masked garment layers, composed previews, and
        original prototype layers needed to apply the approved edits.
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
  modeTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  modeTab: {
    borderColor: Palette.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  modeTabSelected: {
    backgroundColor: Palette.lightBronze,
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
  selectedButtonText: {
    color: Palette.ink,
  },
  adjustedDot: {
    backgroundColor: Palette.lightBronze,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  batchBar: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  batchCopy: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 240,
  },
  exportStatus: {
    flexBasis: '100%',
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
  maskBox: {
    borderColor: '#ff7a6b',
    overflow: 'hidden',
  },
  maskPaintArea: {
    backgroundColor: 'rgba(255, 122, 107, 0.08)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 3,
  },
  maskStamp: {
    backgroundColor: 'rgba(220, 66, 60, 0.55)',
    borderColor: '#fff3d8',
    borderRadius: 999,
    borderWidth: 1,
    position: 'absolute',
    zIndex: 4,
  },
  moveIndicator: {
    backgroundColor: 'rgba(254, 250, 224, 0.16)',
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
  handleNorth: {
    left: '50%',
    marginLeft: -9,
    top: -10,
  },
  handleNorthEast: {
    right: -10,
    top: -10,
  },
  handleEast: {
    marginTop: -9,
    right: -10,
    top: '50%',
  },
  handleSouthEast: {
    bottom: -10,
    right: -10,
  },
  handleSouth: {
    bottom: -10,
    left: '50%',
    marginLeft: -9,
  },
  handleSouthWest: {
    bottom: -10,
    left: -10,
  },
  handleWest: {
    left: -10,
    marginTop: -9,
    top: '50%',
  },
  handleNorthWest: {
    left: -10,
    top: -10,
  },
  proportionToggle: {
    borderColor: Palette.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  proportionToggleSelected: {
    backgroundColor: Palette.teaGreen,
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
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Palette.lightBronze,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  disabledButton: {
    opacity: 0.5,
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
