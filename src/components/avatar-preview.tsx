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
  getMatchingAvatarPresetId,
  normalizeAvatarSelection,
  type AvatarSelection,
} from '@/lib/avatar';

const avatarImages = {
  base: require('../../assets/images/avatar/references/avatar-neutral-reference.png'),
  explorerReference: require('../../assets/images/avatar/references/avatar-explorer-reference.png'),
  explorerTop: require('../../assets/images/avatar/items/top/avatar-top-explorer-field.png'),
  newExplorerTop: require('../../assets/images/avatar/items/top/avatar-top-new-explorer-tee.png'),
  explorerBottom: require('../../assets/images/avatar/items/bottom/avatar-bottom-explorer-cargo.png'),
  rustNeckerchief: require('../../assets/images/avatar/items/neck/avatar-neck-rust-neckerchief.png'),
  winterTop: require('../../assets/images/avatar/items/top/avatar-top-winter-polka-sweater.png'),
  winterBottom: require('../../assets/images/avatar/items/bottom/avatar-bottom-winter-charcoal-pants.png'),
  winterShoes: require('../../assets/images/avatar/items/shoes/avatar-shoes-winter-snow-boots.png'),
  winterScarf: require('../../assets/images/avatar/items/neck/avatar-neck-winter-cream-scarf.png'),
  winterBeanie: require('../../assets/images/avatar/items/headwear/avatar-headwear-winter-knit-beanie.png'),
  cowboyTop: require('../../assets/images/avatar/items/top/avatar-top-cowboy-sheriff-shirt.png'),
  cowboyPants: require('../../assets/images/avatar/items/bottom/avatar-bottom-cowboy-western-pants.png'),
  cowboyShorts: require('../../assets/images/avatar/items/bottom/avatar-bottom-cowboy-western-shorts.png'),
  cowboyBrownBoots: require('../../assets/images/avatar/items/shoes/avatar-shoes-cowboy-brown-boots.png'),
  cowboyRedBoots: require('../../assets/images/avatar/items/shoes/avatar-shoes-cowboy-red-boots.png'),
  cowboyBandana: require('../../assets/images/avatar/items/neck/avatar-neck-cowboy-red-bandana.png'),
  cowboyHat: require('../../assets/images/avatar/items/headwear/avatar-headwear-cowboy-sheriff-hat.png'),
  princessTop: require('../../assets/images/avatar/items/top/avatar-top-princess-puff-bodice.png'),
  princessSkirt: require('../../assets/images/avatar/items/bottom/avatar-bottom-princess-ballgown-skirt.png'),
  princessCrown: require('../../assets/images/avatar/items/headwear/avatar-headwear-princess-crown.png'),
  princessWand: require('../../assets/images/avatar/items/handheld/avatar-handheld-princess-star-wand.png'),
} as const;

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
  presetId,
  selection,
  size = 180,
  style,
}: {
  presetId?: string;
  selection?: Partial<AvatarSelection>;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const activeSelection = normalizeAvatarSelection(selection, presetId);
  const matchingPresetId = getMatchingAvatarPresetId(activeSelection);

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
          {activeSelection.bottomId === 'explorer_cargo' ? (
            <AvatarLayer
              source={avatarImages.explorerBottom}
              style={styles.bottomLayer}
            />
          ) : null}
          {activeSelection.bottomId === 'winter_charcoal_pants' ? (
            <AvatarLayer
              source={avatarImages.winterBottom}
              style={styles.winterBottomLayer}
            />
          ) : null}
          {activeSelection.bottomId === 'cowboy_western_pants' ? (
            <AvatarLayer
              source={avatarImages.cowboyPants}
              style={styles.cowboyPantsLayer}
            />
          ) : null}
          {activeSelection.bottomId === 'cowboy_western_shorts' ? (
            <AvatarLayer
              source={avatarImages.cowboyShorts}
              style={styles.cowboyShortsLayer}
            />
          ) : null}
          {activeSelection.bottomId === 'princess_ballgown_skirt' ? (
            <AvatarLayer
              source={avatarImages.princessSkirt}
              style={styles.princessSkirtLayer}
            />
          ) : null}
          {activeSelection.shoesId === 'explorer_boots' ? (
            <FittedExplorerBoots />
          ) : null}
          {activeSelection.shoesId === 'winter_snow_boots' ? (
            <AvatarLayer
              source={avatarImages.winterShoes}
              style={styles.winterShoesLayer}
            />
          ) : null}
          {activeSelection.shoesId === 'cowboy_brown_boots' ? (
            <AvatarLayer
              source={avatarImages.cowboyBrownBoots}
              style={styles.cowboyBootsLayer}
            />
          ) : null}
          {activeSelection.shoesId === 'cowboy_red_boots' ? (
            <AvatarLayer
              source={avatarImages.cowboyRedBoots}
              style={styles.cowboyBootsLayer}
            />
          ) : null}
          {activeSelection.topId === 'explorer_field' ? (
            <AvatarLayer
              source={avatarImages.explorerTop}
              style={styles.topLayer}
            />
          ) : null}
          {activeSelection.topId === 'new_explorer_tee' ? (
            <AvatarLayer
              source={avatarImages.newExplorerTop}
              style={styles.fullLayer}
            />
          ) : null}
          {activeSelection.topId === 'winter_polka_sweater' ? (
            <AvatarLayer
              source={avatarImages.winterTop}
              style={styles.winterTopLayer}
            />
          ) : null}
          {activeSelection.topId === 'cowboy_sheriff_shirt' ? (
            <AvatarLayer
              source={avatarImages.cowboyTop}
              style={styles.cowboyTopLayer}
            />
          ) : null}
          {activeSelection.topId === 'princess_puff_bodice' ? (
            <AvatarLayer
              source={avatarImages.princessTop}
              style={styles.princessTopLayer}
            />
          ) : null}
          {activeSelection.neckId === 'rust_neckerchief' ? (
            <AvatarLayer
              source={avatarImages.rustNeckerchief}
              style={styles.neckLayer}
            />
          ) : null}
          {activeSelection.neckId === 'winter_cream_scarf' ? (
            <AvatarLayer
              source={avatarImages.winterScarf}
              style={styles.winterScarfLayer}
            />
          ) : null}
          {activeSelection.neckId === 'cowboy_red_bandana' ? (
            <AvatarLayer
              source={avatarImages.cowboyBandana}
              style={styles.cowboyBandanaLayer}
            />
          ) : null}
          {activeSelection.faceId === 'explorer_goggles' ? (
            <FittedExplorerGoggles />
          ) : null}
          {activeSelection.headwearId === 'winter_knit_beanie' ? (
            <AvatarLayer
              source={avatarImages.winterBeanie}
              style={styles.winterBeanieLayer}
            />
          ) : null}
          {activeSelection.headwearId === 'cowboy_sheriff_hat' ? (
            <AvatarLayer
              source={avatarImages.cowboyHat}
              style={styles.cowboyHatLayer}
            />
          ) : null}
          {activeSelection.headwearId === 'princess_crown' ? (
            <AvatarLayer
              source={avatarImages.princessCrown}
              style={styles.princessCrownLayer}
            />
          ) : null}
          {activeSelection.handheldId === 'princess_star_wand' ? (
            <AvatarLayer
              source={avatarImages.princessWand}
              style={styles.princessWandLayer}
            />
          ) : null}
        </>
      )}
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
  topLayer: {
    height: '87%',
    left: '7.5%',
    top: '3%',
    width: '87%',
  },
  bottomLayer: {
    height: '63%',
    left: '19.5%',
    top: '19%',
    width: '63%',
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
  neckLayer: {
    height: '60%',
    left: '20%',
    top: '9%',
    width: '60%',
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
  winterTopLayer: {
    height: '58%',
    left: '20%',
    top: '7%',
    width: '60%',
  },
  winterBottomLayer: {
    height: '58%',
    left: '21%',
    top: '39%',
    width: '58%',
  },
  winterShoesLayer: {
    height: '34%',
    left: '33%',
    top: '68%',
    width: '34%',
  },
  winterScarfLayer: {
    height: '22%',
    left: '39%',
    top: '14%',
    width: '22%',
  },
  winterBeanieLayer: {
    height: '17%',
    left: '40%',
    top: '-5%',
    width: '20%',
  },
  cowboyTopLayer: {
    height: '50%',
    left: '25%',
    top: '8%',
    width: '50%',
  },
  cowboyPantsLayer: {
    height: '59%',
    left: '21%',
    top: '39%',
    width: '58%',
  },
  cowboyShortsLayer: {
    height: '28%',
    left: '29%',
    top: '43%',
    width: '42%',
  },
  cowboyBootsLayer: {
    height: '34%',
    left: '33%',
    top: '68%',
    width: '34%',
  },
  cowboyBandanaLayer: {
    height: '11%',
    left: '43%',
    top: '20%',
    width: '14%',
  },
  cowboyHatLayer: {
    height: '20%',
    left: '36%',
    top: '-7%',
    width: '28%',
  },
  princessTopLayer: {
    height: '50%',
    left: '22%',
    top: '8%',
    width: '56%',
  },
  princessSkirtLayer: {
    height: '65%',
    left: '14%',
    top: '39%',
    width: '72%',
  },
  princessCrownLayer: {
    height: '12%',
    left: '43%',
    top: 0,
    width: '14%',
  },
  princessWandLayer: {
    height: '52%',
    left: '59%',
    top: '27%',
    width: '32%',
  },
});
