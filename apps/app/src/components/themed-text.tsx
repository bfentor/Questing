import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { bodyFamily, FontFamily } from '@/constants/fonts';
import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'subtitle'
    | 'heading'
    | 'small'
    | 'smallBold'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

// Screen titles and section titles, for screen readers to jump between.
const HEADING_LEVELS: Partial<Record<NonNullable<ThemedTextProps['type']>, number>> = {
  subtitle: 1,
  heading: 2,
};
// How far display-size text grows with the system text size (body text grows freely).
const MAX_SCALE: Partial<Record<NonNullable<ThemedTextProps['type']>, number>> = {
  title: 1.3,
  subtitle: 1.5,
};
// Set in Anybody; everything else is Figtree, in the weight its style asks for.
const DISPLAY = new Set<ThemedTextProps['type']>(['title', 'subtitle', 'heading']);

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const level = HEADING_LEVELS[type];
  // A style may ask for another weight (e.g. bold on a small label); each weight is its own font.
  const weight = (StyleSheet.flatten(style) as TextStyle | undefined)?.fontWeight;
  const family =
    type === 'code' || DISPLAY.has(type)
      ? undefined
      : {
          fontFamily: bodyFamily(weight ?? (styles[type] as TextStyle).fontWeight),
          fontWeight: 'normal' as const,
        };

  return (
    <Text
      role={level ? 'heading' : undefined}
      aria-level={level}
      maxFontSizeMultiplier={MAX_SCALE[type]}
      style={[
        { color: theme[themeColor ?? (type === 'linkPrimary' ? 'tint' : 'text')] },
        styles[type],
        style,
        family,
      ]}
      {...rest}
    />
  );
}

/**
 * Sizes follow a classic typographic scale (14, 16, 21, 36, 48). Display text is set a little
 * tight, as large type looks loose at its default spacing.
 */
const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontFamily: FontFamily.displayBlack,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: FontFamily.displayBlack,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  heading: {
    fontFamily: FontFamily.display,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
    fontWeight: 500,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    fontWeight: 600,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
