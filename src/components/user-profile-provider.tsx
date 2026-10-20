import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { UsernameEditorModal } from '@/components/username-editor-modal';
import { api } from '../../convex/_generated/api';

export function UserProfileProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );
  const syncMyUserProfile = useMutation(api.users.syncMyUserProfile);
  const syncStartedFor = useRef<string | null>(null);
  const [usernamePromptDismissedFor, setUsernamePromptDismissedFor] =
    useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      return;
    }

    if (syncStartedFor.current === currentUser.clerkUserId) {
      return;
    }

    syncStartedFor.current = currentUser.clerkUserId;
    void syncMyUserProfile().catch(() => {
      syncStartedFor.current = null;
    });
  }, [currentUser, isAuthenticated, syncMyUserProfile]);

  useEffect(() => {
    if (!isAuthenticated) {
      syncStartedFor.current = null;
    }
  }, [isAuthenticated]);

  const promptVisible =
    currentUser !== undefined &&
    currentUser !== null &&
    currentUser.profileReady &&
    !currentUser.username &&
    usernamePromptDismissedFor !== currentUser.clerkUserId;

  return (
    <View style={styles.container}>
      {children}
      <UsernameEditorModal
        key={`${currentUser?.clerkUserId ?? 'signed-out'}-${promptVisible ? 'open' : 'closed'}`}
        currentUsername={currentUser?.username}
        onClose={() =>
          setUsernamePromptDismissedFor(
            currentUser?.clerkUserId ?? null,
          )
        }
        onSaved={() =>
          setUsernamePromptDismissedFor(
            currentUser?.clerkUserId ?? null,
          )
        }
        visible={promptVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
