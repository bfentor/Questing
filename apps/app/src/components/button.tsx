import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';

import { ThemedText } from './themed-text';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const theme = useTheme();
  const shape = useShape();
  const background = {
    primary: theme.tint,
    secondary: theme.backgroundElement,
    danger: theme.danger,
  }[variant];
  const foreground = variant === 'secondary' ? theme.text : theme.onTint;

  return (
    <Pressable
      role="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        shape.button,
        variant !== 'secondary' && shape.raised,
        { backgroundColor: background },
        (pressed || disabled) && styles.dimmed,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <ThemedText type="smallBold" style={{ color: foreground, textAlign: 'center' }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    // Room around labels that wrap onto two lines on narrow screens.
    paddingVertical: Spacing.two,
  },
  dimmed: {
    opacity: 0.6,
  },
});
