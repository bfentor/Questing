import { useState } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { haptic, type HapticKind } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** How far each kind of thing gives under a finger: cards a little, small controls more. */
const SQUISH = { card: 0.975, control: 0.94, icon: 0.85 } as const;
// Down quickly and firmly; back up with a little bounce past where it started.
const PRESS = { damping: 30, stiffness: 900, mass: 0.6 };
const RELEASE = { damping: 9, stiffness: 380, mass: 0.6 };

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** How much it shrinks while held. */
  squish?: keyof typeof SQUISH;
  /** What's felt when it's tapped, on phones; none by default. */
  feedback?: HapticKind;
};

/**
 * A Pressable that squishes under a finger and springs back when let go, so every tap visibly
 * lands. With reduce motion on, it dims instead. Takes the same props as Pressable, including a
 * style function of `pressed`, so Link asChild works with it as with Pressable.
 */
export function PressableScale({
  style,
  squish = 'control',
  feedback,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...props
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const pressIn = (event: GestureResponderEvent) => {
    setPressed(true);
    if (!reducedMotion) scale.set(withSpring(SQUISH[squish], PRESS));
    onPressIn?.(event);
  };
  const pressOut = (event: GestureResponderEvent) => {
    setPressed(false);
    scale.set(withSpring(1, RELEASE));
    onPressOut?.(event);
  };
  const press = (event: GestureResponderEvent) => {
    if (feedback) haptic(feedback);
    onPress?.(event);
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={press}
      style={[
        typeof style === 'function' ? style({ pressed }) : style,
        reducedMotion && pressed && { opacity: 0.7 },
        animated,
      ]}
    />
  );
}
