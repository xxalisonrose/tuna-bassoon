import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MissionIntroModal } from '@/components/mission-intro-modal';
import { api } from '../../convex/_generated/api';

export function MissionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );
  const missions = useQuery(
    api.missions.getMyMissions,
    isAuthenticated ? {} : 'skip',
  );
  const unannouncedAwards = useQuery(
    api.badges.getUnannouncedAwards,
    isAuthenticated ? {} : 'skip',
  );
  const acknowledgeMissionIntro = useMutation(
    api.missions.acknowledgeMissionIntro,
  );
  const syncMyMissionProgress = useMutation(
    api.missions.syncMyMissionProgress,
  );
  const [isSaving, setIsSaving] = useState(false);
  const syncingMissionKey = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tutorialMission = missions?.find(
    (mission) => mission.key === 'welcome-to-lorcal',
  );

  useEffect(() => {
    if (
      tutorialMission === undefined ||
      !tutorialMission.needsSync ||
      syncingMissionKey.current === tutorialMission.key
    ) {
      return;
    }

    syncingMissionKey.current = tutorialMission.key;

    void syncMyMissionProgress({
      missionKey: tutorialMission.key,
    })
      .catch((caughtError) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to update mission progress. Try again.',
        );
      })
      .finally(() => {
        syncingMissionKey.current = null;
      });
  }, [syncMyMissionProgress, tutorialMission]);

  const visible =
    currentUser !== undefined &&
    currentUser !== null &&
    Boolean(currentUser.username) &&
    tutorialMission !== undefined &&
    !tutorialMission.completed &&
    !tutorialMission.introSeen &&
    unannouncedAwards?.length === 0;

  const acknowledge = async (openPassport: boolean) => {
    if (isSaving || tutorialMission === undefined) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await acknowledgeMissionIntro({ missionKey: tutorialMission.key });
      setIsSaving(false);
      if (openPassport) {
        router.push({
          pathname: '/collection',
          params: { mission: tutorialMission.key },
        });
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to start the mission. Try again.',
      );
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {children}
      <MissionIntroModal
        error={error}
        isSaving={isSaving}
        onClose={() => void acknowledge(false)}
        onOpenPassport={() => void acknowledge(true)}
        visible={visible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
