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
} as const;

function getAvatarDescription(selection: AvatarSelection) {
  const parts = [
    selection.topId === 'explorer_field'
      ? 'an explorer field shirt and vest'
      : selection.topId === 'new_explorer_tee'
        ? 'a cow-print New Explorer shirt'
        : 'a cream trail tank',
    selection.bottomId === 'explorer_cargo'
      ? 'tan cargo shorts'
      : 'neutral trail shorts',
    selection.shoesId === 'explorer_boots'
      ? 'brown explorer boots'
      : 'bare hooves',
  ];

  if (selection.neckId === 'rust_neckerchief') {
    parts.push('a rust neckerchief');
  }
  if (selection.faceId === 'explorer_goggles') {
    parts.push('round bronze goggles');
  }

  return `Cow avatar wearing ${parts.join(', ')}.`;
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
      contentFit="contain"
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
      style={styles.bootSlice}>
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
      style={styles.goggleSlice}>
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
      ]}>
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
          {activeSelection.shoesId === 'explorer_boots' ? (
            <FittedExplorerBoots />
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
          {activeSelection.neckId === 'rust_neckerchief' ? (
            <AvatarLayer
              source={avatarImages.rustNeckerchief}
              style={styles.neckLayer}
            />
          ) : null}
          {activeSelection.faceId === 'explorer_goggles' ? (
            <FittedExplorerGoggles />
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
});
