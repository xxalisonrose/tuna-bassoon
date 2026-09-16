import {
  useConvexAuth,
  useMutation,
  useQuery,
} from 'convex/react';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Place } from '@/data/places';
import { api } from '../../convex/_generated/api';

type LocationPopupProps = {
  place: Place;
  userCoordinates: [number, number] | null;
  onClose: () => void;
};

type CheckInMessage = {
  text: string;
  type: 'success' | 'error' | 'information';
};

export function LocationPopup({
  place,
  userCoordinates,
  onClose,
}: LocationPopupProps) {
  const {
    isAuthenticated,
    isLoading: isAuthenticationLoading,
  } = useConvexAuth();

  const checkIn = useMutation(api.visits.checkIn);

  const existingVisit = useQuery(
    api.visits.getVisitForLocation,
    isAuthenticated
      ? {
          locationId: place.id,
        }
      : 'skip',
  );

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] =
    useState<CheckInMessage | null>(null);

  useEffect(() => {
    setCheckInMessage(null);

    AccessibilityInfo.announceForAccessibility(
      `Location details opened for ${place.title}`,
    );
  }, [place.id, place.title]);

  const visitStatusIsLoading =
    isAuthenticationLoading ||
    (isAuthenticated && existingVisit === undefined);

  const handleCheckIn = async () => {
    if (!isAuthenticated) {
      setCheckInMessage({
        text: 'Sign in from the Home tab before checking in.',
        type: 'information',
      });
      return;
    }

    if (!userCoordinates) {
      setCheckInMessage({
        text: 'Your current location is not available yet.',
        type: 'error',
      });
      return;
    }

    setIsCheckingIn(true);
    setCheckInMessage(null);

    try {
      const result = await checkIn({
        locationId: place.id,
        userLatitude: userCoordinates[1],
        userLongitude: userCoordinates[0],
      });

      if (result.status === 'too_far') {
        setCheckInMessage({
          text: `You are approximately ${result.distanceMeters} meters away. Move within 80 meters to check in.`,
          type: 'error',
        });
        return;
      }

      if (result.status === 'already_checked_in') {
        setCheckInMessage({
          text: 'You have already checked in at this location.',
          type: 'information',
        });
        return;
      }

      const badgeProgress =
        result.badgeTags.length > 0
          ? ` Progress added toward: ${result.badgeTags.join(', ')}.`
          : '';

      setCheckInMessage({
        text: `Check-in successful! You collected the ${result.stampName} stamp.${badgeProgress}`,
        type: 'success',
      });
    } catch (checkInError) {
      setCheckInMessage({
        text:
          checkInError instanceof Error
            ? checkInError.message
            : 'Unable to check in right now.',
        type: 'error',
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const checkInButtonLabel = (() => {
    if (!isAuthenticated) {
      return 'Sign in to check in';
    }

    if (visitStatusIsLoading) {
      return 'Checking visit status...';
    }

    if (existingVisit) {
      return 'Already checked in';
    }

    if (!userCoordinates) {
      return 'Waiting for GPS...';
    }

    if (isCheckingIn) {
      return 'Checking distance...';
    }

    return 'Check In';
  })();

  const checkInIsDisabled =
    !isAuthenticated ||
    visitStatusIsLoading ||
    existingVisit !== null ||
    !userCoordinates ||
    isCheckingIn;

  return (
    <View
      accessibilityViewIsModal
      style={styles.card}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          style={styles.title}>
          {place.title}
        </Text>

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

      <ScrollView
        accessibilityLabel={`Details for ${place.title}`}
        contentContainerStyle={styles.scrollContent}
        persistentScrollbar
        showsVerticalScrollIndicator>
        {place.category && (
          <Text
            accessibilityLabel={`Category: ${place.category}`}
            style={styles.category}>
            {place.category}
          </Text>
        )}

        <Text style={styles.description}>
          {place.description}
        </Text>

        {place.badges.length > 0 && (
          <View style={styles.badgeSection}>
            <Text style={styles.badgeHeading}>
              Badge progress
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={checkInButtonLabel}
          disabled={checkInIsDisabled}
          onPress={handleCheckIn}
          style={({ pressed }) => [
            styles.checkInButton,
            checkInIsDisabled && styles.checkInButtonDisabled,
            pressed && styles.checkInButtonPressed,
          ]}>
          {isCheckingIn ? (
            <ActivityIndicator
              accessibilityLabel="Checking your distance"
              color="#ffffff"
            />
          ) : (
            <Text style={styles.checkInButtonText}>
              {checkInButtonLabel}
            </Text>
          )}
        </Pressable>

        {checkInMessage && (
          <Text
            accessibilityLiveRegion="assertive"
            style={[
              styles.checkInMessage,
              checkInMessage.type === 'success' &&
                styles.checkInMessageSuccess,
              checkInMessage.type === 'error' &&
                styles.checkInMessageError,
            ]}>
            {checkInMessage.text}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    right: 16,
    bottom: 96,
    left: 16,
    maxHeight: '62%',
    overflow: 'hidden',
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
    alignItems: 'center',
    minHeight: 68,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 18,
    borderBottomColor: '#e5e5e5',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
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
  scrollContent: {
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
    paddingBottom: 22,
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
  description: {
    alignSelf: 'stretch',
    color: '#444444',
    fontSize: 16,
    lineHeight: 24,
  },
  badgeSection: {
    alignSelf: 'stretch',
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
  checkInButton: {
    width: '100%',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#A51C30',
    borderRadius: 12,
  },
  checkInButtonDisabled: {
    backgroundColor: '#8A8A8A',
  },
  checkInButtonPressed: {
    opacity: 0.75,
  },
  checkInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  checkInMessage: {
    alignSelf: 'stretch',
    color: '#174E80',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  checkInMessageSuccess: {
    color: '#176B3A',
  },
  checkInMessageError: {
    color: '#B42318',
  },
});