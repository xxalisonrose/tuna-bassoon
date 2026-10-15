import { useAuth } from '@clerk/expo';
import { useConvexAuth } from 'convex/react';
import { usePathname, useRouter } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const {
    isAuthenticated,
    isLoading: isConvexLoading,
  } = useConvexAuth();
  const shouldOpenMapRef = useRef(true);
  const authenticationReady =
    isLoaded &&
    isSignedIn === true &&
    !isConvexLoading &&
    isAuthenticated;

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      shouldOpenMapRef.current = true;

      if (pathname !== '/') {
        router.replace('/');
      }

      return;
    }

    if (!authenticationReady) {
      return;
    }

    if (shouldOpenMapRef.current || pathname === '/') {
      shouldOpenMapRef.current = false;
      router.replace('/map');
    }
  }, [
    authenticationReady,
    isLoaded,
    isSignedIn,
    pathname,
    router,
  ]);

  return (
    <NativeTabs
      backgroundColor={colors.background}
      hidden={!authenticationReady}
      indicatorColor={colors.accentSoft}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger
        hidden={authenticationReady}
        name="index">
        <NativeTabs.Trigger.Label>
          Home
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          sf={{
            default: 'house',
            selected: 'house.fill',
          }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        hidden={!authenticationReady}
        name="map">
        <NativeTabs.Trigger.Label>
          Map
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          sf={{
            default: 'map',
            selected: 'map.fill',
          }}
          md="explore"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        hidden={!authenticationReady}
        name="collection">
        <NativeTabs.Trigger.Label>
          Passport
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          sf={{
            default: 'book.closed',
            selected: 'book.closed.fill',
          }}
          md="menu_book"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        hidden={!authenticationReady}
        name="settings">
        <NativeTabs.Trigger.Label>
          Settings
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          sf={{
            default: 'gearshape',
            selected: 'gearshape.fill',
          }}
          md="settings"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
