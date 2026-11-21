import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  /** Read by screen readers when the label isn't plain text. */
  accessibilityLabel?: string;
};

/** A box whose tick springs in when it's checked. */
export function Checkbox({ checked, onChange, label, accessibilityLabel }: CheckboxProps) {
  const shape = useShape();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  // A plain-text label names the checkbox and toggles it when tapped.
  const text = typeof label === 'string' ? label : undefined;
  return (
    <View style={styles.row}>
      <PressableScale
        role="checkbox"
        aria-checked={checked}
        accessibilityLabel={accessibilityLabel ?? text}
        hitSlop={8}
        squish="icon"
        feedback="tick"
        onPress={() => onChange(!checked)}
        style={[
          styles.box,
          shape.checkbox,
          {
            borderColor: checked ? theme.tint : theme.textSecondary,
            backgroundColor: checked ? theme.tint : 'transparent',
          },
        ]}>
        {checked ? (
          <Animated.View entering={reducedMotion ? undefined : ZoomIn.springify().damping(12)}>
            <SymbolView
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              size={18}
              weight="bold"
              tintColor={theme.onTint}
            />
          </Animated.View>
        ) : null}
      </PressableScale>
      <View style={styles.label}>
        {text ? <ThemedText onPress={() => onChange(!checked)}>{text}</ThemedText> : label}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  box: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  label: {
    flex: 1,
  },
});
