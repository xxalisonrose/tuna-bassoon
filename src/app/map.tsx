import {
  Camera,
  type CameraRef,
  Map,
  type MapRef,
  Marker,
} from '@maplibre/maplibre-react-native';
import {
  useConvexAuth,
  useMutation,
  useQuery,
} from 'convex/react';
import * as Location from 'expo-location';
import {
  type ErrorBoundaryProps,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  type GestureResponderEvent,
  PanResponder,
  type PanResponderGestureState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BetaFeedbackModal } from '@/components/beta-feedback-modal';
import { LocationPopup } from '@/components/location-popup';
import {
  AdminLocationSimulator,
  type SimulatorDirection,
} from '@/components/map/admin-location-simulator';
import {
  MapModeButton,
  type MapInteractionMode,
} from '@/components/map/map-mode-button';
import { LocationPinLayer } from '@/components/map/location-pin-layer';
import { MapZoomControl } from '@/components/map/map-zoom-control';
import { PlayerMarker } from '@/components/map/player-marker';
import { StorybookMapLayers } from '@/components/map/storybook-map-layers';
import { BottomTabInset } from '@/constants/theme';
import { useAppTabBar } from '@/contexts/app-tab-bar-context';
import type { Place } from '@/data/places';
import { isBetaBuild } from '@/lib/build-profile';
import {
  getLocationCityOptions,
  getLocationStateOptions,
  getPlaceLocality,
  placeMatchesGeography,
} from '@/lib/location-geography';
import { api } from '../../convex/_generated/api';

const HARVARD_YARD: [number, number] = [-71.1167, 42.377];
const STORYBOOK_MAP_STYLE =
  'https://tiles.openfreemap.org/styles/liberty';
const LOOK_AROUND_PITCH = 55;
const LOOK_AROUND_ZOOM = 17.7;
const MINIMUM_MAP_ZOOM = 15;
const MAXIMUM_MAP_ZOOM = 19.5;
const MAP_CONTROL_SIZE = 52;
const MAP_CONTROL_GAP = 10;
const MAP_CONTROL_STEP =
  MAP_CONTROL_SIZE + MAP_CONTROL_GAP;
const PLAYER_MARKER_WIDTH = 116;
const PLAYER_MARKER_HEIGHT = 118;
const PLAYER_SCREEN_Y_RATIO = 0.7;
const LOCATION_PIN_HIT_RADIUS = 25;
const WHEEL_ROTATION_MULTIPLIER = 1;
const MINIMUM_WHEEL_RADIUS = 44;
const SIMULATOR_STEP_METERS = 10;
const EARTH_RADIUS_METERS = 6_371_000;
const RECENTER_MINIMUM_DURATION_MS = 450;
const RECENTER_MAXIMUM_DURATION_MS = 1_600;
const RECENTER_MILLISECONDS_PER_METER = 1.4;

function getPlayerCameraPadding(viewportHeight: number) {
  return {
    top: Math.max(
      0,
      viewportHeight * (PLAYER_SCREEN_Y_RATIO * 2 - 1),
    ),
    right: 0,
    bottom: 0,
    left: 0,
  };
}

function normalizeBearing(value: number) {
  return ((value % 360) + 360) % 360;
}

function moveCoordinates(
  coordinates: [number, number],
  bearingDegrees: number,
  distanceMeters: number,
): [number, number] {
  const [longitude, latitude] = coordinates;
  const bearingRadians = bearingDegrees * (Math.PI / 180);
  const latitudeRadians = latitude * (Math.PI / 180);
  const angularDistance =
    distanceMeters / EARTH_RADIUS_METERS;

  const nextLatitude =
    latitude +
    angularDistance *
      Math.cos(bearingRadians) *
      (180 / Math.PI);

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

function distanceBetweenCoordinates(
  first: [number, number],
  second: [number, number],
) {
  const [firstLongitude, firstLatitude] = first.map(
    (value) => value * (Math.PI / 180),
  );
  const [secondLongitude, secondLatitude] = second.map(
    (value) => value * (Math.PI / 180),
  );
  const latitudeDelta = secondLatitude - firstLatitude;
  const longitudeDelta = secondLongitude - firstLongitude;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.asin(Math.min(1, Math.sqrt(haversine)))
  );
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress ** 3
    : 1 - (-2 * progress + 2) ** 3 / 2;
}

function getWheelAngle(
  event: GestureResponderEvent,
  viewport: { width: number; height: number },
) {
  if (viewport.width === 0 || viewport.height === 0) {
    return null;
  }

  const horizontalDistance =
    event.nativeEvent.locationX - viewport.width / 2;
  const verticalDistance =
    event.nativeEvent.locationY - viewport.height / 2;
  const radius = Math.hypot(
    horizontalDistance,
    verticalDistance,
  );

  if (radius < MINIMUM_WHEEL_RADIUS) {
    return null;
  }

  return Math.atan2(verticalDistance, horizontalDistance);
}

