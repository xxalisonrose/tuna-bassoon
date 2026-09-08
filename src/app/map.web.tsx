import { StyleSheet, Text, View } from 'react-native';

export default function MapWebScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Harvard Map</Text>
      <Text>The native map is available in the Android and iOS app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
});