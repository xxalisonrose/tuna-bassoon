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
    <View accessible={false} pointerEvents="none" style={styles.playerMarker}>
      <View
        accessible={false}
        pointerEvents="none"
        style={styles.playerDirection}
      />
      <View
        accessible={false}
        pointerEvents="none"
        style={styles.playerPlatform}
      >
        <View
          accessible={false}
          pointerEvents="none"
          style={styles.playerPlatformShadow}
        />
        <View
          accessible={false}
          pointerEvents="none"
          style={styles.playerPlatformSide}
        />
        <View
          accessible={false}
          pointerEvents="none"
          style={styles.playerPlatformTop}
        >
          <View
            accessible={false}
            pointerEvents="none"
            style={styles.playerPlatformOuterRing}
          >
            <View
              accessible={false}
              pointerEvents="none"
              style={styles.playerPlatformInnerRing}
            >
              <View
                accessible={false}
                pointerEvents="none"
                style={styles.playerPlatformCore}
              />
            </View>
          </View>
        </View>
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
    bottom: 0,
    width: 110,
    height: 46,
    alignItems: 'center',
  },
  playerPlatformShadow: {
    position: 'absolute',
    bottom: 0,
    width: 100,
    height: 22,
    backgroundColor: 'rgba(23, 32, 25, 0.34)',
    borderRadius: 50,
  },
  playerPlatformSide: {
    position: 'absolute',
    bottom: 4,
    width: 106,
    height: 34,
    backgroundColor: Palette.bronzeDeep,
    borderColor: Palette.paper,
    borderRadius: 53,
    borderWidth: 1,
  },
  playerPlatformTop: {
    position: 'absolute',
    bottom: 11,
    width: 106,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.teaGreen,
    borderColor: Palette.paper,
    borderRadius: 53,
    borderWidth: 2,
  },
  playerPlatformOuterRing: {
    width: 84,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Palette.lightBronze,
    borderRadius: 42,
    borderWidth: 2,
  },
  playerPlatformInnerRing: {
    width: 60,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.papayaWhip,
    borderColor: Palette.bronzeDeep,
    borderRadius: 30,
    borderWidth: 1,
  },
  playerPlatformCore: {
    width: 28,
    height: 8,
    backgroundColor: Palette.lightBronze,
    borderRadius: 14,
  },
  avatar: {
    position: 'absolute',
    top: 4,
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
});
