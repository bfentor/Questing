import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// The logo's colours (assets/logo/logo.svg), the same whatever the theme.
const NAVY = '#0b1020';
const INDIGO = '#818cf8';

// The mark's shapes, as fractions of its width (from logo.svg, where it's 1211 units wide).
const LEG = 1171 / 1211;
const BAR_CENTRE = 886.75 / 1211;
const BAR_LENGTH = 899 / 1211;
const BAR_WIDTH = 47 / 1211;
// The mark's share of the full icon's width.
const MARK_IN_ICON = 1211 / 2048;

type LogoMarkProps = {
  size: number;
  /** The theme's tint unless given. */
  color?: string;
};

/**
 * The Sidequest mark (a flag, or a K), drawn with views so it's sharp at any size and takes
 * the theme's colour. Screen readers skip it; the name beside it says what it is.
 */
export function LogoMark({ size, color }: LogoMarkProps) {
  const theme = useTheme();
  const fill = color ?? theme.tint;
  const leg = size * LEG;
  // Never thinner than a pixel and a half, or it fades away when small.
  const bar = Math.max(1.5, size * BAR_WIDTH);
  const length = size * BAR_LENGTH;

  return (
    <View style={{ width: size, height: size }} aria-hidden>
      {/* A right-angled triangle: the top border of an empty box, cut off by the right one. */}
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: leg,
          borderRightWidth: leg,
          borderTopColor: fill,
          borderRightColor: 'transparent',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * BAR_CENTRE - length / 2,
          top: size * BAR_CENTRE - bar / 2,
          width: length,
          height: bar,
          borderRadius: bar / 2,
          backgroundColor: fill,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

/** The app icon: the mark on the logo's navy, in a circle (or a rounded square). */
export function LogoBadge({ size, round = true }: { size: number; round?: boolean }) {
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: round ? size / 2 : size * 0.2,
        backgroundColor: NAVY,
      }}>
      <LogoMark size={size * MARK_IN_ICON} color={INDIGO} />
    </View>
  );
}
