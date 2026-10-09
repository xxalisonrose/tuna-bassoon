import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

const DIRECT_DRAG_DELAY_MS = 140;
const DIRECT_DRAG_SENSITIVITY = 0.025;
const DIRECT_DRAG_THRESHOLD = 5;
const SLIDER_HEIGHT = 156;
const SLIDER_THUMB_SIZE = 20;

type MapZoomControlProps = {
  maximumValue: number;
  minimumValue: number;
  onChange: (value: number) => void;
  top: number;
  value: number;
};

function clamp(
  value: number,
  minimumValue: number,
  maximumValue: number,
) {
  return Math.min(maximumValue, Math.max(minimumValue, value));
}

export function MapZoomControl({
  maximumValue,
  minimumValue,
  onChange,
  top,
  value,
}: MapZoomControlProps) {
  const [sliderVisible, setSliderVisible] = useState(false);
  const gestureStartedAtRef = useRef(0);
  const gestureStartValueRef = useRef(value);
  const directDragRef = useRef(false);
  const valueRef = useRef(value);
  const pendingValueRef = useRef<number | null>(null);
  const zoomFrameRef = useRef<number | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const applyPendingValue = useCallback(() => {
    zoomFrameRef.current = null;

    if (pendingValueRef.current === null) {
      return;
    }

    const nextValue = pendingValueRef.current;
    pendingValueRef.current = null;
    onChange(nextValue);
  }, [onChange]);

  const scheduleValue = useCallback((nextValue: number) => {
    pendingValueRef.current = nextValue;

    if (zoomFrameRef.current === null) {
      zoomFrameRef.current = requestAnimationFrame(
        applyPendingValue,
      );
    }
  }, [applyPendingValue]);

  useEffect(() => () => {
    if (zoomFrameRef.current !== null) {
      cancelAnimationFrame(zoomFrameRef.current);
    }
  }, []);

  const updateFromSlider = (
    event: GestureResponderEvent,
  ) => {
    const ratio = clamp(
      1 - event.nativeEvent.locationY / SLIDER_HEIGHT,
      0,
      1,
    );
    scheduleValue(
      minimumValue +
        ratio * (maximumValue - minimumValue),
    );
  };

  /* eslint-disable react-hooks/refs, react-hooks/purity -- PanResponder stores these callbacks for touch events; they do not run during render. */
  const buttonPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gestureStartedAtRef.current = Date.now();
          gestureStartValueRef.current = valueRef.current;
          directDragRef.current = false;
        },
        onPanResponderMove: (_, gestureState) => {
          const heldLongEnough =
            Date.now() - gestureStartedAtRef.current >=
            DIRECT_DRAG_DELAY_MS;
          const movedFarEnough =
            Math.abs(gestureState.dy) >=
            DIRECT_DRAG_THRESHOLD;

          if (!heldLongEnough || !movedFarEnough) {
            return;
          }

          directDragRef.current = true;
          setSliderVisible(false);
          scheduleValue(
            clamp(
              gestureStartValueRef.current -
                gestureState.dy * DIRECT_DRAG_SENSITIVITY,
              minimumValue,
              maximumValue,
            ),
          );
        },
        onPanResponderRelease: () => {
          if (!directDragRef.current) {
            setSliderVisible((visible) => !visible);
          }
        },
        onPanResponderTerminate: () => {
          directDragRef.current = false;
        },
      }),
    [maximumValue, minimumValue, scheduleValue],
  );

  const sliderPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: updateFromSlider,
        onPanResponderMove: updateFromSlider,
      }),
    // The responder is recreated when its value range or callback changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maximumValue, minimumValue, scheduleValue],
  );
  /* eslint-enable react-hooks/refs, react-hooks/purity */

  const progress =
    (value - minimumValue) /
    (maximumValue - minimumValue);
  const thumbTop =
    (1 - clamp(progress, 0, 1)) *
    (SLIDER_HEIGHT - SLIDER_THUMB_SIZE);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { top }]}>
      {sliderVisible ? (
        <View
          accessibilityLabel={`Map zoom ${Math.round(progress * 100)} percent`}
          accessibilityRole="adjustable"
          accessibilityActions={[
            { name: 'increment', label: 'Zoom in' },
            { name: 'decrement', label: 'Zoom out' },
          ]}
          onAccessibilityAction={(event) => {
            const adjustment =
              event.nativeEvent.actionName === 'increment'
                ? 0.5
                : -0.5;
            scheduleValue(
              clamp(
                value + adjustment,
                minimumValue,
                maximumValue,
              ),
            );
          }}
          style={styles.sliderPanel}>
          <Text accessible={false} style={styles.zoomLabel}>
            +
          </Text>
          <View
            {...sliderPanResponder.panHandlers}
            style={styles.sliderTrack}>
            <View
              pointerEvents="none"
              style={styles.sliderRail}
            />
            <View
              pointerEvents="none"
              style={[
                styles.sliderFill,
                {
                  height:
                    SLIDER_HEIGHT -
                    thumbTop -
                    SLIDER_THUMB_SIZE / 2,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.sliderThumb,
                { top: thumbTop },
              ]}
            />
          </View>
          <Text accessible={false} style={styles.zoomLabel}>
            −
          </Text>
        </View>
      ) : null}

      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel="Map zoom"
        accessibilityHint="Tap to open the zoom slider, or hold and drag up or down to zoom directly"
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={() =>
          setSliderVisible((visible) => !visible)
        }
        {...buttonPanResponder.panHandlers}
        style={styles.button}>
        <View accessible={false} style={styles.lens} />
        <View accessible={false} style={styles.handle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 18,
    left: 18,
    height: 216,
    zIndex: 7,
  },
  button: {
    position: 'absolute',
    right: 0,
    top: 0,
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
  lens: {
    width: 21,
    height: 21,
    marginBottom: 6,
    marginRight: 6,
    borderColor: '#24423F',
    borderWidth: 3,
    borderRadius: 11,
  },
  handle: {
    position: 'absolute',
    width: 14,
    height: 3,
    marginTop: 17,
    marginLeft: 17,
    backgroundColor: '#24423F',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  sliderPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 64,
    height: 216,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    backgroundColor: '#FFF8E7',
    borderColor: '#2F7E78',
    borderWidth: 2,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  zoomLabel: {
    color: '#24423F',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  sliderTrack: {
    width: 44,
    height: SLIDER_HEIGHT,
    alignItems: 'center',
  },
  sliderRail: {
    position: 'absolute',
    top: 0,
    width: 7,
    height: SLIDER_HEIGHT,
    backgroundColor: '#D7D2B5',
    borderRadius: 4,
  },
  sliderFill: {
    position: 'absolute',
    bottom: 0,
    width: 7,
    backgroundColor: '#2F7E78',
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    width: SLIDER_THUMB_SIZE,
    height: SLIDER_THUMB_SIZE,
    backgroundColor: '#24423F',
    borderColor: '#FFFFFF',
    borderWidth: 3,
    borderRadius: SLIDER_THUMB_SIZE / 2,
  },
});
