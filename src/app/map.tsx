import {
  Camera,
  type CameraRef,
  Map,
  Marker,
} from '@maplibre/maplibre-react-native';
import { useQuery } from 'convex/react';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LocationPopup } from '@/components/location-popup';
import type { Place } from '@/data/places';
import { api } from '../../convex/_generated/api';

const HARVARD_YARD: [number, number] = [-71.1167, 42.377];

export default function MapScreen() {
  const cameraRef = useRef<CameraRef>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userCoordinates, setUserCoordinates] =
    useState<[number, number] | null>(null);
  const [locationMessage, setLocationMessage] =
    useState('Finding your location...');

  const locations = useQuery(api.locations.getLocations);

  const places: Place[] = (locations ?? []).flatMap((location) => {
    if (location.latitude === undefined || location.longitude === undefined) {
      return [];
    }

    return [
      {
        id: location._id,
        title: location.name,
        description: location.description,
        coordinates: [
          location.longitude,
          location.latitude,
        ] as [number, number],
      },
    ];
  });

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentLocation() {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();

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

        if (permission.status !== Location.PermissionStatus.GRANTED) {
          if (isMounted) {
            setLocationMessage('Location permission was not granted.');
          }
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
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
          setLocationMessage('Unable to find your current location.');
        }
      }
    }

    loadCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const startingCenter = userCoordinates ?? HARVARD_YARD;

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

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle="https://tiles.openfreemap.org/styles/liberty">
        <Camera
          ref={cameraRef}
          key={userCoordinates ? 'user-location' : 'harvard-yard'}
          initialViewState={{
            center: startingCenter,
            zoom: 15,
          }}
        />

        {places.map((place) => (
          <Marker
            key={place.id}
            id={place.id}
            lngLat={place.coordinates}
            anchor="bottom"
            onPress={() => setSelectedPlace(place)}>
            <View
              style={[
                styles.pin,
                selectedPlace?.id === place.id && styles.selectedPin,
              ]}>
              <View style={styles.pinCenter} />
            </View>
          </Marker>
        ))}

        {userCoordinates && (
          <Marker
            id="current-user-location"
            lngLat={userCoordinates}
            anchor="center">
            <View style={styles.userLocationOuter}>
              <View style={styles.userLocationInner} />
            </View>
          </Marker>
        )}
      </Map>

      {locationMessage !== '' && (
        <View
          accessibilityLiveRegion="polite"
          style={styles.locationMessage}>
          <Text style={styles.locationMessageText}>{locationMessage}</Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recenter map on my location"
        accessibilityHint="Moves the map back to your current position"
        disabled={!userCoordinates}
        onPress={recenterMap}
        style={({ pressed }) => [
          styles.recenterButton,
          !userCoordinates && styles.recenterButtonDisabled,
          pressed && styles.recenterButtonPressed,
        ]}>
        <Text
          accessible={false}
          style={styles.recenterButtonIcon}>
          ◎
        </Text>
      </Pressable>

      {selectedPlace && (
        <LocationPopup
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  selectedPin: {
    width: 36,
    height: 36,
    backgroundColor: '#8b0000',
    borderRadius: 18,
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
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  locationMessageText: {
    color: '#ffffff',
    fontSize: 14,
  },
  recenterButton: {
    position: 'absolute',
    right: 18,
    bottom: 28,
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
});