import { useEffect } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Place } from '@/data/places';

type LocationPopupProps = {
  place: Place;
  onClose: () => void;
};

export function LocationPopup({
  place,
  onClose,
}: LocationPopupProps) {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `Location details opened for ${place.title}`,
    );
  }, [place.title]);

  return (
    <View
      accessibilityViewIsModal
      style={styles.card}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            {place.title}
          </Text>

          {place.category && (
            <Text
              accessibilityLabel={`Category: ${place.category}`}
              style={styles.category}>
              {place.category}
            </Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close location information"
          accessibilityHint="Closes this location detail card"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed,
          ]}>
          <Text accessible={false} style={styles.closeText}>
            ×
          </Text>
        </Pressable>
      </View>

      <Text style={styles.description}>{place.description}</Text>

      {place.badges.length > 0 && (
        <View style={styles.badgeSection}>
          <Text style={styles.badgeHeading}>
            {place.badges.length === 1 ? 'Badge' : 'Badges'}
          </Text>

          <View style={styles.badgeList}>
            {place.badges.map((badge) => (
              <Text key={badge} style={styles.badge}>
                {badge}
              </Text>
            ))}
          </View>
        </View>
      )}
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
    marginBottom: 12,
  },
  heading: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  title: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
  },
  category: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#174E80',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: '#E6F4FE',
    borderRadius: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eeeeee',
    borderRadius: 22,
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  closeText: {
    color: '#333333',
    fontSize: 26,
    lineHeight: 28,
  },
  description: {
    color: '#444444',
    fontSize: 16,
    lineHeight: 24,
  },
  badgeSection: {
    marginTop: 16,
    gap: 8,
  },
  badgeHeading: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '700',
  },
  badgeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#6B3E00',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: '#FFF2CC',
    borderRadius: 12,
  },
});