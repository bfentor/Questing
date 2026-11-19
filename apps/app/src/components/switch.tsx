import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const INSET = 3;
const THUMB = TRACK_HEIGHT - 2 * INSET;
const TRAVEL = TRACK_WIDTH - THUMB - 2 * INSET;

type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

/**
 * An on/off switch in the theme's colours, as round as its chips (React Native's own is
 * green on the web and the platform's colour elsewhere).
 */
export function Switch({ value, onValueChange, accessibilityLabel, disabled }: SwitchProps) {
  const theme = useTheme();
  const shape = useShape();
  const reducedMotion = useReducedMotion();
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(position, {
      toValue: value ? 1 : 0,
      duration: reducedMotion ? 0 : 150,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [value, position, reducedMotion]);

  const toggle = () => onValueChange(!value);
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
      {...keyboard}
      style={[
        styles.track,
        {
          borderRadius: radius,
          backgroundColor: value ? theme.tint : theme.backgroundSelected,
        },
        disabled && styles.disabled,
      ]}>
      <Animated.View
        style={[
          styles.thumb,
          {
            borderRadius: Math.max(0, radius - INSET),
            backgroundColor: value ? theme.onTint : theme.textSecondary,
            transform: [
              {
                translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] }),
              },
            ],
          },
        ]}
      />
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
    width: THUMB,
    height: THUMB,
  },
  disabled: {
    opacity: 0.5,
  },
});
