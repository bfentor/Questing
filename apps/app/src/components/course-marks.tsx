import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/**
 * Marks borrowed from orienteering maps, where a course is a row of checkpoints you visit in
 * turn. The app uses them for events: the checkpoint's flag marks one you're going to, and the
 * course's magenta circle marks where you are. Decorative: the text beside them says the same.
 */

/** A checkpoint flag: a square split corner to corner, white and orange, like a sticker. */
export function ControlFlag({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={style} accessible={false} aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x={1} y={1} width={22} height={22} rx={3.5} fill="#ffffff" />
        <Path d="M23 1 L23 19.5 A3.5 3.5 0 0 1 19.5 23 L1 23 Z" fill={theme.flag} />
        <Rect
          x={1}
          y={1}
          width={22}
          height={22}
          rx={3.5}
          fill="none"
          stroke={theme.onFlag}
          strokeOpacity={0.85}
          strokeWidth={1.6}
        />
      </Svg>
    </View>
  );
}

/** The course's circle around a checkpoint, in the accent colour. */
export function ControlRing({
  size,
  strokeWidth = 2.5,
  color,
}: {
  size: number;
  strokeWidth?: number;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={(size - strokeWidth) / 2}
        stroke={color ?? theme.tint}
        strokeWidth={strokeWidth}
        fill="none"
      />
    </Svg>
  );
}
