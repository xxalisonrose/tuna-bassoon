import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  CommunitySubmissionInfoModal,
} from '@/components/community-submission-info-modal';
import { api } from '../../convex/_generated/api';

export function CommunityContributorProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );
  const unannouncedAwards = useQuery(
    api.badges.getUnannouncedAwards,
    isAuthenticated ? {} : 'skip',
  );
  const acknowledgeIntro = useMutation(
    api.users.acknowledgeCommunitySubmissionIntro,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requirements = currentUser?.communityContributor.requirements;
  const visible =
    currentUser?.shouldShowCommunitySubmissionIntro === true &&
    Boolean(currentUser.username) &&
    unannouncedAwards?.length === 0;

  const close = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await acknowledgeIntro();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to save this acknowledgement. Try again.',
      );
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {children}
      {requirements ? (
        <CommunitySubmissionInfoModal
          error={error}
          isSaving={isSaving}
          onClose={() => void close()}
          requirements={requirements}
          visible={visible}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
