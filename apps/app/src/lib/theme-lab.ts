import { useSyncExternalStore } from 'react';

import { Colors, type ThemeColor } from '@/constants/theme';

import { preferences } from './preferences';

/**
 * Development-only colour overrides for the Theme lab screen. useTheme() reads the palettes from
 * here, so an edit shows up on every screen at once. In production builds nothing is ever
 * overridden and the palettes are exactly `Colors`.
 */

export type Scheme = 'light' | 'dark';
type Palette = Record<ThemeColor, string>;
type Overrides = Record<Scheme, Partial<Palette>>;

export const THEME_TOKENS = Object.keys(Colors.light) as ThemeColor[];

const PREFERENCE_KEY = 'themeLab';
const DEFAULTS: Record<Scheme, Palette> = Colors;
const listeners = new Set<() => void>();

let overrides: Overrides = { light: {}, dark: {} };
let palettes: Record<Scheme, Palette> = DEFAULTS;

function parse(stored: string | null | undefined): Overrides {
  try {
    const parsed = stored ? JSON.parse(stored) : null;
    return { light: parsed?.light ?? {}, dark: parsed?.dark ?? {} };
  } catch {
    return { light: {}, dark: {} };
  }
}

function apply(next: Overrides) {
  overrides = next;
  // New objects only when something changed, so components that depend on the theme don't re-run.
  palettes = {
    light: { ...DEFAULTS.light, ...next.light },
    dark: { ...DEFAULTS.dark, ...next.dark },
  };
  listeners.forEach((listener) => listener());
}

function save() {
  void preferences.set(PREFERENCE_KEY, JSON.stringify(overrides));
}

if (__DEV__) {
  // The web can read the saved tweaks right away (localStorage is synchronous); phones restore
  // them in restoreThemeLab().
  try {
    const stored = globalThis.localStorage?.getItem(`sidequest.${PREFERENCE_KEY}`);
    if (stored) apply(parse(stored));
  } catch {
    // No storage: start from the defaults.
  }
}

/** Applies the tweaks saved on this device; call once when the app starts. */
export async function restoreThemeLab() {
  if (!__DEV__) return;
  apply(parse(await preferences.get(PREFERENCE_KEY)));
}

export function setThemeColor(scheme: Scheme, token: ThemeColor, value: string) {
  if (!__DEV__) return;
  const forScheme = { ...overrides[scheme] };
  if (!isChanged(scheme, token, value)) {
    delete forScheme[token];
  } else {
    forScheme[token] = value;
  }
  apply({ ...overrides, [scheme]: forScheme });
  save();
}

/** Back to the colours in constants/theme.ts. */
export function resetThemeColors() {
  apply({ light: {}, dark: {} });
  void preferences.remove(PREFERENCE_KEY);
}

/** Whether a colour differs from the one in constants/theme.ts. */
export function isChanged(scheme: Scheme, token: ThemeColor, value: string) {
  return value.toLowerCase() !== DEFAULTS[scheme][token].toLowerCase();
}

/**
 * The palettes as a `Colors` block to paste into constants/theme.ts. Takes them as arguments
 * (from usePalette) so the React Compiler re-runs it when they change.
 */
export function themeAsCode(light: Palette, dark: Palette) {
  const block = (palette: Palette) =>
    THEME_TOKENS.map((token) => `    ${token}: '${palette[token]}',`).join('\n');
  return [
    'export const Colors = {',
    '  light: {',
    block(light),
    '  },',
    '  dark: {',
    block(dark),
    '  },',
    '} as const;',
  ].join('\n');
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The palette for a scheme: `Colors`, plus any Theme lab tweaks in development. */
export function usePalette(scheme: Scheme): Palette {
  return useSyncExternalStore(
    subscribe,
    () => palettes[scheme],
    () => DEFAULTS[scheme],
  );
}
