import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Place } from '@/data/places';

type LocationPopupProps = {
  place: Place;
  onClose: () => void;
};

export function LocationPopup({
  place,
  onClose,
}: LocationPopupProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{place.title}</Text>

        <Pressable
          accessibilityLabel="Close location information"
          onPress={onClose}
          style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <Text style={styles.description}>{place.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    right: 16,
    bottom: 110,
    left: 16,
    padding: 18,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eeeeee',
    borderRadius: 16,
  },
  closeText: {
    color: '#333333',
    fontSize: 24,
    lineHeight: 26,
  },
  description: {
    color: '#444444',
    fontSize: 15,
    lineHeight: 22,
  },
});