import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const INSET = 4;
const THUMB = TRACK_HEIGHT - 2 * INSET;
const TRAVEL = TRACK_WIDTH - THUMB - 2 * INSET;
// While held, the knob stretches toward where it's going, like a drop of water.
const STRETCH = 6;
const SPRING = { damping: 14, stiffness: 320, mass: 0.6 };

type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

/**
 * An on/off switch in the theme's colours (React Native's own is green on the web and the
 * platform's colour elsewhere). The knob springs across, and stretches while held.
 */
export function Switch({ value, onValueChange, accessibilityLabel, disabled }: SwitchProps) {
  const theme = useTheme();
  const shape = useShape();
  const reducedMotion = useReducedMotion();
  const position = useSharedValue(value ? 1 : 0);
  const held = useSharedValue(0);

  useEffect(() => {
    position.set(reducedMotion ? (value ? 1 : 0) : withSpring(value ? 1 : 0, SPRING));
  }, [value, position, reducedMotion]);

  const off = theme.backgroundSelected;
  const on = theme.tint;
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(position.get(), [0, 1], [off, on]),
  }));
  const knob = useAnimatedStyle(() => {
    const stretch = held.get() * STRETCH;
    return {
      width: THUMB + stretch,
      // Grows to the right when off and to the left when on, so it leans toward its next place.
      transform: [{ translateX: position.get() * (TRAVEL - stretch) }],
    };
  });

  const toggle = () => {
    haptic('tick');
    onValueChange(!value);
  };
  const radius = Math.min(shape.selectorRadius, TRACK_HEIGHT / 2);
  // On the web, Pressable answers Enter but only buttons answer Space, which switches should.
  // react-native-web passes onKeyDown on; React Native's types don't know it.
  const keyboard: object =
    Platform.OS === 'web'
      ? {
          onKeyDown: (event: { key: string; preventDefault: () => void }) => {
            if (event.key === ' ' && !disabled) {
              event.preventDefault();
              toggle();
            }
          },
        }
      : {};

  return (
    <Pressable
      role="switch"
      aria-checked={value}
      aria-disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={toggle}
      onPressIn={() => {
        if (!reducedMotion) held.set(withTiming(1, { duration: 120 }));
      }}
      onPressOut={() => {
        held.set(withTiming(0, { duration: 160 }));
      }}
      {...keyboard}
      style={disabled && styles.disabled}>
      <Animated.View style={[styles.track, { borderRadius: radius }, track]}>
        <Animated.View
          style={[
            styles.thumb,
            { borderRadius: Math.max(0, radius - INSET), backgroundColor: '#ffffff' },
            knob,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    padding: INSET,
    justifyContent: 'center',
  },
  thumb: {
    height: THUMB,
    boxShadow: '0px 1px 3px rgba(34, 28, 53, 0.25)',
  },
  disabled: {
    opacity: 0.5,
  },
});
