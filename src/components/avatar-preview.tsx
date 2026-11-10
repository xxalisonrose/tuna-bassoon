import { Image } from 'expo-image';
import {
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  avatarImages,
  avatarMapImages,
} from '@/lib/avatar-assets';
import {
  getMatchingAvatarPresetId,
  normalizeAvatarSelection,
  type AvatarSelection,
} from '@/lib/avatar';
import {
  getAvatarItemFitStyle,
  type AvatarFitOverrides,
} from '@/lib/avatar-fit';

function getAvatarDescription(selection: AvatarSelection) {
  const parts = [
    selection.topId === 'princess_puff_bodice'
      ? 'a sparkling pink princess bodice'
      : selection.topId === 'cowboy_sheriff_shirt'
        ? 'a blue sheriff shirt and fringed vest'
        : selection.topId === 'winter_polka_sweater'
          ? 'a mustard polka-dot sweater'
          : selection.topId === 'explorer_field'
            ? 'an explorer field shirt and vest'
            : selection.topId === 'new_explorer_tee'
              ? 'a cow-print New Explorer shirt'
              : 'a cream trail tank',
    selection.bottomId === 'princess_ballgown_skirt'
      ? 'a sparkling pink ball-gown skirt'
      : selection.bottomId === 'cowboy_western_pants'
        ? 'long tan western pants'
        : selection.bottomId === 'cowboy_western_shorts'
          ? 'tan western shorts'
          : selection.bottomId === 'winter_charcoal_pants'
            ? 'charcoal winter pants'
            : selection.bottomId === 'explorer_cargo'
              ? 'tan cargo shorts'
              : 'neutral trail shorts',
    selection.shoesId === 'cowboy_brown_boots'
      ? 'brown cowboy boots'
      : selection.shoesId === 'cowboy_red_boots'
        ? 'red sheriff boots'
        : selection.shoesId === 'winter_snow_boots'
          ? 'fleece-lined snow boots'
          : selection.shoesId === 'explorer_boots'
            ? 'brown explorer boots'
            : 'bare hooves',
  ];

  if (selection.neckId === 'rust_neckerchief') {
    parts.push('a rust neckerchief');
  }
  if (selection.faceId === 'explorer_goggles') {
    parts.push('round bronze goggles');
  }
  if (selection.neckId === 'winter_cream_scarf') {
    parts.push('a cream knit scarf');
  }
  if (selection.neckId === 'cowboy_red_bandana') {
    parts.push('a red paisley bandana');
  }
  if (selection.headwearId === 'winter_knit_beanie') {
    parts.push('a teal knit beanie');
  }
  if (selection.headwearId === 'cowboy_sheriff_hat') {
    parts.push('a brown sheriff hat');
  }
  if (selection.headwearId === 'princess_crown') {
    parts.push('a jeweled gold crown');
  }
  if (selection.handheldId === 'princess_star_wand') {
    parts.push('a pink star wand');
  }

  return `Cow avatar wearing ${parts.join(', ')}.`;
}

function AvatarLayer({
  contentFit = 'contain',
  source,
  style,
}: {
  contentFit?: 'contain' | 'fill';
  source: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      accessible={false}
      contentFit={contentFit}
      importantForAccessibility="no"
      source={source}
      style={[styles.layer, style]}
    />
  );
}

function FittedAvatarLayer({
  fitOverrides,
  itemId,
  source,
}: {
  fitOverrides?: AvatarFitOverrides;
  itemId: string;
  source: number;
}) {
  return (
    <AvatarLayer
      contentFit="fill"
      source={source}
      style={getAvatarItemFitStyle(itemId, fitOverrides)}
    />
  );
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
      style={styles.fitGuides}
    >
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
      <View
        style={[
          styles.fitGuideCenter,
          styles.fitGuideVertical,
          styles.fitGuideCenterVertical,
        ]}
      />
      <View
        style={[
          styles.fitGuideCenter,
          styles.fitGuideHorizontal,
          styles.fitGuideCenterHorizontal,
        ]}
      />
      {highlightedItemId ? (
        <View
          style={[
            styles.fitOutline,
            getAvatarItemFitStyle(highlightedItemId, fitOverrides),
          ]}
        />
      ) : null}
    </View>
  );
}

