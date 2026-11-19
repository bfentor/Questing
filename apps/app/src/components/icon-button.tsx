import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useShape } from '@/hooks/use-shape';
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

/**
 * An icon in a filled circle, as tall as a small Button, e.g. "…" beside Follow. `primary`
 * fills it with the accent colour, like a primary Button.
 */
export function RoundIconButton({
  icon,
  label,
  onPress,
  primary,
}: Omit<IconButtonProps, 'size' | 'color'> & { primary?: boolean }) {
  const theme = useTheme();
  const shape = useShape();

  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: primary ? theme.tint : theme.backgroundElement },
        primary && shape.raised,
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={{ ios: icon.ios, android: icon.material, web: icon.material }}
        size={18}
        tintColor={primary ? theme.onTint : theme.text}
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
