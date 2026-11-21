import { SymbolView } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** For a chip that shows or hides more chips, rather than one that filters. */
  expanded?: boolean;
  /** One of a group where only one can be chosen, rather than a filter that's on or off. */
  radio?: boolean;
};

/**
 * A small toggle: outlined when off, filled with the accent and ticked when on, so it reads as
 * on without relying on colour alone.
 */
export function Chip({ label, selected, onPress, expanded, radio }: ChipProps) {
  const shape = useShape();
  const theme = useTheme();
  const toggles = expanded === undefined;
  const foreground = selected ? theme.onTint : theme.text;
  return (
    <PressableScale
      role={!toggles ? 'button' : radio ? 'radio' : 'checkbox'}
      aria-checked={toggles ? selected : undefined}
      aria-expanded={expanded}
      onPress={onPress}
      feedback="tick"
      style={[
        styles.chip,
        shape.selector,
        selected
          ? { backgroundColor: theme.tint, borderColor: theme.tint }
          : { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
      ]}>
      {toggles && selected ? (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={16}
          tintColor={foreground}
        />
      ) : null}
      <ThemedText type="small" style={{ color: foreground, fontWeight: selected ? 700 : 500 }}>
        {label}
      </ThemedText>
      {toggles ? null : (
        <SymbolView
          name={{
            ios: expanded ? 'chevron.up' : 'chevron.down',
            android: expanded ? 'expand_less' : 'expand_more',
            web: expanded ? 'expand_less' : 'expand_more',
          }}
          size={16}
          tintColor={selected ? theme.onTint : theme.textSecondary}
        />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 38,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderWidth: 1.5,
  },
});
