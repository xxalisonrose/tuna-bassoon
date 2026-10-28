import type { FeatureCollection, Point } from 'geojson';
import { Asset } from 'expo-asset';
import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  useConvexAuth,
  useMutation,
  useQuery,
} from 'convex/react';
import { createRoot, type Root } from 'react-dom/client';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BetaFeedbackModal } from '@/components/beta-feedback-modal';
import { LocationPopup } from '@/components/location-popup';
import {
  AdminLocationSimulator,
  type SimulatorDirection,
} from '@/components/map/admin-location-simulator';
import { PlayerMarker } from '@/components/map/player-marker';
import { Palette, Spacing } from '@/constants/theme';
import type { Place } from '@/data/places';
import { isBetaBuild } from '@/lib/build-profile';
import {
  getLocationCityOptions,
  getLocationStateOptions,
  getPlaceLocality,
  placeMatchesGeography,
} from '@/lib/location-geography';
import { usesWomensHistoryPersonPin } from '@/lib/location-map-pin';
import { api } from '../../convex/_generated/api';

const HARVARD_YARD: [number, number] = [-71.1167, 42.377];
const STORYBOOK_MAP_STYLE =
  'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_ZOOM = 17.7;
const DEFAULT_PITCH = 55;
const PLAYER_MARKER_WIDTH = 116;
const PLAYER_MARKER_HEIGHT = 126;
const PLAYER_SCREEN_Y_RATIO = 0.7;
const SIMULATOR_STEP_METERS = 10;
const EARTH_RADIUS_METERS = 6_371_000;
const PIN_SOURCE_ID = 'web-location-pins';
const PIN_HIT_LAYER_ID = 'web-location-pins-hit';

function getPlayerCameraOffset(
  map: MapLibreMap | null,
): [number, number] {
  return [
    0,
    (map?.getContainer().clientHeight ?? 0) *
      (PLAYER_SCREEN_Y_RATIO - 0.5),
  ];
}

type LocationPinProperties = {
  personVariant: 'general' | 'women_history';
  placeId: string;
  pinType: Place['mapPinType'];
  selected: boolean;
  visited: boolean;
};

const pinImageSources = {
  'historic-sites-unvisited': Asset.fromModule(
    require('../../assets/images/map-pins/historic-sites-unvisited.png'),
  ).uri,
  'historic-sites-visited': Asset.fromModule(
    require('../../assets/images/map-pins/historic-sites-visited.png'),
  ).uri,
  'monuments-public-art-unvisited': Asset.fromModule(
    require('../../assets/images/map-pins/monuments-public-art-unvisited.png'),
  ).uri,
  'monuments-public-art-visited': Asset.fromModule(
    require('../../assets/images/map-pins/monuments-public-art-visited.png'),
  ).uri,
  'mystery-lore-unvisited': Asset.fromModule(
    require('../../assets/images/map-pins/mystery-lore-unvisited.png'),
  ).uri,
  'mystery-lore-visited': Asset.fromModule(
    require('../../assets/images/map-pins/mystery-lore-visited.png'),
  ).uri,
  'noteworthy-people-unvisited': Asset.fromModule(
    require('../../assets/images/map-pins/noteworthy-people-unvisited.png'),
  ).uri,
  'noteworthy-people-visited': Asset.fromModule(
    require('../../assets/images/map-pins/noteworthy-people-visited.png'),
  ).uri,
  'other-discovery-unvisited': Asset.fromModule(
    require('../../assets/images/map-pins/other-discovery-unvisited.png'),
  ).uri,
  'other-discovery-visited': Asset.fromModule(
    require('../../assets/images/map-pins/other-discovery-visited.png'),
  ).uri,
  'womens-history-unvisited': Asset.fromModule(
    require('../../assets/images/map-pins/womens-history-unvisited.png'),
  ).uri,
  'womens-history-visited': Asset.fromModule(
    require('../../assets/images/map-pins/womens-history-visited.png'),
  ).uri,
};

function moveCoordinates(
  coordinates: [number, number],
  bearingDegrees: number,
  distanceMeters: number,
): [number, number] {
  const [longitude, latitude] = coordinates;
  const bearingRadians = bearingDegrees * (Math.PI / 180);
  const latitudeRadians = latitude * (Math.PI / 180);
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const nextLatitude =
    latitude +
    angularDistance * Math.cos(bearingRadians) * (180 / Math.PI);
  const longitudeScale = Math.max(
    Math.abs(Math.cos(latitudeRadians)),
    0.000001,
  );
  const nextLongitude =
    longitude +
    (angularDistance * Math.sin(bearingRadians)) /
      longitudeScale *
      (180 / Math.PI);

  return [
    ((nextLongitude + 180) % 360 + 360) % 360 - 180,
    Math.max(-90, Math.min(90, nextLatitude)),
  ];
}

