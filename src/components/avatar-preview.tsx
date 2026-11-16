import { Image } from 'expo-image';
import { useQuery } from 'convex/react';
import {
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedView } from '@/components/themed-view';
import {
  avatarImages,
  avatarItemImageSources,
  avatarMapImages,
  avatarMapItemImageSources,
} from '@/lib/avatar-assets';
import {
  avatarItemOptions,
  normalizeAvatarSelection,
  type AvatarSelection,
} from '@/lib/avatar';
import type { AvatarFitOverrides } from '@/lib/avatar-fit';
import { api } from '../../convex/_generated/api';

const itemNames = new Map(
  Object.values(avatarItemOptions)
    .flat()
    .map((item) => [item.id, item.name]),
);

function getAvatarDescription(selection: AvatarSelection) {
  const itemIds = [
    selection.topId,
    selection.bottomId,
    selection.shoesId,
    selection.neckId,
    selection.faceId,
    selection.headwearId,
    selection.handheldId,
  ];
  const names = itemIds
    .filter((itemId) => itemId !== 'none' && itemId !== 'bare_hooves')
    .map((itemId) => itemNames.get(itemId))
    .filter((name): name is string => Boolean(name));

  return names.length > 0
    ? `Scout wearing ${names.join(', ')}.`
    : 'Scout with no clothing or accessories selected.';
}

function AvatarLayer({
  source,
  style,
}: {
  source: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      accessible={false}
      contentFit="fill"
      importantForAccessibility="no"
      source={source}
      style={[styles.layer, style]}
    />
  );
}

function getAlignedLayerStyle(
  itemId: string,
  fitOverrides?: AvatarFitOverrides,
): ImageStyle | undefined {
  const fit = fitOverrides?.[itemId];

  if (!fit) {
    return undefined;
  }

  return {
    height: `${fit.height ?? 100}%`,
    left: `${fit.left ?? 0}%`,
    top: `${fit.top ?? 0}%`,
    transform: [{ rotate: `${fit.rotation ?? 0}deg` }],
    width: `${fit.width ?? 100}%`,
  };
}

function AvatarFitGuides({
  fitOverrides,
  highlightedItemId,
}: {
  fitOverrides?: AvatarFitOverrides;
  highlightedItemId?: string;
}) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.fitGuides}>
      {Array.from({ length: 9 }, (_, index) => (
        <View
          key={`vertical-${index}`}
          style={[
            styles.fitGuideLine,
            styles.fitGuideVertical,
            { left: `${(index + 1) * 10}%` },
          ]}
        />
      ))}
      {Array.from({ length: 9 }, (_, index) => (
        <View
          key={`horizontal-${index}`}
          style={[
            styles.fitGuideLine,
            styles.fitGuideHorizontal,
            { top: `${(index + 1) * 10}%` },
          ]}
        />
      ))}
      {highlightedItemId ? (
        <View
          style={[
            styles.fitOutline,
            getAlignedLayerStyle(highlightedItemId, fitOverrides),
          ]}
        />
      ) : null}
    </View>
  );
}

export function AvatarPreview({
  fitOverrides,
  highlightedItemId,
  imageResolution = 'full',
  presetId,
  selection,
  showFitGuides = false,
  size = 180,
  style,
}: {
  fitOverrides?: AvatarFitOverrides;
  highlightedItemId?: string;
  imageResolution?: 'full' | 'map';
  presetId?: string;
  selection?: Partial<AvatarSelection>;
  showFitGuides?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const activeSelection = normalizeAvatarSelection(selection, presetId);
  const savedFitOverrides = useQuery(api.avatarArt.getAvatarItemFits) ?? {};
  const effectiveFitOverrides = {
    ...savedFitOverrides,
    ...fitOverrides,
  };
  const baseSource =
    imageResolution === 'map' ? avatarMapImages.base : avatarImages.base;
  const itemSources =
    imageResolution === 'map'
      ? avatarMapItemImageSources
      : avatarItemImageSources;
  const layerIds = [
    activeSelection.shoesId,
    activeSelection.bottomId,
    activeSelection.topId,
    activeSelection.neckId,
    activeSelection.headwearId,
    // Face accessories sit above hats so goggles never disappear underneath.
    activeSelection.faceId,
    activeSelection.handheldId,
  ];

  return (
    <ThemedView
      accessibilityLabel={getAvatarDescription(activeSelection)}
      accessible
      type="surfaceWarm"
      style={[styles.frame, { height: size, width: size }, style]}>
      <AvatarLayer source={baseSource} />
      {layerIds.map((itemId) => {
        const source = itemSources[itemId];

        return source === undefined ? null : (
          <AvatarLayer
            key={itemId}
            source={source}
            style={getAlignedLayerStyle(itemId, effectiveFitOverrides)}
          />
        );
      })}
      {showFitGuides ? (
        <AvatarFitGuides
          fitOverrides={effectiveFitOverrides}
          highlightedItemId={highlightedItemId}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  layer: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  fitGuides: {
    ...StyleSheet.absoluteFill,
  },
  fitGuideLine: {
    backgroundColor: 'rgba(29, 78, 216, 0.2)',
    position: 'absolute',
  },
  fitGuideVertical: {
    bottom: 0,
    top: 0,
    width: StyleSheet.hairlineWidth,
  },
  fitGuideHorizontal: {
    height: StyleSheet.hairlineWidth,
    left: 0,
    right: 0,
  },
  fitOutline: {
    borderColor: '#DC2626',
    borderWidth: 2,
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
});
