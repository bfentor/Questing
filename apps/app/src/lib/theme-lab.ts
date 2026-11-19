import { useSyncExternalStore } from 'react';

import {
  Colors,
  Shape,
  type ShapeToken,
  type ShapeValues,
  type ThemeColor,
} from '@/constants/theme';

import { preferences } from './preferences';

/**
 * Development-only overrides for the Theme lab screen. useTheme() and useShape() read from here,
 * so an edit shows up on every screen at once. In production builds nothing is ever overridden
 * and the values are exactly `Colors` and `Shape` from constants/theme.ts.
 */

export type Scheme = 'light' | 'dark';
export type Palette = Record<ThemeColor, string>;
/** A complete look: both palettes and the shape. */
export type Look = { light: Palette; dark: Palette; shape: ShapeValues };

export const THEME_TOKENS = Object.keys(Colors.light) as ThemeColor[];
export const SHAPE_TOKENS = Object.keys(Shape) as ShapeToken[];

const PREFERENCE_KEY = 'themeLab';
export const DEFAULT_LOOK: Look = { light: Colors.light, dark: Colors.dark, shape: Shape };
const listeners = new Set<() => void>();

let look: Look = DEFAULT_LOOK;

function parse(stored: string | null | undefined): Look {
  try {
    const parsed = stored ? JSON.parse(stored) : null;
    return {
      light: { ...DEFAULT_LOOK.light, ...parsed?.light },
      dark: { ...DEFAULT_LOOK.dark, ...parsed?.dark },
      shape: { ...DEFAULT_LOOK.shape, ...parsed?.shape },
    };
  } catch {
    return DEFAULT_LOOK;
  }
}

/** Only the parts that differ from the defaults are kept on the device. */
function diff<T extends Record<string, string | number>>(values: T, defaults: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([key, value]) => !sameValue(value, defaults[key])),
  ) as Partial<T>;
}

function sameValue(a: string | number, b: string | number) {
  return typeof a === 'string' && typeof b === 'string'
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}

function apply(next: Look) {
  look = next;
  listeners.forEach((listener) => listener());
}

function applyAndSave(next: Look) {
  if (!__DEV__) return;
  apply(next);
  void preferences.set(
    PREFERENCE_KEY,
    JSON.stringify({
      light: diff(next.light, DEFAULT_LOOK.light),
      dark: diff(next.dark, DEFAULT_LOOK.dark),
      shape: diff(next.shape, DEFAULT_LOOK.shape),
    }),
  );
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
  applyAndSave({ ...look, [scheme]: { ...look[scheme], [token]: value } });
}

export function setShape(token: ShapeToken, value: number) {
  applyAndSave({ ...look, shape: { ...look.shape, [token]: value } });
}

/** Replaces everything at once, e.g. with a preset. */
export function setLook(next: Look) {
  applyAndSave(next);
}

/** Back to the values in constants/theme.ts. */
export function resetLook() {
  apply(DEFAULT_LOOK);
  void preferences.remove(PREFERENCE_KEY);
}

/** Whether a colour differs from the one in constants/theme.ts. */
export function isColorChanged(scheme: Scheme, token: ThemeColor, value: string) {
  return !sameValue(value, DEFAULT_LOOK[scheme][token]);
}

/**
 * The look as `Colors` and `Shape` blocks to paste into constants/theme.ts. Takes the look as an
 * argument (from useLook) so the React Compiler re-runs it when it changes.
 */
// What each shape token is for, written above it in the generated code (as in theme.ts).
const SHAPE_COMMENTS: Record<ShapeToken, string> = {
  boxRadius: 'Cards, panels and pictures (dialogs are 1.5×, small pictures ½×).',
  buttonRadius: 'Buttons and segmented controls.',
  fieldRadius: 'Text inputs and date fields.',
  selectorRadius: 'Chips, pills and progress bars (checkboxes stop at 6). 999 is fully round.',
  border: 'Outline width around cards, dialogs and inputs; 0 for none.',
  depth: 'Shadow under cards, dialogs and filled buttons: 0 flat, 1 subtle, 2 raised.',
  controlHeight:
    'Height of buttons and single-line inputs; 44 is the smallest comfortable touch target.',
};

/**
 * The look as source code: everything in constants/theme.ts from `export const Colors` to
 * `export type ShapeValues`, types and comments included, so it can be pasted over that part.
 */
export function lookAsCode({ light, dark, shape }: Look) {
  const colors = (palette: Palette) =>
    THEME_TOKENS.map((token) => `    ${token}: '${palette[token]}',`).join('\n');
  return [
    'export const Colors = {',
    '  light: {',
    colors(light),
    '  },',
    '  dark: {',
    colors(dark),
    '  },',
    '} as const;',
    '',
    'export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;',
    '',
    '/**',
    " * The app's shape: how round, outlined and raised things are. Components read it through",
    ' * useShape(); in development the Theme lab (Settings → Theme lab) edits it live.',
    ' */',
    'export const Shape = {',
    ...SHAPE_TOKENS.flatMap((token) => [
      `  /** ${SHAPE_COMMENTS[token]} */`,
      `  ${token}: ${shape[token]},`,
    ]),
    '} as const;',
    '',
    'export type ShapeToken = keyof typeof Shape;',
    'export type ShapeValues = Record<ShapeToken, number>;',
  ].join('\n');
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Everything: `Colors` and `Shape`, plus any Theme lab tweaks in development. */
export function useLook(): Look {
  return useSyncExternalStore(
    subscribe,
    () => look,
    () => DEFAULT_LOOK,
  );
}

/** The palette for a scheme. */
export function usePalette(scheme: Scheme): Palette {
  return useLook()[scheme];
}

/** The shape tokens. */
export function useShapeValues(): ShapeValues {
  return useLook().shape;
}