function createPinData(
  places: Place[],
  visitedLocationIds: ReadonlySet<string>,
  selectedPlaceId: string | undefined,
): FeatureCollection<Point, LocationPinProperties> {
  return {
    type: 'FeatureCollection',
    features: places.map((place) => ({
      type: 'Feature',
      id: place.id,
      properties: {
        personVariant: usesWomensHistoryPersonPin(place.badges)
          ? 'women_history'
          : 'general',
        placeId: place.id,
        pinType: place.mapPinType,
        selected: place.id === selectedPlaceId,
        visited: visitedLocationIds.has(place.id),
      },
      geometry: {
        type: 'Point',
        coordinates: place.coordinates,
      },
    })),
  };
}

async function addPinArtwork(map: MapLibreMap) {
  for (const [name, uri] of Object.entries(pinImageSources)) {
    if (map.hasImage(name)) {
      continue;
    }

    const image = await map.loadImage(uri);

    if (!map.hasImage(name)) {
      map.addImage(name, image.data);
    }
  }

  if (!map.getLayer('web-location-pin-artwork')) {
    map.addLayer({
      id: 'web-location-pin-artwork',
      type: 'symbol',
      source: PIN_SOURCE_ID,
      layout: {
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-image': [
          'case',
          [
            'all',
            ['==', ['get', 'pinType'], 'historic_sites'],
            ['==', ['get', 'visited'], true],
          ],
          'historic-sites-visited',
          ['==', ['get', 'pinType'], 'historic_sites'],
          'historic-sites-unvisited',
          [
            'all',
            ['==', ['get', 'pinType'], 'monuments_public_art'],
            ['==', ['get', 'visited'], true],
          ],
          'monuments-public-art-visited',
          ['==', ['get', 'pinType'], 'monuments_public_art'],
          'monuments-public-art-unvisited',
          [
            'all',
            ['==', ['get', 'pinType'], 'mystery_lore'],
            ['==', ['get', 'visited'], true],
          ],
          'mystery-lore-visited',
          ['==', ['get', 'pinType'], 'mystery_lore'],
          'mystery-lore-unvisited',
          [
            'all',
            ['==', ['get', 'pinType'], 'noteworthy_people'],
            ['==', ['get', 'personVariant'], 'women_history'],
            ['==', ['get', 'visited'], true],
          ],
          'womens-history-visited',
          [
            'all',
            ['==', ['get', 'pinType'], 'noteworthy_people'],
            ['==', ['get', 'personVariant'], 'women_history'],
          ],
          'womens-history-unvisited',
          [
            'all',
            ['==', ['get', 'pinType'], 'noteworthy_people'],
            ['==', ['get', 'visited'], true],
          ],
          'noteworthy-people-visited',
          ['==', ['get', 'pinType'], 'noteworthy_people'],
          'noteworthy-people-unvisited',
          ['==', ['get', 'visited'], true],
          'other-discovery-visited',
          'other-discovery-unvisited',
        ],
        'icon-size': [
          'case',
          ['==', ['get', 'selected'], true],
          0.25,
          0.2,
        ],
      },
    });
  }
}

function addPinLayers(map: MapLibreMap) {
  map.addSource(PIN_SOURCE_ID, {
    type: 'geojson',
    data: createPinData([], new Set(), undefined),
  });

  map.addLayer({
    id: 'web-location-pin-shadow',
    type: 'circle',
    source: PIN_SOURCE_ID,
    paint: {
      'circle-color': '#000000',
      'circle-opacity': 0.22,
      'circle-radius': [
        'case',
        ['==', ['get', 'selected'], true],
        21,
        17,
      ],
      'circle-translate': [0, 2],
    },
  });

  map.addLayer({
    id: 'web-location-pin-color',
    type: 'circle',
    source: PIN_SOURCE_ID,
    paint: {
      'circle-color': [
        'case',
        ['==', ['get', 'visited'], true],
        '#18864B',
        '#C62828',
      ],
      'circle-radius': [
        'case',
        ['==', ['get', 'selected'], true],
        18,
        14,
      ],
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 3,
    },
  });

  map.addLayer({
    id: PIN_HIT_LAYER_ID,
    type: 'circle',
    source: PIN_SOURCE_ID,
    paint: {
      'circle-color': '#000000',
      'circle-opacity': 0,
      'circle-radius': 25,
    },
  });
}

