import { StyleSheet, Text, View } from 'react-native';

export function LorcoinIcon({ size = 22 }: { size?: number }) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={[
        styles.coin,
        {
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      <Text
        accessible={false}
        importantForAccessibility="no"
        style={[styles.cow, { fontSize: size * 0.62, lineHeight: size }]}
      >
        🐮
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  coin: {
    alignItems: 'center',
    backgroundColor: '#F4C95D',
    borderColor: '#9A6500',
    borderWidth: 1.5,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cow: {
    textAlign: 'center',
  },
});
