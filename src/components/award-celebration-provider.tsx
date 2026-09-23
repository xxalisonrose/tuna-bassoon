import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { api } from '../../convex/_generated/api';
import { AwardEarnedPopup } from '@/components/award-earned-popup';

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

  useEffect(() => {
    setIsAcknowledging(false);
    setAcknowledgementError(null);
  }, [currentAward?._id]);

  const dismissCurrentAward = async () => {
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
  };

  return (
    <>
      {children}
      {currentAward !== null ? (
        <AwardEarnedPopup
          key={currentAward._id}
          award={currentAward}
          error={acknowledgementError}
          isAcknowledging={isAcknowledging}
          onDismiss={dismissCurrentAward}
        />
      ) : null}
    </>
  );
}
