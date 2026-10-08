import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import {
  AwardEarnedBanner,
  AwardEarnedPopup,
} from '@/components/award-earned-popup';
import {
  loadAwardDisplayMode,
  saveAwardDisplayMode,
  type AwardDisplayMode,
} from '@/lib/award-display-preference';

type AwardCelebrationProviderProps = {
  children: ReactNode;
};

type AwardCelebrationPreference = {
  displayMode: AwardDisplayMode;
  setDisplayMode: (mode: AwardDisplayMode) => void;
};

const AwardCelebrationPreferenceContext =
  createContext<AwardCelebrationPreference | null>(null);

export function useAwardCelebrationPreference() {
  const value = useContext(AwardCelebrationPreferenceContext);

  if (value === null) {
    throw new Error(
      'useAwardCelebrationPreference must be used inside AwardCelebrationProvider.',
    );
  }

  return value;
}

export function AwardCelebrationProvider({
  children,
}: AwardCelebrationProviderProps) {
  const { isAuthenticated } = useConvexAuth();
  const syncMyAwards = useMutation(api.badges.syncMyAwards);
  const acknowledgeAward = useMutation(api.badges.acknowledgeAward);
  const unannouncedAwards = useQuery(
    api.badges.getUnannouncedAwards,
    isAuthenticated ? {} : 'skip',
  );
  const hasSynced = useRef(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [acknowledgementError, setAcknowledgementError] =
    useState<string | null>(null);
  const [displayMode, setDisplayModeState] =
    useState<AwardDisplayMode | null>(null);
  const currentAward = unannouncedAwards?.[0] ?? null;

  useEffect(() => {
    let active = true;

    void loadAwardDisplayMode().then((storedMode) => {
      if (active) {
        setDisplayModeState(storedMode);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      hasSynced.current = false;
      return;
    }

    if (hasSynced.current) {
      return;
    }

    hasSynced.current = true;

    void syncMyAwards().catch(() => {
      hasSynced.current = false;
    });
  }, [isAuthenticated, syncMyAwards]);

  /* eslint-disable react-hooks/set-state-in-effect -- A newly displayed award starts with fresh acknowledgement state. */
  useEffect(() => {
    setIsAcknowledging(false);
    setAcknowledgementError(null);
  }, [currentAward?._id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dismissCurrentAward = useCallback(async () => {
    if (currentAward === null || isAcknowledging) {
      return;
    }

    setIsAcknowledging(true);
    setAcknowledgementError(null);

    try {
      await acknowledgeAward({ awardId: currentAward._id });
    } catch (error) {
      setIsAcknowledging(false);
      setAcknowledgementError(
        error instanceof Error
          ? error.message
          : 'Unable to save this celebration. Try again.',
      );
    }
  }, [acknowledgeAward, currentAward, isAcknowledging]);

  useEffect(() => {
    if (
      displayMode !== 'banner' ||
      currentAward === null ||
      isAcknowledging ||
      acknowledgementError !== null
    ) {
      return;
    }

    const timer = setTimeout(() => {
      void dismissCurrentAward();
    }, 6000);

    return () => clearTimeout(timer);
  }, [
    acknowledgementError,
    currentAward,
    dismissCurrentAward,
    displayMode,
    isAcknowledging,
  ]);

  const setDisplayMode = useCallback((mode: AwardDisplayMode) => {
    setDisplayModeState(mode);
    void saveAwardDisplayMode(mode).catch(() => undefined);
  }, []);

  const preference = useMemo(
    () => ({
      displayMode: displayMode ?? 'full_screen' as const,
      setDisplayMode,
    }),
    [displayMode, setDisplayMode],
  );

  return (
    <AwardCelebrationPreferenceContext.Provider value={preference}>
      <View style={styles.container}>
        {children}
        {currentAward !== null && displayMode !== null ? (
          displayMode === 'banner' ? (
            <AwardEarnedBanner
              key={currentAward._id}
              award={currentAward}
              error={acknowledgementError}
              isAcknowledging={isAcknowledging}
              onDismiss={dismissCurrentAward}
            />
          ) : (
            <AwardEarnedPopup
              key={currentAward._id}
              award={currentAward}
              error={acknowledgementError}
              isAcknowledging={isAcknowledging}
              onDismiss={dismissCurrentAward}
            />
          )
        ) : null}
      </View>
    </AwardCelebrationPreferenceContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
