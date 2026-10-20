import { StyleSheet, View } from 'react-native';

import { AvatarPreview } from '@/components/avatar-preview';
import { Palette } from '@/constants/theme';
import type { AvatarSelection } from '@/lib/avatar';

export function PlayerMarker({
  presetId,
  selection,
}: {
  presetId?: string;
  selection?: Partial<AvatarSelection>;
}) {
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={styles.playerMarker}>
      <View
        accessible={false}
        pointerEvents="none"
        style={styles.playerDirection}
      />
      <View
        accessible={false}
        pointerEvents="none"
        style={styles.playerPlatform}>
        <View
          accessible={false}
          pointerEvents="none"
          style={styles.playerPlatformInset}
        />
      </View>
      <AvatarPreview
        presetId={presetId}
        selection={selection}
        size={92}
        style={styles.avatar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  playerMarker: {
    width: 116,
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerDirection: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderRightColor: 'transparent',
    borderRightWidth: 7,
    borderBottomColor: Palette.lightBronze,
    borderBottomWidth: 13,
    borderLeftColor: 'transparent',
    borderLeftWidth: 7,
  },
  playerPlatform: {
    position: 'absolute',
    bottom: 2,
    width: 98,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.lightBronze,
    borderColor: Palette.paper,
    borderRadius: 14,
    borderWidth: 2,
    shadowColor: '#172019',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.32,
    shadowRadius: 3,
  },
  playerPlatformInset: {
    width: 78,
    height: 13,
    backgroundColor: Palette.teaGreen,
    borderColor: Palette.bronzeDeep,
    borderRadius: 8,
    borderWidth: 1,
  },
  avatar: {
    position: 'absolute',
    top: 4,
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
});
