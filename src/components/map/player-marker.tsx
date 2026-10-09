import { StyleSheet, View } from 'react-native';

export function PlayerMarker() {
  return (
    <View accessible={false} style={styles.playerMarker}>
      <View accessible={false} style={styles.playerDirection} />
      <View accessible={false} style={styles.playerShadow} />
      <View accessible={false} style={styles.playerBody}>
        <View accessible={false} style={styles.playerScarf} />
      </View>
      <View accessible={false} style={styles.playerHead}>
        <View accessible={false} style={styles.playerHair} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playerMarker: {
    width: 52,
    height: 64,
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
    borderBottomColor: '#F2C14E',
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderLeftWidth: 7,
  },
  playerShadow: {
    position: 'absolute',
    bottom: 5,
    width: 36,
    height: 16,
    backgroundColor: 'rgba(43, 53, 40, 0.3)',
    borderRadius: 18,
    transform: [{ scaleX: 1.15 }],
  },
  playerBody: {
    position: 'absolute',
    bottom: 12,
    width: 30,
    height: 34,
    alignItems: 'center',
    backgroundColor: '#2F7E78',
    borderColor: '#F7EFD7',
    borderWidth: 3,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#24342E',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  playerScarf: {
    position: 'absolute',
    top: 5,
    width: 23,
    height: 6,
    backgroundColor: '#A8473F',
    borderRadius: 3,
  },
  playerHead: {
    position: 'absolute',
    top: 12,
    width: 23,
    height: 23,
    overflow: 'hidden',
    backgroundColor: '#E9B98D',
    borderColor: '#F7EFD7',
    borderWidth: 3,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#24342E',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.28,
    shadowRadius: 2,
  },
  playerHair: {
    position: 'absolute',
    top: -3,
    right: -2,
    left: -2,
    height: 10,
    backgroundColor: '#4D342A',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
});
