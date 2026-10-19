import { GeoJSONSource, Images, Layer } from '@maplibre/maplibre-react-native';
import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import { useMemo } from 'react';

import type { Place } from '@/data/places';
import { usesWomensHistoryPersonPin } from '@/lib/location-map-pin';

const locationPinImages = {
  'historic-sites-unvisited': require('../../../assets/images/map-pins/historic-sites-unvisited.png'),
  'historic-sites-visited': require('../../../assets/images/map-pins/historic-sites-visited.png'),
  'monuments-public-art-unvisited': require('../../../assets/images/map-pins/monuments-public-art-unvisited.png'),
  'monuments-public-art-visited': require('../../../assets/images/map-pins/monuments-public-art-visited.png'),
  'mystery-lore-unvisited': require('../../../assets/images/map-pins/mystery-lore-unvisited.png'),
  'mystery-lore-visited': require('../../../assets/images/map-pins/mystery-lore-visited.png'),
  'noteworthy-people-unvisited': require('../../../assets/images/map-pins/noteworthy-people-unvisited.png'),
  'noteworthy-people-visited': require('../../../assets/images/map-pins/noteworthy-people-visited.png'),
  'other-discovery-unvisited': require('../../../assets/images/map-pins/other-discovery-unvisited.png'),
  'other-discovery-visited': require('../../../assets/images/map-pins/other-discovery-visited.png'),
  'womens-history-unvisited': require('../../../assets/images/map-pins/womens-history-unvisited.png'),
  'womens-history-visited': require('../../../assets/images/map-pins/womens-history-visited.png'),
};

type LocationPinArtworkLayerDefinition = {
  image: keyof typeof locationPinImages;
  personVariant?: 'general' | 'women_history';
  pinType: Place['mapPinType'];
  state: string;
  visited: boolean;
};

const locationPinArtworkLayers: readonly LocationPinArtworkLayerDefinition[] = [
  {
    image: 'historic-sites-unvisited',
    pinType: 'historic_sites',
    state: 'unvisited',
    visited: false,
  },
  {
    image: 'historic-sites-visited',
    pinType: 'historic_sites',
    state: 'visited',
    visited: true,
  },
  {
    image: 'monuments-public-art-unvisited',
    pinType: 'monuments_public_art',
    state: 'unvisited',
    visited: false,
  },
  {
    image: 'monuments-public-art-visited',
    pinType: 'monuments_public_art',
    state: 'visited',
    visited: true,
  },
  {
    image: 'mystery-lore-unvisited',
    pinType: 'mystery_lore',
    state: 'unvisited',
    visited: false,
  },
  {
    image: 'mystery-lore-visited',
    pinType: 'mystery_lore',
    state: 'visited',
    visited: true,
  },
  {
    image: 'noteworthy-people-unvisited',
    personVariant: 'general',
    pinType: 'noteworthy_people',
    state: 'unvisited',
    visited: false,
  },
  {
    image: 'noteworthy-people-visited',
    personVariant: 'general',
    pinType: 'noteworthy_people',
    state: 'visited',
    visited: true,
  },
  {
    image: 'womens-history-unvisited',
    personVariant: 'women_history',
    pinType: 'noteworthy_people',
    state: 'women-unvisited',
    visited: false,
  },
  {
    image: 'womens-history-visited',
    personVariant: 'women_history',
    pinType: 'noteworthy_people',
    state: 'women-visited',
    visited: true,
  },
  {
    image: 'other-discovery-unvisited',
    pinType: 'other_discoveries',
    state: 'unvisited',
    visited: false,
  },
  {
    image: 'other-discovery-visited',
    pinType: 'other_discoveries',
    state: 'visited',
    visited: true,
  },
];

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
          pinType: place.mapPinType,
          personVariant: usesWomensHistoryPersonPin(place.badges)
            ? 'women_history'
            : 'general',
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
    <>
      <Images images={locationPinImages} />

      <GeoJSONSource
        data={featureCollection}
        hitbox={{ top: 14, right: 14, bottom: 14, left: 14 }}
        id="location-pins"
        onPress={(event) => {
          const placeId = event.nativeEvent.features[0]?.properties?.placeId;

          if (typeof placeId !== 'string') {
            return;
          }

          const place = places.find((candidate) => candidate.id === placeId);

          if (place !== undefined) {
            onSelect(place);
          }
        }}
      >
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

        {locationPinArtworkLayers.map((artworkLayer) => {
          const filter: FilterSpecification = artworkLayer.personVariant
            ? [
                'all',
                ['==', ['get', 'visited'], artworkLayer.visited],
                ['==', ['get', 'pinType'], artworkLayer.pinType],
                [
                  '==',
                  ['get', 'personVariant'],
                  artworkLayer.personVariant,
                ],
              ]
            : [
                'all',
                ['==', ['get', 'visited'], artworkLayer.visited],
                ['==', ['get', 'pinType'], artworkLayer.pinType],
              ];

          return (
            <Layer
              key={`${artworkLayer.pinType}-${artworkLayer.state}`}
              id={`location-pin-artwork-${artworkLayer.pinType}-${artworkLayer.state}`}
              type="symbol"
              filter={filter}
              layout={{
                'icon-allow-overlap': true,
                'icon-anchor': 'center',
                'icon-ignore-placement': true,
                'icon-image': artworkLayer.image,
                'icon-size': 0.2,
              }}
            />
          );
        })}
      </GeoJSONSource>
    </>
  );
}
