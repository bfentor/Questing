import { Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** A row of mutually exclusive options, e.g. a profile's Posts / Events tabs. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const shape = useShape();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.control, { borderRadius: shape.buttonRadius }]}
      role="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="tab"
            aria-selected={selected}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              { borderRadius: Math.max(0, shape.buttonRadius - Spacing.half) },
              selected && { backgroundColor: theme.background },
            ]}>
            <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  control: {
    flexDirection: 'row',
    padding: Spacing.half,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
