import type { FeedFilters } from '@sidequest/api';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';
import { timeWindow, type TimeWindow } from '@/lib/time-windows';

import { CategoryChip } from './category-chip';
import { Chip } from './chip';

/** Filter state for a feed, turned into API filters. */
export function useFeedFilters() {
  const [when, setWhen] = useState<TimeWindow>('any');
  const [free, setFree] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  // The window is computed when the choice changes, not on every render.
  const [now, setNow] = useState(() => new Date());

  const filters = useMemo<FeedFilters>(() => {
    const window = timeWindow(when, now);
    return {
      ...(categories.length ? { category: categories } : {}),
      ...(free ? { free: true } : {}),
      ...(window
        ? { starts_after: window[0].toISOString(), starts_before: window[1].toISOString() }
        : {}),
    };
  }, [when, now, free, categories]);

  return {
    filters,
    when,
    setWhen: (next: TimeWindow) => {
      setNow(new Date());
      setWhen(next);
    },
    free,
    setFree,
    categories,
    toggleCategory: (slug: string) =>
      setCategories((current) =>
        current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
      ),
  };
}

type FeedFilterBarProps = ReturnType<typeof useFeedFilters>;

/**
 * Quick time filters, free only, and a chip that shows the categories under them. The chips
 * wrap onto more lines rather than scrolling sideways.
 */
export function FeedFilterBar({
  when,
  setWhen,
  free,
  setFree,
  categories,
  toggleCategory,
}: FeedFilterBarProps) {
  const { t } = useTranslation();
  const { categories: all } = useCategories();
  const [showCategories, setShowCategories] = useState(false);
  const windows = ['today', 'tomorrow', 'week'] as const;

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {windows.map((window) => (
          <Chip
            key={window}
            label={t(`filters.${window}`)}
            selected={when === window}
            onPress={() => setWhen(when === window ? 'any' : window)}
          />
        ))}
        <Chip label={t('filters.free')} selected={free} onPress={() => setFree(!free)} />
        <Chip
          label={
            categories.length
              ? `${t('filters.categories')} · ${categories.length}`
              : t('filters.categories')
          }
          selected={categories.length > 0}
          expanded={showCategories}
          onPress={() => setShowCategories(!showCategories)}
        />
      </View>
      {showCategories ? (
        <View style={styles.row}>
          {all.map((category) => (
            <CategoryChip
              key={category.slug}
              category={category}
              selected={categories.includes(category.slug)}
              onPress={() => toggleCategory(category.slug)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
