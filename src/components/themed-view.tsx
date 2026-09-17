import {
  View,
  type ViewProps,
} from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  type,
  accessible,
  importantForAccessibility,
  ...otherProps
}: ThemedViewProps) {
  const theme = useTheme();

  return (
    <View
      accessible={accessible ?? false}
      importantForAccessibility={
        importantForAccessibility ?? 'no'
      }
      style={[
        {
          backgroundColor:
            lightColor ??
            darkColor ??
            theme[type ?? 'background'],
        },
        style,
      ]}
      {...otherProps}
    />
  );
}