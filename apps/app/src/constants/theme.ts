/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0f172a',
    background: '#f8fafc',
    backgroundElement: '#eef2f7',
    backgroundSelected: '#dbe3ee',
    textSecondary: '#526079',
    tint: '#4f46e5',
    onTint: '#ffffff',
    danger: '#dc2626',
  },
  dark: {
    text: '#e2e8f0',
    background: '#0b1020',
    backgroundElement: '#151b2e',
    backgroundSelected: '#2a3350',
    textSecondary: '#94a3b8',
    tint: '#818cf8',
    onTint: '#0b1020',
    danger: '#f87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * The app's shape: how round, outlined and raised things are. Components read it through
 * useShape(); in development the Theme lab (Settings → Theme lab) edits it live.
 */
export const Shape = {
  /** Cards, panels and pictures (dialogs are 1.5×, small pictures ½×). */
  boxRadius: 16,
  /** Buttons and segmented controls. */
  buttonRadius: 8,
  /** Text inputs and date fields. */
  fieldRadius: 8,
  /** Chips, pills and progress bars (checkboxes stop at 6). 999 is fully round. */
  selectorRadius: 999,
  /** Outline width around cards, dialogs and inputs; 0 for none. */
  border: 3,
  /** Shadow under cards, dialogs and filled buttons: 0 flat, 1 subtle, 2 raised. */
  depth: 1,
  /** Height of buttons and single-line inputs; 44 is the smallest comfortable touch target. */
  controlHeight: 56,
} as const;

export type ShapeToken = keyof typeof Shape;
export type ShapeValues = Record<ShapeToken, number>;

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
/** Feeds and detail pages stay readable on wide (desktop) screens. */
export const MaxContentWidth = 640;
