import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type IconButtonProps = {
  /** SF Symbol on iOS; Material Symbol on Android and web. */
  icon: { ios: SFSymbol; material: AndroidSymbol };
  /** Read out by screen readers, since the button has no text. */
  label: string;
  onPress: () => void;
  size?: number;
  color?: string;
};

export function IconButton({ icon, label, onPress, size = 20, color }: IconButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <SymbolView
        name={{ ios: icon.ios, android: icon.material, web: icon.material }}
        size={size}
        tintColor={color ?? theme.textSecondary}
      />
    </Pressable>
  );
}

/** An icon in a filled circle, as tall as a small Button, e.g. "…" beside Follow. */
export function RoundIconButton({ icon, label, onPress }: Omit<IconButtonProps, 'size' | 'color'>) {
  const theme = useTheme();

  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={{ ios: icon.ios, android: icon.material, web: icon.material }}
        size={18}
        tintColor={theme.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  button: {
    padding: 4,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.5,
  },
});
