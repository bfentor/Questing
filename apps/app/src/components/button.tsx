import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';

import { ThemedText } from './themed-text';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
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
        size === 'small' && styles.small,
        icon && styles.withIcon,
        variant !== 'secondary' && shape.raised,
        { backgroundColor: background },
        (pressed || disabled) && styles.dimmed,
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
          <ThemedText type="smallBold" style={{ color: foreground, textAlign: 'center' }}>
            {title}
          </ThemedText>
        </>
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
  dimmed: {
    opacity: 0.6,
  },
});