function showBrowserMessage(message: string) {
  if (typeof window !== 'undefined') {
    window.alert(message);
  }
}

export default function MapWebScreen() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const playerMarkerRef = useRef<MapLibreMarker | null>(null);
  const playerRootRef = useRef<Root | null>(null);
  const placesRef = useRef<Place[]>([]);
  const hasCenteredOnPlayerRef = useRef(false);
  const betaStarterRequestRef = useRef(false);

  const { isAuthenticated } = useConvexAuth();
  const locations = useQuery(api.locations.getLocations, {
    includeBeta: isBetaBuild,
  });
  const visits = useQuery(
    api.visits.getMyVisits,
    isAuthenticated ? {} : 'skip',
  );
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );
  const avatarProfile = useQuery(
    api.users.getMyAvatarProfile,
    isAuthenticated ? {} : 'skip',
  );
  const wishlist = useQuery(
    api.wishlist.getMyWishlist,
    isAuthenticated ? {} : 'skip',
  );
  const resetMyTestingProgress = useMutation(
    api.visits.resetMyTestingProgress,
  );
  const awardMyTestBadgeLevel = useMutation(
    api.visits.awardMyTestBadgeLevel,
  );
  const setWishlistStatus = useMutation(
    api.wishlist.setWishlistStatus,
  );
  const ensureBetaStarterContent = useMutation(
    api.betaStarter.ensureMyStarterContent,
  );

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [locationListVisible, setLocationListVisible] = useState(false);
  const [betaFeedbackVisible, setBetaFeedbackVisible] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [wishlistChangingId, setWishlistChangingId] =
    useState<string | null>(null);
  const [liveCoordinates, setLiveCoordinates] =
    useState<[number, number] | null>(null);
  const [simulatedCoordinates, setSimulatedCoordinates] =
    useState<[number, number]>(HARVARD_YARD);
  const [simulatedLocationEnabled, setSimulatedLocationEnabled] =
    useState(false);
  const [locationMessage, setLocationMessage] = useState(() =>
    typeof navigator !== 'undefined' && navigator.geolocation
      ? 'Requesting browser location...'
      : 'Browser location is unavailable. Admin Test GPS still works.',
  );
  const [resettingTestProgress, setResettingTestProgress] =
    useState(false);
  const [awardingTestBadge, setAwardingTestBadge] = useState(false);
  const [betaFallbackReady, setBetaFallbackReady] =
    useState(false);

  const isAdmin = currentUser?.isAdmin === true;
  const canSubmitBetaFeedback =
    isAuthenticated && (isBetaBuild || isAdmin);
  const simulationIsActive = isAdmin && simulatedLocationEnabled;
  const betaFallbackCoordinates = useMemo(() => {
    const baseCamp = locations?.find(
      (location) =>
        location.betaOnly === true &&
        location.betaStarterKey === 'base-camp' &&
        location.latitude !== undefined &&
        location.longitude !== undefined,
    );

    return baseCamp?.latitude === undefined ||
      baseCamp.longitude === undefined
      ? null
      : ([baseCamp.longitude, baseCamp.latitude] as [number, number]);
  }, [locations]);
  const userCoordinates = simulationIsActive
    ? simulatedCoordinates
    : liveCoordinates ?? betaFallbackCoordinates;
  const displayedLocationMessage =
    liveCoordinates === null && betaFallbackCoordinates !== null
      ? 'Private beta tutorial mode is active.'
      : locationMessage;

  const places: Place[] = useMemo(
    () =>
      (locations ?? []).flatMap((location) => {
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
            funFact: location.funFact,
            source: location.source,
            isLore: location.isLore === true,
            category: location.category,
            city: location.city,
            state: location.state,
            mapPinType: location.mapPinType,
            badges: location.badges,
            betaOnly: location.betaOnly === true,
            coordinates: [
              location.longitude,
              location.latitude,
            ] as [number, number],
          },
        ];
      }),
    [locations],
  );

  const visitedLocationIds = useMemo(
    () =>
      new Set((visits ?? []).map((visit) => visit.locationId)),
    [visits],
  );

  const wishlistLocationIds = useMemo(
    () =>
      new Set(
        (wishlist ?? []).map((entry) => entry.locationId),
      ),
    [wishlist],
  );

  const filteredPlaces = useMemo(() => {
    const search = locationSearch.trim().toLowerCase();

    return [...places]
      .filter((place) => {
        if (wishlistOnly && !wishlistLocationIds.has(place.id)) {
          return false;
        }

        if (!placeMatchesGeography(place, selectedState, selectedCity)) {
          return false;
        }

        if (search === '') {
          return true;
        }

        return [
          place.title,
          place.category ?? '',
          place.city ?? '',
          place.state ?? '',
          place.description,
          ...place.badges,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search);
      })
      .sort((first, second) =>
        first.title.localeCompare(second.title),
      );
  }, [
    locationSearch,
    places,
    selectedCity,
    selectedState,
    wishlistLocationIds,
    wishlistOnly,
  ]);

  const stateOptions = useMemo(
    () => getLocationStateOptions(places),
    [places],
  );
  const cityOptions = useMemo(
    () => getLocationCityOptions(places, selectedState),
    [places, selectedState],
  );

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  useEffect(() => {
    if (!isBetaBuild || !isAuthenticated || liveCoordinates !== null) {
      return;
    }

    const timer = setTimeout(() => {
      setBetaFallbackReady(true);
    }, 8_000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, liveCoordinates]);

  useEffect(() => {
    if (!isAuthenticated) {
      betaStarterRequestRef.current = false;
      return;
    }

    const starterOrigin =
      liveCoordinates ?? (betaFallbackReady ? HARVARD_YARD : null);

    if (
      !isBetaBuild ||
      starterOrigin === null ||
      betaStarterRequestRef.current
    ) {
      return;
    }

    betaStarterRequestRef.current = true;

    void ensureBetaStarterContent({
      latitude: starterOrigin[1],
      longitude: starterOrigin[0],
      releaseChannel: 'beta',
    }).catch(() => {
      betaStarterRequestRef.current = false;
    });
  }, [
    betaFallbackReady,
    ensureBetaStarterContent,
    isAuthenticated,
    liveCoordinates,
  ]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    setWorkerUrl(
      new URL(
        '/maplibre-gl-worker.mjs',
        window.location.origin,
      ).toString(),
    );

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: STORYBOOK_MAP_STYLE,
      center: HARVARD_YARD,
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
      bearing: 0,
      minZoom: 12,
      maxZoom: 20,
      attributionControl: { compact: true },
      dragRotate: true,
      pitchWithRotate: true,
    });

    mapRef.current = map;
    map.addControl(
      new NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      'top-right',
    );

    const handlePinClick = (event: MapLayerMouseEvent) => {
      const placeId = event.features?.[0]?.properties?.placeId;

      if (typeof placeId !== 'string') {
        return;
      }

      const place = placesRef.current.find(
        (candidate) => candidate.id === placeId,
      );

      if (place) {
        setSelectedPlace(place);
        setLocationListVisible(false);
      }
    };

    const showPointer = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const hidePointer = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('load', () => {
      addPinLayers(map);
      setMapReady(true);

      void addPinArtwork(map).catch(() => {
        // Colored fallback circles remain usable if an image cannot load.
      });

      map.on('click', PIN_HIT_LAYER_ID, handlePinClick);
      map.on('mouseenter', PIN_HIT_LAYER_ID, showPointer);
      map.on('mouseleave', PIN_HIT_LAYER_ID, hidePointer);
    });

    map.on('error', (event) => {
      if (!map.loaded()) {
        setMapError(
          event.error?.message ?? 'Unable to load the browser map.',
        );
      }
    });

    return () => {
      playerMarkerRef.current?.remove();
      playerMarkerRef.current = null;
      const playerRoot = playerRootRef.current;
      playerRootRef.current = null;
      map.remove();
      mapRef.current = null;

      if (playerRoot) {
        window.setTimeout(() => {
          playerRoot.unmount();
        }, 0);
      }
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLiveCoordinates([
          position.coords.longitude,
          position.coords.latitude,
        ]);
        setLocationMessage('');
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Allow browser location access to use your real position.',
          2: 'The browser could not determine your position.',
          3: 'Browser location timed out. You can retry or use Test GPS.',
        };

        setLocationMessage(
          messages[error.code] ?? 'Browser location is unavailable.',
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 12000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const source = mapRef.current?.getSource(
      PIN_SOURCE_ID,
    ) as GeoJSONSource | undefined;

    source?.setData(
      createPinData(
        places,
        visitedLocationIds,
        selectedPlace?.id,
      ),
    );
  }, [mapReady, places, selectedPlace?.id, visitedLocationIds]);

  useEffect(() => {
    const map = mapRef.current;

    if (!mapReady || !map) {
      return;
    }

    if (!userCoordinates) {
      playerMarkerRef.current?.remove();
      playerMarkerRef.current = null;
      playerRootRef.current?.unmount();
      playerRootRef.current = null;
      hasCenteredOnPlayerRef.current = false;
      return;
    }

    if (!playerMarkerRef.current) {
      const markerElement = document.createElement('div');
      markerElement.style.width = `${PLAYER_MARKER_WIDTH}px`;
      markerElement.style.height = `${PLAYER_MARKER_HEIGHT}px`;
      markerElement.style.pointerEvents = 'none';
      markerElement.setAttribute('aria-hidden', 'true');

      playerRootRef.current = createRoot(markerElement);
      playerMarkerRef.current = new MapLibreMarker({
        element: markerElement,
        anchor: 'bottom',
      })
        .setLngLat(userCoordinates)
        .addTo(map);
    } else {
      playerMarkerRef.current.setLngLat(userCoordinates);
    }

    playerRootRef.current?.render(
      <PlayerMarker
        presetId={avatarProfile?.avatarPresetId}
        selection={avatarProfile?.selection}
      />,
    );

    if (!hasCenteredOnPlayerRef.current) {
      hasCenteredOnPlayerRef.current = true;
      map.easeTo({
        center: userCoordinates,
        offset: getPlayerCameraOffset(map),
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
        duration: 850,
      });
    }
  }, [
    avatarProfile?.avatarPresetId,
    avatarProfile?.selection,
    mapReady,
    userCoordinates,
  ]);

  const recenterMap = () => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const target = userCoordinates ?? HARVARD_YARD;

    map.easeTo({
      center: target,
      offset: getPlayerCameraOffset(map),
      zoom: Math.max(map.getZoom(), 16),
      pitch: DEFAULT_PITCH,
      duration: 900,
    });
  };

  const selectPlace = (place: Place) => {
    setSelectedPlace(place);
    setLocationListVisible(false);

    mapRef.current?.easeTo({
      center: place.coordinates,
      duration: 700,
    });
  };

  const changeWishlistStatus = async (
    place: Place,
    saved: boolean,
  ) => {
    if (!isAuthenticated || wishlistChangingId !== null) {
      return;
    }

    setWishlistChangingId(place.id);

    try {
      await setWishlistStatus({
        locationId: place.id,
        saved,
      });
    } catch (error) {
      showBrowserMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update the wishlist right now.',
      );
    } finally {
      setWishlistChangingId(null);
    }
  };

  const changeSimulationEnabled = (enabled: boolean) => {
    setSimulatedLocationEnabled(enabled);

    if (enabled) {
      setSimulatedCoordinates(HARVARD_YARD);
      hasCenteredOnPlayerRef.current = true;
      mapRef.current?.easeTo({
        center: HARVARD_YARD,
        offset: getPlayerCameraOffset(mapRef.current),
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
        duration: 800,
      });
      return;
    }

    hasCenteredOnPlayerRef.current = false;

    if (liveCoordinates) {
      mapRef.current?.easeTo({
        center: liveCoordinates,
        offset: getPlayerCameraOffset(mapRef.current),
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
        duration: 800,
      });
    }
  };

  const moveTestPlayer = (coordinates: [number, number]) => {
    setSimulatedCoordinates(coordinates);
    const map = mapRef.current;

    map?.easeTo({
      center: coordinates,
      offset: getPlayerCameraOffset(map),
      duration: 450,
    });
  };

  const walkTestPlayer = (direction: SimulatorDirection) => {
    const directionOffset: Record<SimulatorDirection, number> = {
      up: 0,
      right: 90,
      down: 180,
      left: -90,
    };
    const bearing = mapRef.current?.getBearing() ?? 0;

    setSimulatedCoordinates((currentCoordinates) => {
      const nextCoordinates = moveCoordinates(
        currentCoordinates,
        bearing + directionOffset[direction],
        SIMULATOR_STEP_METERS,
      );

      const map = mapRef.current;

      map?.easeTo({
        center: nextCoordinates,
        offset: getPlayerCameraOffset(map),
        duration: 300,
      });

      return nextCoordinates;
    });
  };

  const resetTestProgress = async () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Reset your test check-ins, badge progress, and earned badges?',
      )
    ) {
      return;
    }

    setResettingTestProgress(true);

    try {
      const result = await resetMyTestingProgress();
      setSelectedPlace(null);
      showBrowserMessage(
        `Test progress reset. Removed ${result.deletedVisits} check-ins and ${result.deletedAwards} earned badges.`,
      );
    } catch (error) {
      showBrowserMessage(
        error instanceof Error
          ? error.message
          : 'Unable to reset test progress.',
      );
    } finally {
      setResettingTestProgress(false);
    }
  };

  const awardTestBadge = async () => {
    if (awardingTestBadge) {
      return;
    }

    setAwardingTestBadge(true);

    try {
      const result = await awardMyTestBadgeLevel();
      showBrowserMessage(
        `${result.badgeName}, test Level ${result.level}, was awarded.`,
      );
    } catch (error) {
      showBrowserMessage(
        error instanceof Error
          ? error.message
          : 'Unable to award a test badge.',
      );
    } finally {
      setAwardingTestBadge(false);
    }
  };

  return (
    <View style={styles.container}>
      <div
        ref={mapContainerRef}
        aria-label="Interactive Harvard map"
        role="application"
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />

      {!mapReady && !mapError && (
        <View style={styles.loadingCard}>
          <ActivityIndicator
            accessibilityLabel="Loading browser map"
            size="large"
          />
          <Text style={styles.loadingText}>Loading Harvard map...</Text>
        </View>
      )}

      {mapError && (
        <View
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={styles.errorCard}>
          <Text style={styles.errorTitle}>The web map needs attention</Text>
          <Text style={styles.errorText}>{mapError}</Text>
        </View>
      )}

      {displayedLocationMessage !== '' && !simulationIsActive && (
        <View
          accessibilityLiveRegion="polite"
          style={styles.locationMessage}>
          <Text style={styles.locationMessageText}>
            {displayedLocationMessage}
          </Text>
        </View>
      )}

      <View style={styles.controlStack}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Locations list"
          onPress={() => {
            setLocationListVisible((current) => !current);
            setSelectedPlace(null);
          }}
          style={({ pressed }) => [
            styles.mapButton,
            pressed && styles.pressed,
          ]}>
          <Text accessible={false} style={styles.mapButtonIcon}>☷</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recenter map on my explorer"
          onPress={recenterMap}
          style={({ pressed }) => [
            styles.mapButton,
            pressed && styles.pressed,
          ]}>
          <Text accessible={false} style={styles.mapButtonIcon}>⌖</Text>
        </Pressable>
      </View>

      {canSubmitBetaFeedback &&
      !locationListVisible &&
      !selectedPlace &&
      !betaFeedbackVisible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send beta feedback"
          accessibilityHint="Opens a private feedback form for the Lorcal team"
          onPress={() => setBetaFeedbackVisible(true)}
          style={({ pressed }) => [
            styles.betaFeedbackButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.betaFeedbackEyebrow}>BETA</Text>
          <Text style={styles.betaFeedbackButtonText}>Feedback</Text>
        </Pressable>
      ) : null}

      {isAdmin && (
        <AdminLocationSimulator
          awardingBadge={awardingTestBadge}
          coordinates={simulatedCoordinates}
          enabled={simulatedLocationEnabled}
          onAwardBadge={awardTestBadge}
          onCoordinatesChange={moveTestPlayer}
          onEnabledChange={changeSimulationEnabled}
          onResetProgress={resetTestProgress}
          onStep={walkTestPlayer}
          resettingProgress={resettingTestProgress}
          top={278}
        />
      )}

      {locationListVisible && (
        <View
          accessibilityViewIsModal
          style={styles.locationListCard}>
          <View style={styles.locationListHeader}>
            <View style={styles.locationListHeading}>
              <Text
                accessibilityRole="header"
                style={styles.locationListTitle}>
                Locations
              </Text>
              <Text style={styles.locationListCount}>
                {filteredPlaces.length} shown
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close locations list"
              onPress={() => setLocationListVisible(false)}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}>
              <Text accessible={false} style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <TextInput
            accessibilityLabel="Find a location"
            onChangeText={setLocationSearch}
            placeholder="Type a location to plan a visit"
            placeholderTextColor="#6B6B60"
            style={styles.searchInput}
            value={locationSearch}
          />

          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Filter locations"
            style={styles.locationListFilters}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: !wishlistOnly }}
              onPress={() => setWishlistOnly(false)}
              style={({ pressed }) => [
                styles.locationListFilter,
                !wishlistOnly && styles.locationListFilterSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.locationListFilterText}>All</Text>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: wishlistOnly }}
              onPress={() => setWishlistOnly(true)}
              style={({ pressed }) => [
                styles.locationListFilter,
                wishlistOnly && styles.locationListFilterSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.locationListFilterText}>
                Want to Visit ({wishlistLocationIds.size})
              </Text>
            </Pressable>
          </View>

          {stateOptions.length > 0 ? (
            <View style={styles.geographyFilters}>
              <Text style={styles.geographyFilterLabel}>State</Text>
              <ScrollView
                horizontal
                accessibilityRole="radiogroup"
                accessibilityLabel="Filter by state"
                contentContainerStyle={styles.geographyFilterOptions}
                showsHorizontalScrollIndicator={false}>
                {['', ...stateOptions].map((stateOption) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedState === stateOption }}
                    key={stateOption || 'all-states'}
                    onPress={() => {
                      setSelectedState(stateOption);
                      setSelectedCity('');
                    }}
                    style={({ pressed }) => [
                      styles.locationListFilter,
                      selectedState === stateOption &&
                        styles.locationListFilterSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.locationListFilterText}>
                      {stateOption || 'All states'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {cityOptions.length > 0 ? (
                <>
                  <Text style={styles.geographyFilterLabel}>City</Text>
                  <ScrollView
                    horizontal
                    accessibilityRole="radiogroup"
                    accessibilityLabel="Filter by city"
                    contentContainerStyle={styles.geographyFilterOptions}
                    showsHorizontalScrollIndicator={false}>
                    {['', ...cityOptions].map((cityOption) => (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ selected: selectedCity === cityOption }}
                        key={cityOption || 'all-cities'}
                        onPress={() => setSelectedCity(cityOption)}
                        style={({ pressed }) => [
                          styles.locationListFilter,
                          selectedCity === cityOption &&
                            styles.locationListFilterSelected,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={styles.locationListFilterText}>
                          {cityOption || 'All cities'}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.locationListContent}
            showsVerticalScrollIndicator>
            {locations === undefined ? (
              <ActivityIndicator
                accessibilityLabel="Loading locations"
                size="small"
              />
            ) : filteredPlaces.length === 0 ? (
              <Text style={styles.emptyText}>No locations match that search.</Text>
            ) : (
              filteredPlaces.map((place) => {
                const visited = visitedLocationIds.has(place.id);
                const isWishlisted = wishlistLocationIds.has(place.id);

                return (
                  <View
                    key={place.id}
                    style={styles.locationListItem}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        `${place.title}. ${visited ? 'Visited' : 'Not visited'}.` +
                        `${isWishlisted ? ' Want to visit.' : ''}`
                      }
                      onPress={() => selectPlace(place)}
                      style={({ pressed }) => [
                        styles.locationListItemMain,
                        pressed && styles.pressed,
                      ]}>
                      <View
                        accessible={false}
                        style={[
                          styles.locationStatus,
                          visited && styles.locationStatusVisited,
                        ]}
                      />
                      <View style={styles.locationListItemText}>
                        <Text style={styles.locationName}>{place.title}</Text>
                        <Text
                          numberOfLines={1}
                          style={styles.locationCategory}>
                          {[getPlaceLocality(place), place.category ?? 'Harvard discovery']
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        isWishlisted
                          ? `Remove ${place.title} from Want to Visit`
                          : `Save ${place.title} to Want to Visit`
                      }
                      accessibilityState={{
                        busy: wishlistChangingId === place.id,
                      }}
                      disabled={wishlistChangingId !== null}
                      onPress={() =>
                        void changeWishlistStatus(place, !isWishlisted)
                      }
                      style={({ pressed }) => [
                        styles.locationListWishlistButton,
                        isWishlisted &&
                          styles.locationListWishlistButtonSaved,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.locationListWishlistText}>
                        {isWishlisted ? '♥' : '♡'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {selectedPlace && (
        <LocationPopup
          isWishlisted={wishlistLocationIds.has(selectedPlace.id)}
          onClose={() => setSelectedPlace(null)}
          onWishlistChange={(saved) =>
            void changeWishlistStatus(selectedPlace, saved)
          }
          place={selectedPlace}
          style={styles.locationPopup}
          userCoordinates={userCoordinates}
          usingTestCoordinates={simulationIsActive}
          wishlistBusy={wishlistChangingId === selectedPlace.id}
        />
      )}

      <BetaFeedbackModal
        onClose={() => setBetaFeedbackVisible(false)}
        visible={betaFeedbackVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 520,
    overflow: 'hidden',
    backgroundColor: '#D8DEC8',
  },
  loadingCard: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    backgroundColor: 'rgba(255, 253, 242, 0.96)',
    borderRadius: Spacing.three,
    transform: [{ translateX: -120 }, { translateY: -60 }],
  },
  loadingText: {
    color: Palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  errorCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    maxWidth: 420,
    gap: Spacing.one,
    padding: Spacing.three,
    backgroundColor: '#FFF1F0',
    borderColor: Palette.danger,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  errorTitle: {
    color: Palette.danger,
    fontSize: 16,
    fontWeight: '800',
  },
  errorText: {
    color: Palette.ink,
  },
  locationMessage: {
    position: 'absolute',
    top: 16,
    left: 16,
    maxWidth: 420,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(255, 253, 242, 0.95)',
    borderRadius: Spacing.two,
  },
  locationMessageText: {
    color: Palette.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  controlStack: {
    position: 'absolute',
    top: 130,
    right: 14,
    zIndex: 10,
    gap: Spacing.three,
  },
  mapButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 242, 0.97)',
    borderColor: Palette.borderStrong,
    borderWidth: 1,
    borderRadius: 26,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mapButtonIcon: {
    color: Palette.ink,
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 28,
  },
  betaFeedbackButton: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    zIndex: 10,
    minHeight: 48,
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(255, 253, 242, 0.97)',
    borderColor: Palette.bronzeDeep,
    borderWidth: 2,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  betaFeedbackEyebrow: {
    color: Palette.bronzeDeep,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  betaFeedbackButtonText: {
    color: Palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
  locationListCard: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    left: 16,
    width: '90%',
    maxWidth: 380,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 253, 242, 0.98)',
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: Spacing.three,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  locationListHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomColor: Palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationListHeading: {
    gap: 2,
  },
  locationListTitle: {
    color: Palette.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  locationListCount: {
    color: Palette.mutedInk,
    fontSize: 13,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.beige,
    borderRadius: 22,
  },
  closeButtonText: {
    color: Palette.ink,
    fontSize: 28,
    lineHeight: 30,
  },
  searchInput: {
    minHeight: 46,
    margin: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    color: Palette.ink,
    backgroundColor: Palette.paper,
    borderColor: Palette.borderStrong,
    borderWidth: 1,
    borderRadius: Spacing.two,
    fontSize: 15,
  },
  locationListFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  geographyFilters: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
  geographyFilterLabel: {
    color: Palette.mutedInk,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: Spacing.three,
    textTransform: 'uppercase',
  },
  geographyFilterOptions: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  locationListFilter: {
    backgroundColor: Palette.paper,
    borderColor: Palette.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  locationListFilterSelected: {
    backgroundColor: Palette.teaGreen,
    borderColor: Palette.bronzeDeep,
    borderWidth: 2,
  },
  locationListFilterText: {
    color: Palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  locationListContent: {
    gap: Spacing.two,
    padding: Spacing.three,
    paddingTop: Spacing.one,
  },
  locationListItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Palette.paper,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  locationListItemMain: {
    minHeight: 58,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  locationListWishlistButton: {
    alignItems: 'center',
    backgroundColor: Palette.beige,
    borderColor: Palette.borderStrong,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: Spacing.two,
    width: 40,
  },
  locationListWishlistButtonSaved: {
    backgroundColor: Palette.teaGreen,
    borderColor: Palette.bronzeDeep,
  },
  locationListWishlistText: {
    color: Palette.danger,
    fontSize: 22,
    lineHeight: 25,
  },
  locationStatus: {
    width: 14,
    height: 14,
    flexShrink: 0,
    backgroundColor: '#C62828',
    borderColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 7,
  },
  locationStatusVisited: {
    backgroundColor: '#18864B',
  },
  locationListItemText: {
    flex: 1,
    gap: 2,
  },
  locationName: {
    color: Palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  locationCategory: {
    color: Palette.mutedInk,
    fontSize: 13,
  },
  emptyText: {
    color: Palette.mutedInk,
    textAlign: 'center',
  },
  locationPopup: {
    maxWidth: 520,
  },
});
