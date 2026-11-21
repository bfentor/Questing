import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';

import { PressableScale } from './pressable-scale';

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
    <PressableScale
      role="button"
      accessibilityLabel={label}
      hitSlop={8}
      squish="icon"
      feedback="tap"
      onPress={onPress}
      style={styles.button}>
      <SymbolView
        name={{ ios: icon.ios, android: icon.material, web: icon.material }}
        size={size}
        tintColor={color ?? theme.textSecondary}
      />
    </PressableScale>
  );
}

/**
 * An icon in a filled circle, as tall as a small Button, e.g. "…" beside Follow. `primary`
 * fills it with the accent colour, like a primary Button; `outline` rings it with it instead.
 */
export function RoundIconButton({
  icon,
  label,
  onPress,
  primary,
  outline,
}: Omit<IconButtonProps, 'size' | 'color'> & { primary?: boolean; outline?: boolean }) {
  const theme = useTheme();
  const shape = useShape();

  return (
    <PressableScale
      role="button"
      accessibilityLabel={label}
      hitSlop={6}
      squish="icon"
      feedback="tap"
      onPress={onPress}
      style={[
        styles.round,
        {
          backgroundColor: primary ? theme.tint : outline ? 'transparent' : theme.backgroundElement,
        },
        outline && [styles.outline, { borderColor: theme.tint }],
        primary && shape.raised,
      ]}>
      <SymbolView
        name={{ ios: icon.ios, android: icon.material, web: icon.material }}
        size={18}
        tintColor={primary ? theme.onTint : outline ? theme.tint : theme.text}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  round: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  outline: {
    borderWidth: 2,
  },
  button: {
    padding: 4,
    borderRadius: 999,
  },
});
