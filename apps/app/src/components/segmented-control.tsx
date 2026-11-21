import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';

import { ThemedText } from './themed-text';

type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

const INSET = 4;
const SLIDE = { damping: 18, stiffness: 260, mass: 0.7 };

/**
 * A row of mutually exclusive options, e.g. a profile's Posts / Events tabs. The chosen one sits
 * on a white pill that slides over to the next choice.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const shape = useShape();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const segment = width ? (width - 2 * INSET) / options.length : 0;
  const offset = useSharedValue(index * segment);

  useEffect(() => {
    offset.set(reducedMotion || !segment ? index * segment : withSpring(index * segment, SLIDE));
  }, [index, segment, reducedMotion, offset]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  const radius = shape.buttonRadius;

  return (
    <View
      style={[styles.control, { borderRadius: radius, backgroundColor: theme.backgroundSelected }]}
      role="tablist"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {segment ? (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: segment,
              borderRadius: Math.max(0, radius - INSET),
              backgroundColor: theme.backgroundElement,
            },
            thumb,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="tab"
            aria-selected={selected}
            onPress={() => {
              if (!selected) haptic('tick');
              onChange(option.value);
            }}
            style={[
              styles.segment,
              { borderRadius: Math.max(0, radius - INSET) },
              // Before it's measured, the chosen one is marked without the sliding pill.
              !segment && selected && { backgroundColor: theme.backgroundElement },
            ]}>
            <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    flexDirection: 'row',
    padding: INSET,
  },
  thumb: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: INSET,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
});
