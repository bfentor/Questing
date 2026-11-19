import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';

import { CategoryChip } from './category-chip';

/** Read-only chips for an event's categories. */
export function CategoryChips({ slugs }: { slugs: string[] }) {
  const { bySlug } = useCategories();
  const categories = slugs.flatMap((slug) => bySlug.get(slug) ?? []);

  if (categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {categories.map((category) => (
        <CategoryChip key={category.slug} category={category} />
      ))}
    </View>
  );
}

/** Toggleable chips for choosing categories (an event's, or someone's interests). */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
}) {
  const { categories } = useCategories();

  return (
    <View style={styles.row}>
      {categories.map((category) => {
        const selected = value.includes(category.slug);
        return (
          <CategoryChip
            key={category.slug}
            category={category}
            selected={selected}
            onPress={() =>
              onChange(
                selected
                  ? value.filter((slug) => slug !== category.slug)
                  : [...value, category.slug],
              )
            }
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
