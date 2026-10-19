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
    <View accessible={false} style={styles.playerMarker}>
      <View accessible={false} style={styles.playerDirection} />
      <View accessible={false} style={styles.playerShadow} />
      <AvatarPreview
        presetId={presetId}
        selection={selection}
        size={58}
        style={styles.avatar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  playerMarker: {
    width: 70,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerDirection: {
    position: 'absolute',
    top: 1,
    width: 0,
    height: 0,
    borderRightColor: 'transparent',
    borderRightWidth: 7,
    borderBottomColor: Palette.lightBronze,
    borderBottomWidth: 13,
    borderLeftColor: 'transparent',
    borderLeftWidth: 7,
  },
  playerShadow: {
    position: 'absolute',
    bottom: 2,
    width: 44,
    height: 14,
    backgroundColor: 'rgba(43, 53, 40, 0.3)',
    borderRadius: 18,
    transform: [{ scaleX: 1.18 }],
  },
  avatar: {
    position: 'absolute',
    top: 12,
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
});
