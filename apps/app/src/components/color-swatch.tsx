import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ColorSwatchProps = {
  label: string;
  value: string;
  /** Used on the web, where the swatch opens the browser's colour picker. */
  onChange: (value: string) => void;
};

/** A preview of a colour; on phones it's edited by typing its hex code next to it. */
export function ColorSwatch({ label, value }: ColorSwatchProps) {
  const theme = useTheme();

  return (
    <View
      aria-label={label}
      style={[styles.swatch, { backgroundColor: value, borderColor: theme.backgroundSelected }]}
    />
  );
}

export const SWATCH_SIZE = 44;

const styles = StyleSheet.create({
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 4,
    borderWidth: 1,
  },
});