function FittedExplorerGoggles({ source }: { source: number }) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.goggleSlice}
    >
      <Image
        accessible={false}
        contentFit="contain"
        importantForAccessibility="no"
        source={source}
        style={styles.goggleSliceImage}
      />
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
  const imageSources =
    imageResolution === 'map' ? avatarMapImages : avatarImages;
  const matchingPresetId = getMatchingAvatarPresetId(activeSelection);
  const wearsLongPants =
    activeSelection.bottomId === 'winter_charcoal_pants' ||
    activeSelection.bottomId === 'cowboy_western_pants';
  const wearsFullBoots =
    activeSelection.shoesId === 'winter_snow_boots' ||
    activeSelection.shoesId === 'cowboy_brown_boots' ||
    activeSelection.shoesId === 'cowboy_red_boots';
  const mapBootFitOverrides =
    imageResolution === 'map'
      ? {
          ...fitOverrides,
          winter_snow_boots: {
            ...fitOverrides?.winter_snow_boots,
            height: 31.5,
            left: 28.5,
            top: 68.8,
            width: 43,
          },
          cowboy_brown_boots: {
            ...fitOverrides?.cowboy_brown_boots,
            height: 32,
            left: 25,
            top: 68.2,
            width: 50,
          },
          cowboy_red_boots: {
            ...fitOverrides?.cowboy_red_boots,
            height: 32,
            left: 25,
            top: 68.2,
            width: 50,
          },
        }
      : fitOverrides;

  return (
    <ThemedView
      accessibilityLabel={getAvatarDescription(activeSelection)}
      accessible
      type="surfaceWarm"
      style={[
        styles.frame,
        {
          height: size,
          width: size,
        },
        style,
      ]}
    >
      {matchingPresetId === 'explorer' ? (
        <AvatarLayer
          source={imageSources.explorerReference}
          style={styles.fullLayer}
        />
      ) : (
        <>
          <AvatarLayer source={imageSources.base} style={styles.fullLayer} />
          {wearsLongPants ? (
            <ThemedView
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              type="surfaceWarm"
              style={styles.pantsGapOcclusion}
            />
          ) : null}
          {/* Map boot artwork is already masked; background-colored hoof
              covers would appear as pale boxes on the transparent marker. */}
          {wearsFullBoots && imageResolution !== 'map' ? (
            <>
              <ThemedView
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                type="surfaceWarm"
                style={[styles.hoofOcclusion, styles.leftHoofOcclusion]}
              />
              <ThemedView
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                type="surfaceWarm"
                style={[styles.hoofOcclusion, styles.rightHoofOcclusion]}
              />
            </>
          ) : null}
          {activeSelection.shoesId === 'explorer_boots' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="explorer_boots"
              source={imageSources.explorerShoes}
            />
          ) : null}
          {activeSelection.shoesId === 'winter_snow_boots' ? (
            <FittedAvatarLayer
              fitOverrides={mapBootFitOverrides}
              itemId="winter_snow_boots"
              source={imageSources.winterShoes}
            />
          ) : null}
          {activeSelection.shoesId === 'cowboy_brown_boots' ? (
            <FittedAvatarLayer
              fitOverrides={mapBootFitOverrides}
              itemId="cowboy_brown_boots"
              source={imageSources.cowboyBrownBoots}
            />
          ) : null}
          {activeSelection.shoesId === 'cowboy_red_boots' ? (
            <FittedAvatarLayer
              fitOverrides={mapBootFitOverrides}
              itemId="cowboy_red_boots"
              source={imageSources.cowboyRedBoots}
            />
          ) : null}
          {activeSelection.bottomId === 'explorer_cargo' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="explorer_cargo"
              source={imageSources.explorerBottom}
            />
          ) : null}
          {activeSelection.bottomId === 'winter_charcoal_pants' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="winter_charcoal_pants"
              source={imageSources.winterBottom}
            />
          ) : null}
          {activeSelection.bottomId === 'cowboy_western_pants' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_western_pants"
              source={imageSources.cowboyPants}
            />
          ) : null}
          {activeSelection.bottomId === 'cowboy_western_shorts' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_western_shorts"
              source={imageSources.cowboyShorts}
            />
          ) : null}
          {activeSelection.bottomId === 'princess_ballgown_skirt' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="princess_ballgown_skirt"
              source={imageSources.princessSkirt}
            />
          ) : null}
          {activeSelection.topId === 'explorer_field' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="explorer_field"
              source={imageSources.explorerTop}
            />
          ) : null}
          {activeSelection.topId === 'new_explorer_tee' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="new_explorer_tee"
              source={imageSources.newExplorerTop}
            />
          ) : null}
          {activeSelection.topId === 'winter_polka_sweater' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="winter_polka_sweater"
              source={imageSources.winterTop}
            />
          ) : null}
          {activeSelection.topId === 'cowboy_sheriff_shirt' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_sheriff_shirt"
              source={imageSources.cowboyTop}
            />
          ) : null}
          {activeSelection.topId === 'princess_puff_bodice' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="princess_puff_bodice"
              source={imageSources.princessTop}
            />
          ) : null}
          {activeSelection.neckId === 'rust_neckerchief' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="rust_neckerchief"
              source={imageSources.rustNeckerchief}
            />
          ) : null}
          {activeSelection.neckId === 'winter_cream_scarf' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="winter_cream_scarf"
              source={imageSources.winterScarf}
            />
          ) : null}
          {activeSelection.neckId === 'cowboy_red_bandana' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_red_bandana"
              source={imageSources.cowboyBandana}
            />
          ) : null}
          {activeSelection.faceId === 'explorer_goggles' ? (
            <FittedExplorerGoggles
              source={imageSources.explorerReference}
            />
          ) : null}
          {activeSelection.headwearId === 'winter_knit_beanie' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="winter_knit_beanie"
              source={imageSources.winterBeanie}
            />
          ) : null}
          {activeSelection.headwearId === 'cowboy_sheriff_hat' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_sheriff_hat"
              source={imageSources.cowboyHat}
            />
          ) : null}
          {activeSelection.headwearId === 'princess_crown' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="princess_crown"
              source={imageSources.princessCrown}
            />
          ) : null}
          {activeSelection.handheldId === 'princess_star_wand' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="princess_star_wand"
              source={imageSources.princessWand}
            />
          ) : null}
        </>
      )}
      {showFitGuides ? (
        <AvatarFitGuides
          fitOverrides={fitOverrides}
          highlightedItemId={highlightedItemId}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    borderRadius: Spacing.four,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  layer: {
    position: 'absolute',
  },
  fullLayer: {
    height: '100%',
    left: 0,
    top: 0,
    width: '100%',
  },
  pantsGapOcclusion: {
    borderRadius: 999,
    height: '43%',
    left: '41%',
    position: 'absolute',
    top: '48%',
    width: '18%',
  },
  hoofOcclusion: {
    borderRadius: 999,
    height: '15%',
    position: 'absolute',
    top: '85%',
    width: '19%',
  },
  leftHoofOcclusion: {
    left: '30%',
  },
  rightHoofOcclusion: {
    right: '30%',
  },
  goggleSlice: {
    height: '18%',
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  goggleSliceImage: {
    height: '555.556%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  fitGuides: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  fitGuideLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    position: 'absolute',
  },
  fitGuideCenter: {
    backgroundColor: 'rgba(212, 163, 115, 0.9)',
    position: 'absolute',
  },
  fitGuideVertical: {
    bottom: 0,
    top: 0,
    width: 1,
  },
  fitGuideHorizontal: {
    height: 1,
    left: 0,
    right: 0,
  },
  fitGuideCenterVertical: {
    left: '50%',
  },
  fitGuideCenterHorizontal: {
    top: '50%',
  },
  fitOutline: {
    borderColor: 'rgba(255, 250, 224, 0.95)',
    borderStyle: 'dashed',
    borderWidth: 2,
    position: 'absolute',
  },
});
