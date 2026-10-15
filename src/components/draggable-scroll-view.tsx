import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const indicatorInset = Spacing.two;
const minimumThumbHeight = 56;
const hideDelayMilliseconds = 3000;

type DraggableScrollViewProps = {
  automaticallyAdjustKeyboardInsets?: boolean;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardDismissMode?: ScrollViewProps['keyboardDismissMode'];
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  scrollViewRef: RefObject<ScrollView | null>;
};

export function DraggableScrollView({
  automaticallyAdjustKeyboardInsets,
  children,
  contentContainerStyle,
  keyboardDismissMode,
  keyboardShouldPersistTaps,
  scrollViewRef,
}: DraggableScrollViewProps) {
  const theme = useTheme();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [indicatorInteractive, setIndicatorInteractive] = useState(false);

  const [indicatorOpacity] = useState(() => new Animated.Value(0));
  const [thumbTranslateY] = useState(() => new Animated.Value(0));
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollOffsetRef = useRef(0);
  const thumbPositionRef = useRef(0);
  const dragOriginRef = useRef(0);
  const dragTouchOriginRef = useRef(0);

  const trackHeight = Math.max(
    0,
    viewportHeight - indicatorInset * 2,
  );
  const maximumScrollOffset = Math.max(
    0,
    contentHeight - viewportHeight,
  );
  const thumbHeight =
    maximumScrollOffset > 0
      ? Math.min(
          trackHeight,
          Math.max(
            minimumThumbHeight,
            trackHeight * (viewportHeight / contentHeight),
          ),
        )
      : trackHeight;
  const maximumThumbOffset = Math.max(0, trackHeight - thumbHeight);
  const isScrollable = maximumScrollOffset > 1 && maximumThumbOffset > 0;

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showIndicator = useCallback(() => {
    if (!isScrollable) {
      return;
    }

    clearHideTimer();
    setIndicatorInteractive(true);
    Animated.timing(indicatorOpacity, {
      duration: 120,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [clearHideTimer, indicatorOpacity, isScrollable]);

  const scheduleIndicatorHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      Animated.timing(indicatorOpacity, {
        duration: 220,
        toValue: 0,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIndicatorInteractive(false);
        }
      });
    }, hideDelayMilliseconds);
  }, [clearHideTimer, indicatorOpacity]);

  const updateThumbFromScroll = useCallback(
    (scrollOffset: number) => {
      const clampedScrollOffset = Math.min(
        maximumScrollOffset,
        Math.max(0, scrollOffset),
      );
      const nextThumbPosition =
        maximumScrollOffset > 0
          ? (clampedScrollOffset / maximumScrollOffset) *
            maximumThumbOffset
          : 0;

      scrollOffsetRef.current = clampedScrollOffset;
      thumbPositionRef.current = nextThumbPosition;
      thumbTranslateY.setValue(nextThumbPosition);
    },
    [maximumScrollOffset, maximumThumbOffset, thumbTranslateY],
  );

  useEffect(() => {
    updateThumbFromScroll(scrollOffsetRef.current);
  }, [
    maximumScrollOffset,
    maximumThumbOffset,
    updateThumbFromScroll,
  ]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  const scrollToOffset = useCallback(
    (offset: number, animated: boolean) => {
      const clampedOffset = Math.min(
        maximumScrollOffset,
        Math.max(0, offset),
      );
      scrollViewRef.current?.scrollTo({
        animated,
        y: clampedOffset,
      });
      updateThumbFromScroll(clampedOffset);
    },
    [maximumScrollOffset, scrollViewRef, updateThumbFromScroll],
  );

  const handleThumbGrant = (event: GestureResponderEvent) => {
    showIndicator();
    dragOriginRef.current = thumbPositionRef.current;
    dragTouchOriginRef.current = event.nativeEvent.pageY;
  };

  const handleThumbMove = (event: GestureResponderEvent) => {
    const movement = event.nativeEvent.pageY - dragTouchOriginRef.current;
    const nextThumbPosition = Math.min(
      maximumThumbOffset,
      Math.max(0, dragOriginRef.current + movement),
    );
    const nextScrollOffset =
      maximumThumbOffset > 0
        ? (nextThumbPosition / maximumThumbOffset) * maximumScrollOffset
        : 0;

    scrollToOffset(nextScrollOffset, false);
  };

  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    updateThumbFromScroll(event.nativeEvent.contentOffset.y);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
  };

  const handleAccessibilityAction = (event: {
    nativeEvent: { actionName: string };
  }) => {
    const pageDistance = viewportHeight * 0.8;
    const direction = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    showIndicator();
    scrollToOffset(
      scrollOffsetRef.current + pageDistance * direction,
      true,
    );
    scheduleIndicatorHide();
  };

  return (
    <View onLayout={handleLayout} style={styles.container}>
      <ScrollView
        automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
        keyboardDismissMode={keyboardDismissMode}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        nativeID={Platform.OS === 'web' ? 'app-page-scroll-view' : undefined}
        ref={scrollViewRef}
        contentContainerStyle={contentContainerStyle}
        onContentSizeChange={(_width, height) => setContentHeight(height)}
        onMomentumScrollBegin={showIndicator}
        onMomentumScrollEnd={scheduleIndicatorHide}
        onScroll={handleScroll}
        onScrollBeginDrag={showIndicator}
        onScrollEndDrag={scheduleIndicatorHide}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={Platform.OS === 'web'}>
        {children}
      </ScrollView>

      {Platform.OS !== 'web' && isScrollable && (
        <Animated.View
          pointerEvents={indicatorInteractive ? 'box-none' : 'none'}
          style={[
            styles.indicatorLayer,
            { opacity: indicatorOpacity },
          ]}>
          <View
            pointerEvents="none"
            style={[
              styles.track,
              { backgroundColor: theme.border },
            ]}
          />
          <Animated.View
            accessibilityActions={[
              { name: 'increment', label: 'Scroll down' },
              { name: 'decrement', label: 'Scroll up' },
            ]}
            accessibilityHint="Drag up or down to move through the Passport"
            accessibilityLabel="Passport scroll bar"
            accessibilityRole="adjustable"
            accessible
            hitSlop={14}
            onAccessibilityAction={handleAccessibilityAction}
            onMoveShouldSetResponder={() => isScrollable}
            onResponderGrant={handleThumbGrant}
            onResponderMove={handleThumbMove}
            onResponderRelease={scheduleIndicatorHide}
            onResponderTerminate={scheduleIndicatorHide}
            onResponderTerminationRequest={() => false}
            onStartShouldSetResponder={() => isScrollable}
            style={[
              styles.thumb,
              {
                backgroundColor: theme.borderStrong,
                height: thumbHeight,
                transform: [{ translateY: thumbTranslateY }],
              },
            ]}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  indicatorLayer: {
    bottom: indicatorInset,
    position: 'absolute',
    right: 0,
    top: indicatorInset,
    width: 44,
  },
  track: {
    borderRadius: 999,
    bottom: 0,
    opacity: 0.5,
    position: 'absolute',
    right: 14,
    top: 0,
    width: 4,
  },
  thumb: {
    borderRadius: 999,
    minHeight: minimumThumbHeight,
    position: 'absolute',
    right: 8,
    top: 0,
    width: 16,
  },
});
