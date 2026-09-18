import {
  Camera,
  type CameraRef,
  Map,
  Marker,
} from '@maplibre/maplibre-react-native';
import {
  useConvexAuth,
  useQuery,
} from 'convex/react';
import * as Location from 'expo-location';
import { type ErrorBoundaryProps } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationPopup } from '@/components/location-popup';
import { BottomTabInset } from '@/constants/theme';
import type { Place } from '@/data/places';
import { api } from '../../convex/_generated/api';

const HARVARD_YARD: [number, number] = [-71.1167, 42.377];

export function ErrorBoundary({
  retry,
}: ErrorBoundaryProps) {
  return (
    <View style={styles.errorContainer}>
      <View
        accessibilityLiveRegion="assertive"
        accessibilityRole="alert"
        style={styles.errorCard}>
        <Text style={styles.errorTitle}>
          We couldn’t load the map
        </Text>

        <Text style={styles.errorText}>
          Check your internet connection and try again.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try loading the map again"
          onPress={retry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}>
          <Text style={styles.retryButtonText}>
            Try Again
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function MapScreen() {
  const cameraRef = useRef<CameraRef>(null);
  const insets = useSafeAreaInsets();

  const { isAuthenticated } = useConvexAuth();

  const [selectedPlace, setSelectedPlace] =
    useState<Place | null>(null);

  const [locationListVisible, setLocationListVisible] =
    useState(false);

  const [placeOpenedFromList, setPlaceOpenedFromList] =
    useState(false);

  const [userCoordinates, setUserCoordinates] =
    useState<[number, number] | null>(null);

  const [locationMessage, setLocationMessage] = useState(
    'Finding your location...',
  );

  const [locationsTakingLong, setLocationsTakingLong] =
    useState(false);

  const locations = useQuery(api.locations.getLocations);

  const visits = useQuery(
    api.visits.getMyVisits,
    isAuthenticated ? {} : 'skip',
  );

  const visitedLocationIds = new Set(
    (visits ?? []).map((visit) => visit.locationId),
  );

  const locationsAreLoading = locations === undefined;

  const places: Place[] = (locations ?? []).flatMap(
    (location) => {
      if (
        location.latitude === undefined ||
        location.longitude === undefined
      ) {
        return [];
      }

      return [
        {
          id: location._id,
          title: location.name,
          description: location.description,
          category: location.category,
          badges: location.badges,
          coordinates: [
            location.longitude,
            location.latitude,
          ] as [number, number],
        },
      ];
    },
  );

  const locationsAreEmpty =
    locations !== undefined && locations.length === 0;

  const placesAreEmpty =
    locations !== undefined &&
    locations.length > 0 &&
    places.length === 0;

  const modalContentVisible =
    selectedPlace !== null || locationListVisible;

  useEffect(() => {
    if (!locationsAreLoading) {
      setLocationsTakingLong(false);
      return;
    }

    const timer = setTimeout(() => {
      setLocationsTakingLong(true);
    }, 8000);

    return () => {
      clearTimeout(timer);
    };
  }, [locationsAreLoading]);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentLocation() {
      try {
        const servicesEnabled =
          await Location.hasServicesEnabledAsync();

        if (!servicesEnabled) {
          if (isMounted) {
            setLocationMessage(
              'Turn on location services to see your position.',
            );
          }

          return;
        }

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (
          permission.status !==
          Location.PermissionStatus.GRANTED
        ) {
          if (isMounted) {
            setLocationMessage(
              'Location permission was not granted.',
            );
          }

          return;
        }

        const currentLocation =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

        if (isMounted) {
          setUserCoordinates([
            currentLocation.coords.longitude,
            currentLocation.coords.latitude,
          ]);

          setLocationMessage('');
        }
      } catch {
        if (isMounted) {
          setLocationMessage(
            'Unable to find your current location.',
          );
        }
      }
    }

    loadCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const startingCenter =
    userCoordinates ?? HARVARD_YARD;

  const recenterMap = () => {
    if (!userCoordinates) {
      return;
    }

    cameraRef.current?.flyTo({
      center: userCoordinates,
      zoom: 15,
      duration: 750,
    });
  };

  const toggleLocationList = () => {
    const nextVisible = !locationListVisible;

    setLocationListVisible(nextVisible);

    AccessibilityInfo.announceForAccessibility(
      nextVisible
        ? 'Location list opened.'
        : 'Location list closed.',
    );
  };

  const selectPlace = (
    place: Place,
    openedFromList: boolean,
  ) => {
    setPlaceOpenedFromList(openedFromList);
    setSelectedPlace(place);
    setLocationListVisible(false);

    AccessibilityInfo.announceForAccessibility(
      `${place.title} selected.`,
    );
  };

  const closeSelectedPlace = () => {
    const shouldReturnToList = placeOpenedFromList;

    setSelectedPlace(null);
    setPlaceOpenedFromList(false);

    if (shouldReturnToList) {
      setLocationListVisible(true);

      setTimeout(() => {
        AccessibilityInfo.announceForAccessibility(
          'Returned to location list.',
        );
      }, 100);
    }
  };

  return (
    <View style={styles.container}>
      <View
        accessible={false}
        accessibilityElementsHidden={modalContentVisible}
        importantForAccessibility={
          modalContentVisible
            ? 'no-hide-descendants'
            : 'auto'
        }
        pointerEvents={
          modalContentVisible ? 'none' : 'auto'
        }
        style={styles.mapLayer}>
        <Map
          accessible={false}
          style={styles.map}
          mapStyle="https://tiles.openfreemap.org/styles/liberty">
          <Camera
            ref={cameraRef}
            key={
              userCoordinates
                ? 'user-location'
                : 'harvard-yard'
            }
            initialViewState={{
              center: startingCenter,
              zoom: 15,
            }}
          />

          {places.map((place) => {
            const isVisited =
              visitedLocationIds.has(place.id);

            const isSelected =
              selectedPlace?.id === place.id;

            return (
              <Marker
                key={place.id}
                id={place.id}
                lngLat={place.coordinates}
                anchor="bottom"
                onPress={() =>
                  selectPlace(place, false)
                }>
                <View
                  accessible={false}
                  style={[
                    styles.pin,
                    isVisited && styles.visitedPin,
                    isSelected && styles.selectedPin,
                    isVisited &&
                      isSelected &&
                      styles.selectedVisitedPin,
                  ]}>
                  {isVisited ? (
                    <Text
                      accessible={false}
                      allowFontScaling={false}
                      style={styles.visitedPinCheck}>
                      ✓
                    </Text>
                  ) : (
                    <View
                      accessible={false}
                      style={styles.pinCenter}
                    />
                  )}
                </View>
              </Marker>
            );
          })}

          {userCoordinates && (
            <Marker
              id="current-user-location"
              lngLat={userCoordinates}
              anchor="center">
              <View
                accessible={false}
                style={styles.userLocationOuter}>
                <View
                  accessible={false}
                  style={styles.userLocationInner}
                />
              </View>
            </Marker>
          )}
        </Map>

        {locationMessage !== '' && (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.locationMessage,
              {
                top: insets.top + 8,
              },
            ]}>
            <Text style={styles.locationMessageText}>
              {locationMessage}
            </Text>
          </View>
        )}

        {locationsAreLoading && (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.mapStatus,
              {
                top: insets.top + 64,
              },
            ]}>
            <ActivityIndicator
              accessibilityLabel="Loading map locations"
              color="#208AEF"
            />

            <Text style={styles.mapStatusText}>
              {locationsTakingLong
                ? 'Still connecting to location data...'
                : 'Loading locations...'}
            </Text>
          </View>
        )}

        {locationsAreEmpty && (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.mapStatus,
              {
                top: insets.top + 64,
              },
            ]}>
            <Text style={styles.mapStatusTitle}>
              No locations yet
            </Text>

            <Text style={styles.mapStatusText}>
              New places will appear here when they are added.
            </Text>
          </View>
        )}

        {placesAreEmpty && (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.mapStatus,
              {
                top: insets.top + 64,
              },
            ]}>
            <Text style={styles.mapStatusTitle}>
              Locations need map information
            </Text>

            <Text style={styles.mapStatusText}>
              The available locations are missing map
              coordinates. They cannot appear on the map yet.
            </Text>
          </View>
        )}

        {!locationsAreLoading &&
          places.length > 0 &&
          !modalContentVisible && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open location list"
              accessibilityHint="Opens an accessible list of locations on the map"
              accessibilityState={{
                expanded: locationListVisible,
              }}
              onPress={toggleLocationList}
              style={({ pressed }) => [
                styles.locationListButton,
                {
                  bottom: BottomTabInset + 12,
                },
                pressed &&
                  styles.locationListButtonPressed,
              ]}>
              <Text
                style={styles.locationListButtonText}>
                Location list
              </Text>
            </Pressable>
          )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recenter map on my location"
          accessibilityHint="Moves the map back to your current position"
          accessibilityState={{
            disabled: !userCoordinates,
          }}
          disabled={!userCoordinates}
          onPress={recenterMap}
          style={({ pressed }) => [
            styles.recenterButton,
            {
              bottom: BottomTabInset + 12,
            },
            !userCoordinates &&
              styles.recenterButtonDisabled,
            pressed && styles.recenterButtonPressed,
          ]}>
          <Text
            accessible={false}
            style={styles.recenterButtonIcon}>
            ◎
          </Text>
        </Pressable>
      </View>

      {!locationsAreLoading &&
        places.length > 0 &&
        locationListVisible && (
          <View
            accessibilityViewIsModal
            style={[
              styles.locationListPanel,
              {
                top: insets.top + 8,
                bottom: BottomTabInset + 8,
              },
            ]}>
            <View style={styles.locationListHeader}>
              <Text
                accessibilityRole="header"
                style={styles.locationListTitle}>
                Locations
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close location list"
                accessibilityHint="Closes the accessible location list"
                onPress={toggleLocationList}
                style={({ pressed }) => [
                  styles.locationListCloseButton,
                  pressed &&
                    styles.locationListCloseButtonPressed,
                ]}>
                <Text
                  accessible={false}
                  style={styles.locationListCloseText}>
                  ×
                </Text>
              </Pressable>
            </View>

            <Text style={styles.locationListDescription}>
              Select a location to view its details.
            </Text>

            <ScrollView
              accessibilityLabel="Location list"
              contentContainerStyle={
                styles.locationListContent
              }
              showsVerticalScrollIndicator>
              {places.map((place) => {
                const isVisited =
                  visitedLocationIds.has(place.id);

                return (
                  <Pressable
                    key={place.id}
                    accessibilityRole="button"
                    accessibilityLabel={
                      place.category
                        ? `${place.title}, ${place.category}${
                            isVisited
                              ? ', visited'
                              : ', not visited'
                          }`
                        : `${place.title}${
                            isVisited
                              ? ', visited'
                              : ', not visited'
                          }`
                    }
                    onPress={() =>
                      selectPlace(place, true)
                    }
                    style={({ pressed }) => [
                      styles.locationListItem,
                      isVisited &&
                        styles.locationListItemVisited,
                      selectedPlace?.id === place.id &&
                        styles.locationListItemSelected,
                      pressed &&
                        styles.locationListItemPressed,
                    ]}>
                    <View
                      style={
                        styles.locationListItemHeader
                      }>
                      <Text
                        style={
                          styles.locationListItemTitle
                        }>
                        {place.title}
                      </Text>

                      {isVisited && (
                        <View style={styles.visitedLabel}>
                          <Text
                            style={
                              styles.visitedLabelText
                            }>
                            Visited
                          </Text>
                        </View>
                      )}
                    </View>

                    {place.category && (
                      <Text
                        style={
                          styles.locationListItemCategory
                        }>
                        {place.category}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

      {selectedPlace && (
        <LocationPopup
          place={selectedPlace}
          userCoordinates={userCoordinates}
          onClose={closeSelectedPlace}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapLayer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  pin: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c62828',
    borderColor: '#ffffff',
    borderWidth: 3,
    borderRadius: 14,
  },
  visitedPin: {
    backgroundColor: '#18864B',
    borderRadius: 6,
  },
  selectedPin: {
    width: 36,
    height: 36,
    backgroundColor: '#8b0000',
    borderRadius: 18,
  },
  selectedVisitedPin: {
    backgroundColor: '#0E5A31',
    borderRadius: 8,
  },
  visitedPinCheck: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  pinCenter: {
    width: 7,
    height: 7,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  userLocationOuter: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 138, 239, 0.25)',
    borderRadius: 14,
  },
  userLocationInner: {
    width: 16,
    height: 16,
    backgroundColor: '#208AEF',
    borderColor: '#ffffff',
    borderWidth: 3,
    borderRadius: 8,
  },
  locationMessage: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '90%',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  locationMessageText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
  mapStatus: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '85%',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mapStatusTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  mapStatusText: {
    color: '#444444',
    fontSize: 14,
    textAlign: 'center',
  },
  locationListButton: {
    position: 'absolute',
    left: 18,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  locationListButtonPressed: {
    opacity: 0.75,
  },
  locationListButtonText: {
    color: '#174E80',
    fontSize: 15,
    fontWeight: '700',
  },
  locationListPanel: {
    position: 'absolute',
    right: 16,
    left: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  locationListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 68,
    paddingLeft: 18,
    paddingRight: 12,
    borderBottomColor: '#e5e5e5',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationListTitle: {
    flex: 1,
    color: '#111111',
    fontSize: 22,
    fontWeight: '700',
  },
  locationListCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eeeeee',
    borderRadius: 22,
  },
  locationListCloseButtonPressed: {
    opacity: 0.7,
  },
  locationListCloseText: {
    color: '#333333',
    fontSize: 26,
    lineHeight: 28,
  },
  locationListDescription: {
    paddingHorizontal: 18,
    paddingTop: 14,
    color: '#444444',
    fontSize: 15,
    lineHeight: 22,
  },
  locationListContent: {
    gap: 10,
    padding: 18,
    paddingBottom: 28,
  },
  locationListItem: {
    gap: 4,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderColor: '#d0d5dd',
    borderWidth: 1,
    borderRadius: 12,
  },
  locationListItemVisited: {
    borderColor: '#18864B',
    borderStyle: 'dashed',
    borderWidth: 2,
  },
  locationListItemSelected: {
    borderColor: '#A51C30',
    borderStyle: 'solid',
    borderWidth: 2,
  },
  locationListItemPressed: {
    opacity: 0.75,
  },
  locationListItemHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  locationListItemTitle: {
    flexShrink: 1,
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  locationListItemCategory: {
    color: '#555555',
    fontSize: 14,
  },
  visitedLabel: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#18864B',
    borderRadius: 999,
  },
  visitedLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  recenterButton: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 26,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  recenterButtonDisabled: {
    opacity: 0.45,
  },
  recenterButtonPressed: {
    opacity: 0.75,
  },
  recenterButtonIcon: {
    color: '#208AEF',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 34,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  errorCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 14,
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 18,
  },
  errorTitle: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: '#444444',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 120,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    backgroundColor: '#208AEF',
    borderRadius: 12,
  },
  retryButtonPressed: {
    opacity: 0.75,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});