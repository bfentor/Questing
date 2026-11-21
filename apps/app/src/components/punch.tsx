import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

import { ControlFlag, ControlRing } from './course-marks';

const RING = 56;

/**
 * The moment a checkpoint is punched: the course's circle bursts out from the middle of what's
 * under it and fades, and a flag pops onto its corner. Mount it (with a new `key`) each time;
 * it plays once. Nothing moves with reduce motion on; the flag simply appears.
 */
export function Punch() {
  const reducedMotion = useReducedMotion();
  const ring = useSharedValue(0);
  const flag = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    ring.set(withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    flag.set(
      withDelay(
        90,
        withSequence(
          withSpring(1.25, { damping: 9, stiffness: 520 }),
          withSpring(1, { damping: 10, stiffness: 260 }),
        ),
      ),
    );
  }, [reducedMotion, ring, flag]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - ring.get(),
    transform: [{ scale: 0.5 + ring.get() * 1.9 }],
  }));
  const flagStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, flag.get() * 2),
    transform: [{ scale: flag.get() }, { rotate: '-10deg' }],
  }));

  return (
    <View style={styles.layer} pointerEvents="none">
      {reducedMotion ? null : (
        <Animated.View style={[styles.ring, ringStyle]}>
          <ControlRing size={RING} strokeWidth={4} />
        </Animated.View>
      )}
      <Animated.View style={[styles.flag, flagStyle]}>
        <ControlFlag size={24} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  flag: {
    position: 'absolute',
    top: -8,
    left: -6,
  },
});
