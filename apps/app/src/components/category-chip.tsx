import type { Category } from '@questing/api';
import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_COLORS } from '@/lib/category-colors';
import { withAlpha } from '@/lib/color';

import { ThemedText } from './themed-text';

type CategoryChipProps = {
  category: Category;
  /** Filled with the category's colour. */
  selected?: boolean;
  /** Makes it a checkbox; without it the chip only shows the category. */
  onPress?: () => void;
};

/** A category's icon and name, in its own colour. */
export function CategoryChip({ category, selected = false, onPress }: CategoryChipProps) {
  const theme = useTheme();
  const shape = useShape();
  const dark = useColorScheme() === 'dark';
  const colors = CATEGORY_COLORS[category.slug];
  const color = colors ? (dark ? colors.dark : colors.light) : theme.tint;
  const onColor = colors ? (dark ? '#0f172a' : '#ffffff') : theme.onTint;
  const foreground = selected ? onColor : theme.text;

  const content = (
    <>
      {/* Icon names come from the server; an unknown one simply renders nothing. */}
      {category.icon ? (
        <SymbolView
          name={{
            web: category.icon as AndroidSymbol,
            android: category.icon as AndroidSymbol,
          }}
          size={16}
          tintColor={selected ? onColor : color}
        />
      ) : null}
      <ThemedText type="small" style={{ color: foreground }}>
        {category.name}
      </ThemedText>
    </>
  );
  const style = [
    styles.chip,
    shape.selector,
    {
      backgroundColor: selected ? color : withAlpha(color, dark ? 0.16 : 0.1),
      borderColor: selected ? color : withAlpha(color, 0.35),
    },
  ];

  if (!onPress) {
    return <View style={style}>{content}</View>;
  }
  return (
    <Pressable role="checkbox" aria-checked={selected} onPress={onPress} style={style}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three - 1,
    paddingVertical: Spacing.one + 1,
    borderWidth: 1,
  },
});
