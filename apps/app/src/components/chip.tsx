import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';

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

/** A small toggle: filled with the tint when selected. */
export function Chip({ label, selected, onPress, expanded, radio }: ChipProps) {
  const shape = useShape();
  const theme = useTheme();
  const toggles = expanded === undefined;
  return (
    <Pressable
      role={!toggles ? 'button' : radio ? 'radio' : 'checkbox'}
      aria-checked={toggles ? selected : undefined}
      aria-expanded={expanded}
      onPress={onPress}
      style={[
        styles.chip,
        shape.selector,
        { backgroundColor: selected ? theme.tint : theme.backgroundElement },
      ]}>
      <ThemedText type="small" style={selected && { color: theme.onTint }}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
});
