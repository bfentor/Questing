import { Anybody_800ExtraBold } from '@expo-google-fonts/anybody/800ExtraBold';
import { Anybody_900Black } from '@expo-google-fonts/anybody/900Black';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';

/**
 * The app's two typefaces. Anybody, wide and sporty like a race bib, is for screen titles and
 * event names; Figtree, plain and friendly, is for everything else. Each weight is its own
 * family (phones can't pick a weight out of a family by `fontWeight`), so text sets
 * `fontFamily` and leaves `fontWeight` alone; ThemedText picks the family for its weight.
 */
export const FontFamily = {
  body: 'Figtree-Medium',
  bodySemiBold: 'Figtree-SemiBold',
  bodyBold: 'Figtree-Bold',
  display: 'Anybody-ExtraBold',
  displayBlack: 'Anybody-Black',
} as const;

/** Loaded once in the root layout (app/_layout.tsx), before the first screen shows. */
export const FONT_FILES = {
  [FontFamily.body]: Figtree_500Medium,
  [FontFamily.bodySemiBold]: Figtree_600SemiBold,
  [FontFamily.bodyBold]: Figtree_700Bold,
  [FontFamily.display]: Anybody_800ExtraBold,
  [FontFamily.displayBlack]: Anybody_900Black,
};

/** Figtree in the weight closest to `weight` (we bundle 500, 600 and 700). */
export function bodyFamily(weight: string | number | undefined) {
  const value = weight === 'bold' ? 700 : Number(weight ?? 500) || 500;
  if (value >= 700) return FontFamily.bodyBold;
  if (value >= 600) return FontFamily.bodySemiBold;
  return FontFamily.body;
}
