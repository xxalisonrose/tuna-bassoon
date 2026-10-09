import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import {
  useCallback,
  useEffect,
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

type AwardCelebrationProviderProps = {
  children: ReactNode;
};

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
  const currentAward = unannouncedAwards?.[0] ?? null;
  const shouldUseBanner =
    currentAward?.levelsEnabled === true &&
    currentAward.level > 1;

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
      !shouldUseBanner ||
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
    isAcknowledging,
    shouldUseBanner,
  ]);

  return (
    <View style={styles.container}>
      {children}
      {currentAward !== null ? (
        shouldUseBanner ? (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
