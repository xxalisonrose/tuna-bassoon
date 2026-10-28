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
          style={styles.playerPlatformGlow}
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
    height: 148,
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
    width: 116,
    height: 116,
    alignItems: 'center',
  },
  playerPlatformShadow: {
    position: 'absolute',
    bottom: 0,
    width: 108,
    height: 108,
    backgroundColor: 'rgba(23, 32, 25, 0.12)',
    borderRadius: 54,
  },
  playerPlatformGlow: {
    position: 'absolute',
    bottom: 0,
    width: 116,
    height: 116,
    backgroundColor: 'rgba(229, 255, 206, 0.1)',
    borderColor: 'rgba(250, 255, 238, 0.58)',
    borderRadius: 58,
    borderWidth: 2,
  },
  playerPlatformTop: {
    position: 'absolute',
    bottom: 4,
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(204, 245, 183, 0.22)',
    borderColor: 'rgba(248, 255, 233, 0.88)',
    borderRadius: 54,
    borderWidth: 3,
    shadowColor: '#DFFFC3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.96,
    shadowRadius: 10,
  },
  playerPlatformOuterRing: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224, 255, 202, 0.1)',
    borderColor: 'rgba(217, 255, 183, 0.74)',
    borderRadius: 43,
    borderWidth: 2,
  },
  playerPlatformInnerRing: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(158, 229, 143, 0.2)',
    borderColor: 'rgba(244, 255, 227, 0.78)',
    borderRadius: 30,
    borderWidth: 2,
  },
  playerPlatformCore: {
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255, 255, 235, 0.36)',
    borderRadius: 15,
  },
  avatar: {
    position: 'absolute',
    top: 4,
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
});
