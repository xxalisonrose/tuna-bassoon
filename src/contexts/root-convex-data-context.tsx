import { useConvexAuth, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';

import { api } from '../../convex/_generated/api';

type CurrentUser = FunctionReturnType<
  typeof api.users.getCurrentUser
>;
type UnannouncedAwards = FunctionReturnType<
  typeof api.badges.getUnannouncedAwards
>;

const CurrentUserContext = createContext<
  CurrentUser | undefined
>(undefined);
const UnannouncedAwardsContext = createContext<
  UnannouncedAwards | undefined
>(undefined);

/**
 * Owns app-wide Convex subscriptions that several global providers share.
 * Keeping one subscription per query avoids repeated root-level updates.
 */
export function RootConvexDataProvider({
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

  return (
    <CurrentUserContext.Provider value={currentUser}>
      <UnannouncedAwardsContext.Provider
        value={unannouncedAwards}>
        {children}
      </UnannouncedAwardsContext.Provider>
    </CurrentUserContext.Provider>
  );
}

export function useRootCurrentUser() {
  return useContext(CurrentUserContext);
}

export function useRootUnannouncedAwards() {
  return useContext(UnannouncedAwardsContext);
}
