/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  teaGreen: '#CCD5AE',
  beige: '#E9EDC9',
  cornsilk: '#FEFAE0',
  paper: '#FFFDF2',
  papayaWhip: '#FAEDCD',
  lightBronze: '#D4A373',
  bronzeDeep: '#855B38',
  ink: '#2E2D25',
  mutedInk: '#625F50',
  border: '#C8BF9A',
  borderStrong: '#8A8068',
  darkBackground: '#1D231B',
  darkSurface: '#293126',
  darkSelected: '#394334',
  danger: '#A43C32',
  onDanger: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.cornsilk,
    backgroundElement: Palette.paper,
    backgroundSelected: Palette.beige,
    textSecondary: Palette.mutedInk,
    border: Palette.border,
    borderStrong: Palette.borderStrong,
    accent: Palette.lightBronze,
    accentSoft: Palette.teaGreen,
    surfaceWarm: Palette.papayaWhip,
    onAccent: Palette.ink,
    link: Palette.bronzeDeep,
    danger: Palette.danger,
    onDanger: Palette.onDanger,
  },
  dark: {
    text: Palette.cornsilk,
    background: Palette.darkBackground,
    backgroundElement: Palette.darkSurface,
    backgroundSelected: Palette.darkSelected,
    textSecondary: Palette.teaGreen,
    border: '#5A654F',
    borderStrong: Palette.teaGreen,
    accent: Palette.lightBronze,
    accentSoft: '#55634A',
    surfaceWarm: '#443A2D',
    onAccent: Palette.ink,
    link: Palette.lightBronze,
    danger: '#C95A50',
    onDanger: Palette.onDanger,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
export const PortalContentWidth = 1040;