function unwrapAngleDelta(delta: number) {
  if (delta > Math.PI) {
    return delta - Math.PI * 2;
  }

  if (delta < -Math.PI) {
    return delta + Math.PI * 2;
  }

  return delta;
}

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
  const mapRef = useRef<MapRef>(null);
  const mapModeRef = useRef<MapInteractionMode>('look');
  const lookBearingRef = useRef(0);
  const wheelAngleRef = useRef<number | null>(null);
  const wheelBearingRef = useRef(0);
  const mapViewportRef = useRef({ width: 0, height: 0 });
  const pendingBearingRef = useRef<number | null>(null);
  const rotationFrameRef = useRef<number | null>(null);
  const recenterFrameRef = useRef<number | null>(null);
  const mapZoomRef = useRef(LOOK_AROUND_ZOOM);
  const recenteringRef = useRef(false);
  const betaStarterRequestRef = useRef(false);
  const [northArrowRotation] = useState(
    () => new Animated.Value(0),
  );
  const cameraViewRef = useRef({
    zoom: LOOK_AROUND_ZOOM,
    bearing: 0,
    pitch: LOOK_AROUND_PITCH,
  });
  const insets = useSafeAreaInsets();
  const { setHidden: setTabBarHidden } = useAppTabBar();

  const { isAuthenticated } = useConvexAuth();

  const [selectedPlace, setSelectedPlace] =
    useState<Place | null>(null);

  const [mapMode, setMapMode] =
    useState<MapInteractionMode>('look');

  const [compassActive, setCompassActive] =
    useState(false);

  const [mapZoom, setMapZoom] =
    useState(LOOK_AROUND_ZOOM);

  const [locationListVisible, setLocationListVisible] =
    useState(false);

  const [betaFeedbackVisible, setBetaFeedbackVisible] =
    useState(false);

  const [wishlistOnly, setWishlistOnly] = useState(false);

  const [locationSearch, setLocationSearch] = useState('');

  const [selectedState, setSelectedState] = useState('');

  const [selectedCity, setSelectedCity] = useState('');

  const [wishlistChangingId, setWishlistChangingId] =
    useState<string | null>(null);

  const [placeOpenedFromList, setPlaceOpenedFromList] =
    useState(false);

  const [liveCoordinates, setLiveCoordinates] =
    useState<[number, number] | null>(null);

  const [simulatedCoordinates, setSimulatedCoordinates] =
    useState<[number, number]>(HARVARD_YARD);

  const [simulatedLocationEnabled, setSimulatedLocationEnabled] =
    useState(false);

  const [locationMessage, setLocationMessage] = useState(
    'Finding your location...',
  );

  const [locationsTakingLong, setLocationsTakingLong] =
    useState(false);

  const [betaFallbackReady, setBetaFallbackReady] =
    useState(false);

  const [resettingTestProgress, setResettingTestProgress] =
    useState(false);

  const [awardingTestBadge, setAwardingTestBadge] =
    useState(false);

  const locations = useQuery(api.locations.getLocations, {
    includeBeta: isBetaBuild,
  });

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

  const visits = useQuery(
    api.visits.getMyVisits,
    isAuthenticated ? {} : 'skip',
  );

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );

  const wishlist = useQuery(
    api.wishlist.getMyWishlist,
    isAuthenticated ? {} : 'skip',
  );

  const avatarProfile = useQuery(
    api.users.getMyAvatarProfile,
    isAuthenticated ? {} : 'skip',
  );

  const isAdmin = currentUser?.isAdmin === true;
  const canSubmitBetaFeedback =
    isAuthenticated && (isBetaBuild || isAdmin);
  const simulationIsActive =
    isAdmin && simulatedLocationEnabled;
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

  const visitedLocationIds = useMemo(
    () =>
      new Set(
        (visits ?? []).map((visit) => visit.locationId),
      ),
    [visits],
  );

  const wishlistLocationIds = useMemo(
    () =>
      new Set(
        (wishlist ?? []).map((entry) => entry.locationId),
      ),
    [wishlist],
  );

  const locationsAreLoading = locations === undefined;

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

  const listedPlaces = useMemo(() => {
    const search = locationSearch.trim().toLowerCase();

    return places
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
      .sort((first, second) => first.title.localeCompare(second.title));
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

  const locationsAreEmpty =
    locations !== undefined && locations.length === 0;

  const placesAreEmpty =
    locations !== undefined &&
    locations.length > 0 &&
    places.length === 0;

  const modalContentVisible =
    selectedPlace !== null || locationListVisible || betaFeedbackVisible;

  useFocusEffect(
    useCallback(() => {
      setTabBarHidden(simulationIsActive);

      return () => {
        setTabBarHidden(false);
      };
    }, [setTabBarHidden, simulationIsActive]),
  );

  useEffect(() => {
    if (!locationsAreLoading) {
      // Query completion intentionally resets the delayed-loading notice.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    mapModeRef.current = mapMode;
  }, [mapMode]);

  useEffect(() => {
    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;

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
          setLiveCoordinates([
            currentLocation.coords.longitude,
            currentLocation.coords.latitude,
          ]);

          setLocationMessage('');
        }

        try {
          const subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 4,
              timeInterval: 5000,
            },
            (nextLocation) => {
              if (!isMounted) {
                return;
              }

              setLiveCoordinates([
                nextLocation.coords.longitude,
                nextLocation.coords.latitude,
              ]);
              setLocationMessage('');
            },
          );

          if (!isMounted) {
            subscription.remove();
            return;
          }

          locationSubscription = subscription;
        } catch {
          if (isMounted) {
            setLocationMessage(
              'Your position is shown, but live updates are unavailable.',
            );
          }
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
      locationSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (
      userCoordinates === null ||
      mapModeRef.current !== 'look'
    ) {
      return;
    }

    cameraRef.current?.easeTo({
      center: userCoordinates,
      zoom: cameraViewRef.current.zoom,
      bearing: lookBearingRef.current,
      pitch: LOOK_AROUND_PITCH,
      padding: getPlayerCameraPadding(
        mapViewportRef.current.height,
      ),
      duration: 650,
    });
  }, [userCoordinates]);

  const startingCenter =
    userCoordinates ?? HARVARD_YARD;

  const shouldStartLookRotation = useCallback(
    (
      event: GestureResponderEvent,
      gestureState: PanResponderGestureState,
    ) =>
      mapModeRef.current === 'look' &&
      gestureState.numberActiveTouches === 1 &&
      getWheelAngle(
        event,
        mapViewportRef.current,
      ) !== null &&
      Math.max(
        Math.abs(gestureState.dx),
        Math.abs(gestureState.dy),
      ) > 6,
    [],
  );

  const applyPendingRotation = useCallback(() => {
    rotationFrameRef.current = null;
    const nextBearing = pendingBearingRef.current;

    if (
      nextBearing === null ||
      mapModeRef.current !== 'look'
    ) {
      return;
    }

    pendingBearingRef.current = null;
    lookBearingRef.current = nextBearing;
    cameraViewRef.current.bearing = nextBearing;
    cameraViewRef.current.pitch = LOOK_AROUND_PITCH;
    northArrowRotation.setValue(-nextBearing);

    cameraRef.current?.jumpTo({
      center: userCoordinates ?? HARVARD_YARD,
      zoom: cameraViewRef.current.zoom,
      bearing: nextBearing,
      pitch: LOOK_AROUND_PITCH,
      padding: getPlayerCameraPadding(
        mapViewportRef.current.height,
      ),
    });
  }, [northArrowRotation, userCoordinates]);

  const startLookRotation = useCallback((
    event: GestureResponderEvent,
  ) => {
    setCompassActive(true);
    wheelAngleRef.current = getWheelAngle(
      event,
      mapViewportRef.current,
    );
    wheelBearingRef.current =
      pendingBearingRef.current ??
      cameraViewRef.current.bearing;
  }, []);

  const rotateLookView = useCallback((
    event: GestureResponderEvent,
    gestureState: PanResponderGestureState,
  ) => {
    if (
      mapModeRef.current !== 'look' ||
      gestureState.numberActiveTouches !== 1
    ) {
      return;
    }

    const nextAngle = getWheelAngle(
      event,
      mapViewportRef.current,
    );

    if (nextAngle === null) {
      wheelAngleRef.current = null;
      return;
    }

    const previousAngle = wheelAngleRef.current;
    wheelAngleRef.current = nextAngle;

    if (previousAngle === null) {
      return;
    }

    const angleDelta = unwrapAngleDelta(
      nextAngle - previousAngle,
    );
    wheelBearingRef.current = normalizeBearing(
      wheelBearingRef.current -
        angleDelta *
          (180 / Math.PI) *
          WHEEL_ROTATION_MULTIPLIER,
    );
    pendingBearingRef.current = wheelBearingRef.current;

    if (rotationFrameRef.current === null) {
      rotationFrameRef.current = requestAnimationFrame(
        applyPendingRotation,
      );
    }
  }, [applyPendingRotation]);

  const finishLookRotation = useCallback(() => {
    wheelAngleRef.current = null;
    setCompassActive(false);
  }, []);

  /* eslint-disable react-hooks/refs -- PanResponder stores callbacks for touch events; they do not read refs during render. */
  const lookAroundPanResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponderCapture:
        shouldStartLookRotation,
      onPanResponderGrant: startLookRotation,
      onPanResponderMove: rotateLookView,
      onPanResponderRelease: finishLookRotation,
      onPanResponderTerminate: finishLookRotation,
      onPanResponderTerminationRequest: () => true,
    }),
    [
      finishLookRotation,
      rotateLookView,
      shouldStartLookRotation,
      startLookRotation,
    ],
  );
  /* eslint-enable react-hooks/refs */

  useEffect(() => () => {
    if (rotationFrameRef.current !== null) {
      cancelAnimationFrame(rotationFrameRef.current);
    }

    if (recenterFrameRef.current !== null) {
      cancelAnimationFrame(recenterFrameRef.current);
    }
  }, []);

  const changeSimulationEnabled = (enabled: boolean) => {
    if (enabled) {
      setSimulatedCoordinates(HARVARD_YARD);
      setSimulatedLocationEnabled(true);

      if (mapModeRef.current === 'explore') {
        cameraRef.current?.flyTo({
          center: HARVARD_YARD,
          zoom: cameraViewRef.current.zoom,
          bearing: cameraViewRef.current.bearing,
          pitch: LOOK_AROUND_PITCH,
          padding: getPlayerCameraPadding(
            mapViewportRef.current.height,
          ),
          duration: 800,
        });
      }

      AccessibilityInfo.announceForAccessibility(
        'Admin test GPS enabled in Harvard Yard.',
      );
      return;
    }

    setSimulatedLocationEnabled(false);
    const nextCenter = liveCoordinates ?? HARVARD_YARD;

    if (
      mapModeRef.current === 'explore' ||
      liveCoordinates === null
    ) {
      cameraRef.current?.flyTo({
        center: nextCenter,
        zoom: cameraViewRef.current.zoom,
        bearing: cameraViewRef.current.bearing,
        pitch: LOOK_AROUND_PITCH,
        padding: getPlayerCameraPadding(
          mapViewportRef.current.height,
        ),
        duration: 800,
      });
    }

    AccessibilityInfo.announceForAccessibility(
      liveCoordinates
        ? 'Admin test GPS disabled. Returned to the device location.'
        : 'Admin test GPS disabled. Device location is unavailable.',
    );
  };

  const moveSimulationTo = (
    coordinates: [number, number],
  ) => {
    setSimulatedCoordinates(coordinates);

    if (mapModeRef.current === 'explore') {
      cameraRef.current?.flyTo({
        center: coordinates,
        zoom: cameraViewRef.current.zoom,
        bearing: cameraViewRef.current.bearing,
        pitch: LOOK_AROUND_PITCH,
        padding: getPlayerCameraPadding(
          mapViewportRef.current.height,
        ),
        duration: 800,
      });
    }
  };

  const walkSimulatedPlayer = (
    direction: SimulatorDirection,
  ) => {
    const viewBearing = cameraViewRef.current.bearing;
    const directionOffset: Record<
      SimulatorDirection,
      number
    > = {
      up: 0,
      right: 90,
      down: 180,
      left: -90,
    };

    setSimulatedCoordinates((currentCoordinates) =>
      moveCoordinates(
        currentCoordinates,
        viewBearing + directionOffset[direction],
        SIMULATOR_STEP_METERS,
      ),
    );
  };

  const recenterMap = async () => {
    const camera = cameraRef.current;
    const targetCoordinates = userCoordinates;

    if (
      !camera ||
      !targetCoordinates ||
      recenteringRef.current
    ) {
      return;
    }

    recenteringRef.current = true;
    const targetZoom = cameraViewRef.current.zoom;
    const targetBearing =
      mapModeRef.current === 'look'
        ? lookBearingRef.current
        : cameraViewRef.current.bearing;

    const visibleView = await mapRef.current
      ?.getViewState()
      .catch(() => undefined);

    if (!visibleView) {
      camera.jumpTo({
        center: targetCoordinates,
        zoom: targetZoom,
        bearing: targetBearing,
        pitch: LOOK_AROUND_PITCH,
        padding: getPlayerCameraPadding(
          mapViewportRef.current.height,
        ),
      });
      recenteringRef.current = false;
      return;
    }

    const startCoordinates = visibleView.center;
    const distance = distanceBetweenCoordinates(
      startCoordinates,
      targetCoordinates,
    );
    const duration = Math.min(
      RECENTER_MAXIMUM_DURATION_MS,
      Math.max(
        RECENTER_MINIMUM_DURATION_MS,
        distance * RECENTER_MILLISECONDS_PER_METER,
      ),
    );
    let startedAt: number | null = null;

    const moveOneFrame = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = Math.min(
        1,
        (timestamp - startedAt) / duration,
      );
      const easedProgress = easeInOutCubic(progress);
      const longitudeDelta =
        ((targetCoordinates[0] -
          startCoordinates[0] +
          540) %
          360) -
        180;
      const center: [number, number] = [
        startCoordinates[0] +
          longitudeDelta * easedProgress,
        startCoordinates[1] +
          (targetCoordinates[1] - startCoordinates[1]) *
            easedProgress,
      ];

      camera.jumpTo({
        center:
          progress === 1 ? targetCoordinates : center,
        zoom: targetZoom,
        bearing: targetBearing,
        pitch: LOOK_AROUND_PITCH,
        padding: getPlayerCameraPadding(
          mapViewportRef.current.height,
        ),
      });

      if (progress < 1) {
        recenterFrameRef.current = requestAnimationFrame(
          moveOneFrame,
        );
        return;
      }

      recenterFrameRef.current = null;
      recenteringRef.current = false;
    };

    recenterFrameRef.current = requestAnimationFrame(
      moveOneFrame,
    );
  };

  const changeMapZoom = useCallback((nextZoom: number) => {
    const clampedZoom = Math.min(
      MAXIMUM_MAP_ZOOM,
      Math.max(MINIMUM_MAP_ZOOM, nextZoom),
    );

    mapZoomRef.current = clampedZoom;
    setMapZoom(clampedZoom);
    cameraViewRef.current.zoom = clampedZoom;

    cameraRef.current?.jumpTo({
      center: userCoordinates ?? HARVARD_YARD,
      zoom: clampedZoom,
      bearing: cameraViewRef.current.bearing,
      pitch: LOOK_AROUND_PITCH,
      padding: getPlayerCameraPadding(
        mapViewportRef.current.height,
      ),
    });
  }, [userCoordinates]);

  const toggleMapMode = async () => {
    if (mapMode === 'look') {
      setCompassActive(false);
      setMapMode('explore');
      AccessibilityInfo.announceForAccessibility(
        'Explore mode. Swipe to move around the map.',
      );
      return;
    }

    const center =
      userCoordinates ??
      (await mapRef.current?.getCenter()) ??
      HARVARD_YARD;

    lookBearingRef.current = 0;
    northArrowRotation.setValue(0);
    setCompassActive(false);
    cameraViewRef.current = {
      zoom: LOOK_AROUND_ZOOM,
      bearing: 0,
      pitch: LOOK_AROUND_PITCH,
    };
    setMapMode('look');
    cameraRef.current?.flyTo({
      center,
      zoom: LOOK_AROUND_ZOOM,
      bearing: 0,
      pitch: LOOK_AROUND_PITCH,
      padding: getPlayerCameraPadding(
        mapViewportRef.current.height,
      ),
      duration: 900,
    });
    AccessibilityInfo.announceForAccessibility(
      'Look Around mode. Recentered and facing north.',
    );
  };

  const confirmResetTestingProgress = () => {
    Alert.alert(
      'Reset Your Test Progress?',
      'This permanently deletes your check-ins, badge progress, earned badges, and tutorial progress. No other account is affected.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setResettingTestProgress(true);

            void resetMyTestingProgress()
              .then((result) => {
                setSelectedPlace(null);
                AccessibilityInfo.announceForAccessibility(
                  'Your test progress was reset. The tutorial will appear again when the app reopens.',
                );
                Alert.alert(
                  'Test Progress Reset',
                  `Removed ${result.deletedVisits} check-ins and ${result.deletedAwards} earned badges. The tutorial will start again the next time the app opens.`,
                );
              })
              .catch((error) => {
                Alert.alert(
                  'Reset Unsuccessful',
                  error instanceof Error
                    ? error.message
                    : 'Your test progress could not be reset.',
                );
              })
              .finally(() => {
                setResettingTestProgress(false);
              });
          },
        },
      ],
    );
  };

  const awardTestBadge = () => {
    if (awardingTestBadge) {
      return;
    }

    setAwardingTestBadge(true);

    void awardMyTestBadgeLevel()
      .then((result) => {
        AccessibilityInfo.announceForAccessibility(
          `${result.badgeName}, test level ${result.level} awarded.`,
        );
      })
      .catch((error) => {
        Alert.alert(
          'Test Award Unsuccessful',
          error instanceof Error
            ? error.message
            : 'The test badge level could not be awarded.',
        );
      })
      .finally(() => {
        setAwardingTestBadge(false);
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
      AccessibilityInfo.announceForAccessibility(
        saved
          ? `${place.title} saved to Want to Visit.`
          : `${place.title} removed from Want to Visit.`,
      );
    } catch (error) {
      Alert.alert(
        'Unable to Update Wishlist',
        error instanceof Error
          ? error.message
          : 'Try again in a moment.',
      );
    } finally {
      setWishlistChangingId(null);
    }
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

  const selectPlaceBehindPlayerMarker = async () => {
    const map = mapRef.current;

    if (!map || !userCoordinates) {
      return;
    }

    try {
      const playerPoint = await map.project(userCoordinates);
      const projectedPlaces = await Promise.all(
        places.map(async (place) => ({
          place,
          point: await map.project(place.coordinates),
        })),
      );
      const horizontalReach =
        PLAYER_MARKER_WIDTH / 2 + LOCATION_PIN_HIT_RADIUS;
      const upperReach =
        PLAYER_MARKER_HEIGHT + LOCATION_PIN_HIT_RADIUS;
      const coveredPlaces = projectedPlaces
        .filter(({ point }) => {
          const horizontalDelta = Math.abs(
            point[0] - playerPoint[0],
          );
          const verticalDelta = point[1] - playerPoint[1];

          return (
            horizontalDelta <= horizontalReach &&
            verticalDelta >= -upperReach &&
            verticalDelta <= LOCATION_PIN_HIT_RADIUS
          );
        })
        .sort((first, second) => {
          const firstDistance = Math.hypot(
            first.point[0] - playerPoint[0],
            first.point[1] - playerPoint[1],
          );
          const secondDistance = Math.hypot(
            second.point[0] - playerPoint[0],
            second.point[1] - playerPoint[1],
          );

          return firstDistance - secondDistance;
        });

      if (coveredPlaces[0]) {
        selectPlace(coveredPlaces[0].place, false);
      }
    } catch {
      // The marker remains decorative if map projection is temporarily unavailable.
    }
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
        style={styles.mapLayer}>
        <View
          onLayout={(event) => {
            const { width, height } =
              event.nativeEvent.layout;
            mapViewportRef.current = { width, height };
          }}
          style={styles.map}
          {...lookAroundPanResponder.panHandlers}>
          <Map
            ref={mapRef}
            accessible={false}
            androidView="texture"
            attribution={false}
            compass={false}
            doubleTapHoldZoom={false}
            doubleTapZoom={false}
            dragPan={mapMode === 'explore'}
            light={{
              color: '#FFF4DD',
              intensity: 0.58,
              position: [1.5, 210, 35],
            }}
            mapStyle={STORYBOOK_MAP_STYLE}
            onRegionIsChanging={(event) => {
              const { zoom, bearing, pitch } =
                event.nativeEvent;

              cameraViewRef.current = {
                zoom,
                bearing,
                pitch,
              };

              if (
                Math.abs(mapZoomRef.current - zoom) > 0.01
              ) {
                mapZoomRef.current = zoom;
                setMapZoom(zoom);
              }

              if (mapModeRef.current === 'look') {
                lookBearingRef.current = bearing;
              }

              northArrowRotation.setValue(
                -normalizeBearing(bearing),
              );
            }}
            style={styles.mapCanvas}
            touchPitch={false}
            touchRotate={false}>
            <Camera
              ref={cameraRef}
              initialViewState={{
                center: startingCenter,
                zoom: LOOK_AROUND_ZOOM,
                bearing: 0,
                pitch: LOOK_AROUND_PITCH,
              }}
            />

            <StorybookMapLayers />

            <LocationPinLayer
              onSelect={(place) =>
                selectPlace(place, false)
              }
              places={places}
              selectedPlaceId={selectedPlace?.id}
              visitedLocationIds={visitedLocationIds}
            />

            {userCoordinates && (
              <Marker
                id="current-user-location"
                lngLat={userCoordinates}
                anchor="bottom"
                onPress={() => {
                  void selectPlaceBehindPlayerMarker();
                }}
                pointerEvents="none">
                <PlayerMarker
                  presetId={avatarProfile?.avatarPresetId}
                  selection={avatarProfile?.selection}
                />
              </Marker>
            )}
          </Map>
        </View>

        {displayedLocationMessage !== '' && !simulationIsActive && (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.locationMessage,
              {
                top: insets.top + 8,
              },
            ]}>
            <Text style={styles.locationMessageText}>
              {displayedLocationMessage}
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

        {!modalContentVisible ? (
          <View
            accessible
            accessibilityLabel="Map data by OpenStreetMap contributors, map tiles by OpenFreeMap"
            pointerEvents="none"
            style={[
              styles.mapCredit,
              { bottom: BottomTabInset + 4 },
            ]}>
            <Text style={styles.mapCreditText}>
              © OpenStreetMap · OpenFreeMap
            </Text>
          </View>
        ) : null}

        {!modalContentVisible ? (
          <MapModeButton
            compassActive={compassActive}
            mode={mapMode}
            northArrowRotation={northArrowRotation}
            onPress={toggleMapMode}
            right={16}
            top={insets.top + 12}
          />
        ) : null}

        {!modalContentVisible ? (
          <MapZoomControl
            maximumValue={MAXIMUM_MAP_ZOOM}
            minimumValue={MINIMUM_MAP_ZOOM}
            onChange={changeMapZoom}
            top={insets.top + 12 + MAP_CONTROL_STEP}
            value={mapZoom}
          />
        ) : null}

        {canSubmitBetaFeedback && !modalContentVisible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send beta feedback"
            accessibilityHint="Opens a private feedback form for the Lorcal team"
            onPress={() => setBetaFeedbackVisible(true)}
            style={({ pressed }) => [
              styles.betaFeedbackButton,
              { bottom: BottomTabInset + 28 },
              pressed && styles.betaFeedbackButtonPressed,
            ]}>
            <Text style={styles.betaFeedbackEyebrow}>BETA</Text>
            <Text style={styles.betaFeedbackButtonText}>Feedback</Text>
          </Pressable>
        ) : null}

        {!locationsAreLoading &&
          places.length > 0 &&
          !modalContentVisible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Locations list"
              accessibilityHint="Opens an accessible list of locations on the map"
              accessibilityState={{
                expanded: locationListVisible,
              }}
              onPress={toggleLocationList}
              style={({ pressed }) => [
                styles.mapControlButton,
                {
                  top:
                    insets.top +
                    12 +
                    MAP_CONTROL_STEP * 2,
                },
                pressed && styles.mapControlButtonPressed,
              ]}>
              <View
                accessible={false}
                style={styles.locationListIcon}>
                {[0, 1, 2].map((line) => (
                  <View
                    key={line}
                    style={styles.locationListIconRow}>
                    <View style={styles.locationListIconDot} />
                    <View style={styles.locationListIconLine} />
                  </View>
                ))}
              </View>
            </Pressable>
          ) : null}

        {isAdmin && !modalContentVisible && (
          <AdminLocationSimulator
            awardingBadge={awardingTestBadge}
            bottom={simulationIsActive ? 0 : undefined}
            coordinates={simulatedCoordinates}
            enabled={simulationIsActive}
            onAwardBadge={awardTestBadge}
            onCoordinatesChange={moveSimulationTo}
            onEnabledChange={changeSimulationEnabled}
            onResetProgress={confirmResetTestingProgress}
            onStep={walkSimulatedPlayer}
            resettingProgress={resettingTestProgress}
            top={
              simulationIsActive
                ? undefined
                : insets.top +
                  12 +
                  MAP_CONTROL_STEP * 4
            }
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            simulationIsActive
              ? 'Recenter map on test player'
              : 'Recenter map on my location'
          }
          accessibilityHint={
            simulationIsActive
              ? 'Moves the map back to the admin test player'
              : 'Moves the map back to your current position'
          }
          accessibilityState={{
            disabled: !userCoordinates,
          }}
          disabled={!userCoordinates}
          onPress={recenterMap}
          style={({ pressed }) => [
            styles.recenterButton,
            {
              top:
                insets.top +
                12 +
                MAP_CONTROL_STEP * 3,
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

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents={modalContentVisible ? 'auto' : 'none'}
        style={styles.modalInteractionShield}
      />

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
              Find nearby or faraway places, then save them to plan a future
              visit.
            </Text>

            <TextInput
              accessibilityLabel="Find a location"
              autoCapitalize="words"
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={setLocationSearch}
              placeholder="Type a location to plan a visit"
              placeholderTextColor="#6B6B60"
              returnKeyType="search"
              style={styles.locationListSearchInput}
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
                  pressed && styles.locationListItemPressed,
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
                  pressed && styles.locationListItemPressed,
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
                        pressed && styles.locationListItemPressed,
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
                            pressed && styles.locationListItemPressed,
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
              accessibilityLabel="Location list"
              contentContainerStyle={
                styles.locationListContent
              }
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator>
              {listedPlaces.length === 0 ? (
                <Text style={styles.locationListEmptyText}>
                  {locationSearch.trim() !== ''
                    ? 'No locations match that search.'
                    : wishlistOnly
                      ? 'No saved locations yet. Search for a place or open any location and choose Want to Visit to add it here.'
                      : 'No locations are available.'}
                </Text>
              ) : listedPlaces.map((place) => {
                const isVisited =
                  visitedLocationIds.has(place.id);
                const isWishlisted =
                  wishlistLocationIds.has(place.id);

                return (
                  <View
                    key={place.id}
                    style={[
                      styles.locationListItem,
                      isVisited && styles.locationListItemVisited,
                      selectedPlace?.id === place.id &&
                        styles.locationListItemSelected,
                    ]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        place.category
                          ? `${place.title}, ${place.category}${
                              isVisited ? ', visited' : ', not visited'
                            }${isWishlisted ? ', want to visit' : ''}`
                          : `${place.title}${
                              isVisited ? ', visited' : ', not visited'
                            }${isWishlisted ? ', want to visit' : ''}`
                      }
                      onPress={() => selectPlace(place, true)}
                      style={({ pressed }) => [
                        styles.locationListItemMain,
                        pressed && styles.locationListItemPressed,
                      ]}>
                      <View style={styles.locationListItemHeader}>
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

                      {(getPlaceLocality(place) || place.category) && (
                        <Text style={styles.locationListItemCategory}>
                          {[getPlaceLocality(place), place.category]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      )}
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
                      hitSlop={8}
                      onPress={() =>
                        void changeWishlistStatus(place, !isWishlisted)
                      }
                      style={({ pressed }) => [
                        styles.locationListWishlistButton,
                        isWishlisted &&
                          styles.locationListWishlistButtonSaved,
                        pressed && styles.locationListItemPressed,
                      ]}>
                      <Text style={styles.locationListWishlistText}>
                        {isWishlisted ? '♥' : '♡'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}

              <Text
                accessibilityLabel="Map data by OpenStreetMap contributors, map tiles by OpenFreeMap"
                style={styles.mapAttribution}>
                Map data © OpenStreetMap contributors · OpenFreeMap
              </Text>
            </ScrollView>
          </View>
        )}

      {selectedPlace && (
        <LocationPopup
          isWishlisted={wishlistLocationIds.has(selectedPlace.id)}
          place={selectedPlace}
          userCoordinates={userCoordinates}
          usingTestCoordinates={simulationIsActive}
          wishlistBusy={wishlistChangingId === selectedPlace.id}
          onWishlistChange={(saved) =>
            void changeWishlistStatus(selectedPlace, saved)
          }
          onClose={closeSelectedPlace}
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
  },
  mapLayer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapCanvas: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalInteractionShield: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  mapCredit: {
    position: 'absolute',
    left: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 248, 231, 0.82)',
    borderRadius: 5,
  },
  mapCreditText: {
    color: '#50615D',
    fontSize: 9,
    lineHeight: 12,
  },
  mapControlButton: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E7',
    borderColor: '#2F7E78',
    borderWidth: 2,
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
  mapControlButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  betaFeedbackButton: {
    position: 'absolute',
    left: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    minHeight: 48,
    paddingHorizontal: 15,
    backgroundColor: '#FFF8E7',
    borderColor: '#855B38',
    borderRadius: 24,
    borderWidth: 2,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  betaFeedbackButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  betaFeedbackEyebrow: {
    color: '#855B38',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  betaFeedbackButtonText: {
    color: '#342B20',
    fontSize: 14,
    fontWeight: '800',
  },
  locationListIcon: {
    gap: 4,
  },
  locationListIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationListIconDot: {
    width: 4,
    height: 4,
    backgroundColor: '#24423F',
    borderRadius: 2,
  },
  locationListIconLine: {
    width: 21,
    height: 3,
    backgroundColor: '#24423F',
    borderRadius: 2,
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
  locationListSearchInput: {
    minHeight: 46,
    marginHorizontal: 18,
    marginTop: 12,
    paddingHorizontal: 14,
    color: '#342b20',
    backgroundColor: '#f4f1e8',
    borderColor: '#b7ab8d',
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  locationListFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  geographyFilters: {
    gap: 7,
    paddingTop: 10,
  },
  geographyFilterLabel: {
    color: '#555555',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 18,
    textTransform: 'uppercase',
  },
  geographyFilterOptions: {
    gap: 8,
    paddingHorizontal: 18,
  },
  locationListFilter: {
    backgroundColor: '#f4f1e8',
    borderColor: '#b7ab8d',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  locationListFilterSelected: {
    backgroundColor: '#dce7c3',
    borderColor: '#53663c',
    borderWidth: 2,
  },
  locationListFilterText: {
    color: '#342b20',
    fontSize: 13,
    fontWeight: '700',
  },
  locationListEmptyText: {
    color: '#555555',
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 18,
    textAlign: 'center',
  },
  locationListContent: {
    gap: 10,
    padding: 18,
    paddingBottom: 28,
  },
  mapAttribution: {
    paddingTop: 4,
    color: '#66736F',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  locationListItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 56,
    borderColor: '#d0d5dd',
    borderWidth: 1,
    borderRadius: 12,
  },
  locationListItemMain: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationListWishlistButton: {
    alignItems: 'center',
    backgroundColor: '#f3ead7',
    borderColor: '#8d7049',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: 10,
    width: 40,
  },
  locationListWishlistButtonSaved: {
    backgroundColor: '#dce7c3',
    borderColor: '#53663c',
  },
  locationListWishlistText: {
    color: '#6f2938',
    fontSize: 22,
    lineHeight: 25,
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
    backgroundColor: '#FFF8E7',
    borderColor: '#2F7E78',
    borderWidth: 2,
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
    transform: [{ scale: 0.96 }],
  },
  recenterButtonIcon: {
    color: '#24423F',
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
