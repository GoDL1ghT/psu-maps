/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0E1420',
    background: '#ffffff',
    backgroundElement: '#F2F3F7',
    backgroundSelected: '#E4E5EC',
    textSecondary: '#5A6272',
    border: '#E1E3EB',
    accent: '#5B45E0',
    accentText: '#ffffff',
    danger: '#C42B3F',
  },
  dark: {
    text: '#F5F6FA',
    background: '#0B0F18',
    backgroundElement: '#171C27',
    backgroundSelected: '#222835',
    textSecondary: '#9AA3B4',
    border: '#252B38',
    accent: '#9E8CFF',
    accentText: '#11132A',
    danger: '#FF7A8A',
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

export const Radius = {
  small: 8,
  medium: 14,
  large: 22,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Пермский государственный университет, корпус 1 */
export const InitialRegion = {
  latitude: 58.0084,
  longitude: 56.1872,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
} as const;
