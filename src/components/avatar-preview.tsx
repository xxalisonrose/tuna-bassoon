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
import { avatarImages } from '@/lib/avatar-assets';
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

function FittedExplorerBoots() {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.bootSlice}
    >
      <Image
        accessible={false}
        contentFit="contain"
        importantForAccessibility="no"
        source={avatarImages.explorerReference}
        style={styles.bootSliceImage}
      />
    </View>
  );
}

function FittedExplorerGoggles() {
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
        source={avatarImages.explorerReference}
        style={styles.goggleSliceImage}
      />
    </View>
  );
}

export function AvatarPreview({
  fitOverrides,
  highlightedItemId,
  presetId,
  selection,
  showFitGuides = false,
  size = 180,
  style,
}: {
  fitOverrides?: AvatarFitOverrides;
  highlightedItemId?: string;
  presetId?: string;
  selection?: Partial<AvatarSelection>;
  showFitGuides?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const activeSelection = normalizeAvatarSelection(selection, presetId);
  const matchingPresetId = getMatchingAvatarPresetId(activeSelection);
  const wearsFullBoots =
    activeSelection.shoesId === 'winter_snow_boots' ||
    activeSelection.shoesId === 'cowboy_brown_boots' ||
    activeSelection.shoesId === 'cowboy_red_boots';
  const hidesShoes = activeSelection.bottomId === 'princess_ballgown_skirt';

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
          source={avatarImages.explorerReference}
          style={styles.fullLayer}
        />
      ) : (
        <>
          <AvatarLayer source={avatarImages.base} style={styles.fullLayer} />
          {wearsFullBoots ? (
            <ThemedView
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              type="surfaceWarm"
              style={styles.fullBootMask}
            />
          ) : null}
          {activeSelection.bottomId === 'explorer_cargo' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="explorer_cargo"
              source={avatarImages.explorerBottom}
            />
          ) : null}
          {activeSelection.bottomId === 'winter_charcoal_pants' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="winter_charcoal_pants"
              source={avatarImages.winterBottom}
            />
          ) : null}
          {activeSelection.bottomId === 'cowboy_western_pants' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_western_pants"
              source={avatarImages.cowboyPants}
            />
          ) : null}
          {activeSelection.bottomId === 'cowboy_western_shorts' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_western_shorts"
              source={avatarImages.cowboyShorts}
            />
          ) : null}
          {activeSelection.bottomId === 'princess_ballgown_skirt' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="princess_ballgown_skirt"
              source={avatarImages.princessSkirt}
            />
          ) : null}
          {!hidesShoes && activeSelection.shoesId === 'explorer_boots' ? (
            <FittedExplorerBoots />
          ) : null}
          {!hidesShoes && activeSelection.shoesId === 'winter_snow_boots' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="winter_snow_boots"
              source={avatarImages.winterShoes}
            />
          ) : null}
          {!hidesShoes && activeSelection.shoesId === 'cowboy_brown_boots' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_brown_boots"
              source={avatarImages.cowboyBrownBoots}
            />
          ) : null}
          {!hidesShoes && activeSelection.shoesId === 'cowboy_red_boots' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_red_boots"
              source={avatarImages.cowboyRedBoots}
            />
          ) : null}
          {activeSelection.topId === 'explorer_field' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="explorer_field"
              source={avatarImages.explorerTop}
            />
          ) : null}
          {activeSelection.topId === 'new_explorer_tee' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="new_explorer_tee"
              source={avatarImages.newExplorerTop}
            />
          ) : null}
          {activeSelection.topId === 'winter_polka_sweater' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="winter_polka_sweater"
              source={avatarImages.winterTop}
            />
          ) : null}
          {activeSelection.topId === 'cowboy_sheriff_shirt' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_sheriff_shirt"
              source={avatarImages.cowboyTop}
            />
          ) : null}
          {activeSelection.topId === 'princess_puff_bodice' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="princess_puff_bodice"
              source={avatarImages.princessTop}
            />
          ) : null}
          {activeSelection.neckId === 'rust_neckerchief' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="rust_neckerchief"
              source={avatarImages.rustNeckerchief}
            />
          ) : null}
          {activeSelection.neckId === 'winter_cream_scarf' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="winter_cream_scarf"
              source={avatarImages.winterScarf}
            />
          ) : null}
          {activeSelection.neckId === 'cowboy_red_bandana' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_red_bandana"
              source={avatarImages.cowboyBandana}
            />
          ) : null}
          {activeSelection.faceId === 'explorer_goggles' ? (
            <FittedExplorerGoggles />
          ) : null}
          {activeSelection.headwearId === 'winter_knit_beanie' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="winter_knit_beanie"
              source={avatarImages.winterBeanie}
            />
          ) : null}
          {activeSelection.headwearId === 'cowboy_sheriff_hat' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="cowboy_sheriff_hat"
              source={avatarImages.cowboyHat}
            />
          ) : null}
          {activeSelection.headwearId === 'princess_crown' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="princess_crown"
              source={avatarImages.princessCrown}
            />
          ) : null}
          {activeSelection.handheldId === 'princess_star_wand' ? (
            <FittedAvatarLayer
              fitOverrides={fitOverrides}
              itemId="princess_star_wand"
              source={avatarImages.princessWand}
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
  fullBootMask: {
    height: '20%',
    left: '28%',
    position: 'absolute',
    top: '80%',
    width: '44%',
  },
  bootSlice: {
    bottom: 0,
    height: '25%',
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    width: '100%',
  },
  bootSliceImage: {
    height: '400%',
    left: 0,
    position: 'absolute',
    top: '-300%',
    width: '100%',
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
