import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

type ButtonProps = {
  title: string;
  onPress: () => void;
  /** `outline` is the accent colour as a border and label, beside a filled primary Button. */
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  /** `small` is a compact pill, e.g. Follow or Edit profile beside a profile picture. */
  size?: 'regular' | 'small';
  disabled?: boolean;
  loading?: boolean;
  /** Before the title: SF Symbol on iOS; Material Symbol on Android and web. */
  icon?: { ios: SFSymbol; material: AndroidSymbol };
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'regular',
  disabled,
  loading,
  icon,
}: ButtonProps) {
  const theme = useTheme();
  const shape = useShape();
  const background = {
    primary: theme.tint,
    // Pale, so it shows on white cards as well as on the page.
    secondary: theme.backgroundSelected,
    danger: theme.danger,
    outline: 'transparent',
  }[variant];
  const foreground = {
    primary: theme.onTint,
    secondary: theme.text,
    danger: theme.onTint,
    outline: theme.tint,
  }[variant];
  const filled = variant !== 'secondary' && variant !== 'outline';

  return (
    <PressableScale
      role="button"
      onPress={onPress}
      feedback="tap"
      disabled={disabled || loading}
      style={[
        styles.button,
        shape.button,
        size === 'small' && styles.small,
        icon && styles.withIcon,
        filled && shape.raised,
        variant === 'outline' && [styles.outline, { borderColor: theme.tint }],
        { backgroundColor: background },
        disabled && styles.dimmed,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? (
            <SymbolView
              name={{ ios: icon.ios, android: icon.material, web: icon.material }}
              size={size === 'small' ? 16 : 18}
              tintColor={foreground}
            />
          ) : null}
          <ThemedText
            type="smallBold"
            style={[styles.label, size === 'small' && styles.smallLabel, { color: foreground }]}>
            {title}
          </ThemedText>
        </>
      )}
    </PressableScale>
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
  small: {
    // Still a comfortable tap target with the hit slop of the row around it.
    minHeight: 34,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  withIcon: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  outline: {
    borderWidth: 2,
  },
  dimmed: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  smallLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
});
