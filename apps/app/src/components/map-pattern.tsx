import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** The map's own colours: open land, forest, water and contour lines. */
const MAP = {
  light: { land: '#FBEFC8', forest: '#D3EBC4', water: '#BFE2F3', contour: '#C98A4B' },
  dark: { land: '#2E2840', forest: '#243328', water: '#1E3447', contour: '#8C6A4A' },
};

// A course across the map: a start triangle, two checkpoints and the finish, joined by lines
// that stop at each mark's edge, as on a real orienteering map.
const START = { x: 56, y: 92 };
const CONTROLS = [
  { x: 168, y: 46 },
  { x: 268, y: 98 },
];
const FINISH = { x: 352, y: 50 };
const RADIUS = 13;

function leg(from: { x: number; y: number }, to: { x: number; y: number }, gap = RADIUS + 4) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  return {
    x1: from.x + ux * gap,
    y1: from.y + uy * gap,
    x2: to.x - ux * gap,
    y2: to.y - uy * gap,
  };
}

type MapPatternProps = {
  /** Draw a course across it in the accent colour. */
  course?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A scrap of orienteering map: open land, a patch of forest, a lake and contour lines, with
 * a course across it if asked. It fills its box (cropping, never stretching), so it works as
 * a banner or a profile's missing cover. Decorative.
 */
export function MapPattern({ course, style }: MapPatternProps) {
  const theme = useTheme();
  const map = MAP[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const stops = [START, ...CONTROLS, FINISH];

  return (
    <View style={[styles.box, style]} accessible={false} aria-hidden>
      <Svg width="100%" height="100%" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid slice">
        <Rect width={400} height={140} fill={map.land} />
        <Path d="M0 0H150C140 30 175 52 150 78C125 104 60 96 30 140H0Z" fill={map.forest} />
        <Path d="M300 140C292 118 318 104 348 108C378 112 386 92 400 88V140Z" fill={map.water} />
        <G stroke={map.contour} strokeWidth={1.6} fill="none" strokeLinecap="round">
          <Path d="M196 70C196 46 236 34 262 44C290 54 296 80 272 92C246 104 196 96 196 70Z" />
          <Path d="M214 69C216 55 240 50 256 56C272 62 274 78 260 84C244 90 212 84 214 69Z" />
          <Path d="M230 68C232 62 244 60 250 64C256 68 252 76 244 76C236 76 229 73 230 68Z" />
          <Path d="M-10 118C40 110 70 128 120 120C170 112 200 132 250 128" />
          <Path d="M300 -10C306 20 340 26 372 18C390 13 400 20 410 26" />
          <Path d="M318 -10C326 8 352 10 380 4" />
        </G>
        {course ? (
          <G stroke={theme.tint} strokeWidth={3} fill="none">
            {stops.slice(1).map((stop, index) => {
              const from = stops[index];
              // The start triangle's corners reach further than a circle's edge.
              const line = leg(from, stop, index === 0 ? RADIUS + 6 : RADIUS + 4);
              return <Line key={index} {...line} />;
            })}
            <Polygon
              points={`${START.x},${START.y - 15} ${START.x + 13},${START.y + 8} ${START.x - 13},${START.y + 8}`}
            />
            {CONTROLS.map((control, index) => (
              <Circle key={index} cx={control.x} cy={control.y} r={RADIUS} />
            ))}
            <Circle cx={FINISH.x} cy={FINISH.y} r={RADIUS} />
            <Circle cx={FINISH.x} cy={FINISH.y} r={RADIUS - 5} />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
  },
});
