import {
  GeoJSONSource,
  Layer,
} from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';

import type { Place } from '@/data/places';

type LocationPinLayerProps = {
  onSelect: (place: Place) => void;
  places: Place[];
  selectedPlaceId?: string;
  visitedLocationIds: ReadonlySet<string>;
};

export function LocationPinLayer({
  onSelect,
  places,
  selectedPlaceId,
  visitedLocationIds,
}: LocationPinLayerProps) {
  const featureCollection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: places.map((place) => ({
        type: 'Feature' as const,
        id: place.id,
        properties: {
          placeId: place.id,
          selected: selectedPlaceId === place.id,
          visited: visitedLocationIds.has(place.id),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: place.coordinates,
        },
      })),
    }),
    [places, selectedPlaceId, visitedLocationIds],
  );

  return (
    <GeoJSONSource
      data={featureCollection}
      hitbox={{ top: 14, right: 14, bottom: 14, left: 14 }}
      id="location-pins"
      onPress={(event) => {
        const placeId =
          event.nativeEvent.features[0]?.properties?.placeId;

        if (typeof placeId !== 'string') {
          return;
        }

        const place = places.find(
          (candidate) => candidate.id === placeId,
        );

        if (place !== undefined) {
          onSelect(place);
        }
      }}>
      <Layer
        id="location-pin-shadow"
        type="circle"
        paint={{
          'circle-color': '#000000',
          'circle-opacity': 0.22,
          'circle-pitch-alignment': 'viewport',
          'circle-radius': 18,
          'circle-translate': [0, 2],
          'circle-translate-anchor': 'viewport',
        }}
      />

      <Layer
        id="location-pin-available"
        type="circle"
        filter={[
          'all',
          ['==', ['get', 'visited'], false],
          ['==', ['get', 'selected'], false],
        ]}
        paint={{
          'circle-color': '#C62828',
          'circle-pitch-alignment': 'viewport',
          'circle-radius': 14,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 3,
        }}
      />

      <Layer
        id="location-pin-available-selected"
        type="circle"
        filter={[
          'all',
          ['==', ['get', 'visited'], false],
          ['==', ['get', 'selected'], true],
        ]}
        paint={{
          'circle-color': '#8B0000',
          'circle-pitch-alignment': 'viewport',
          'circle-radius': 18,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 3,
        }}
      />

      <Layer
        id="location-pin-visited"
        type="circle"
        filter={[
          'all',
          ['==', ['get', 'visited'], true],
          ['==', ['get', 'selected'], false],
        ]}
        paint={{
          'circle-color': '#18864B',
          'circle-pitch-alignment': 'viewport',
          'circle-radius': 14,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 3,
        }}
      />

      <Layer
        id="location-pin-visited-selected"
        type="circle"
        filter={[
          'all',
          ['==', ['get', 'visited'], true],
          ['==', ['get', 'selected'], true],
        ]}
        paint={{
          'circle-color': '#0E5A31',
          'circle-pitch-alignment': 'viewport',
          'circle-radius': 18,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 3,
        }}
      />

      <Layer
        id="location-pin-available-center"
        type="circle"
        filter={['==', ['get', 'visited'], false]}
        paint={{
          'circle-color': '#FFFFFF',
          'circle-pitch-alignment': 'viewport',
          'circle-radius': 4,
        }}
      />

      <Layer
        id="location-pin-visited-center"
        type="circle"
        filter={['==', ['get', 'visited'], true]}
        paint={{
          'circle-color': '#FFFFFF',
          'circle-pitch-alignment': 'viewport',
          'circle-radius': 6,
        }}
      />

      <Layer
        id="location-pin-visited-center-fill"
        type="circle"
        filter={['==', ['get', 'visited'], true]}
        paint={{
          'circle-color': '#18864B',
          'circle-pitch-alignment': 'viewport',
          'circle-radius': 3,
        }}
      />
    </GeoJSONSource>
  );
}
