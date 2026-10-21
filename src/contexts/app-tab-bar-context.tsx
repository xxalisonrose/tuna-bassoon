import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type AppTabBarContextValue = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

const AppTabBarContext = createContext<AppTabBarContextValue | null>(
  null,
);

export function AppTabBarProvider({ children }: PropsWithChildren) {
  const [hidden, setHiddenState] = useState(false);
  const setHidden = useCallback((nextHidden: boolean) => {
    setHiddenState(nextHidden);
  }, []);
  const value = useMemo(
    () => ({ hidden, setHidden }),
    [hidden, setHidden],
  );

  return (
    <AppTabBarContext.Provider value={value}>
      {children}
    </AppTabBarContext.Provider>
  );
}

export function useAppTabBar() {
  const context = useContext(AppTabBarContext);

  if (context === null) {
    throw new Error(
      'useAppTabBar must be used within AppTabBarProvider.',
    );
  }

  return context;
}
