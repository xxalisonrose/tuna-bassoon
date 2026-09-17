import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>
          Home
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/extra/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Label>
          Map
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/extra/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="collection">
        <NativeTabs.Trigger.Label>
          Collection
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          sf={{
            default: 'book.closed',
            selected: 'book.closed.fill',
          }}
          md="collections_bookmark"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}