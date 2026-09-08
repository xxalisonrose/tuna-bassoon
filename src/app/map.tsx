import {
  Camera,
  Map,
  Marker,
} from '@maplibre/maplibre-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LocationPopup } from '@/components/location-popup';
import { places, type Place } from '@/data/places';

const HARVARD_YARD: [number, number] = [-71.1167, 42.377];

export default function MapScreen() {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle="https://tiles.openfreemap.org/styles/liberty">
        <Camera
          initialViewState={{
            center: HARVARD_YARD,
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
      </Map>

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
});