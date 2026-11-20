import { geocodeListOptions } from '@questing/api';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';
import type { SearchPlace } from '@/lib/search-place';

import { TextField } from './text-field';
import { ThemedText } from './themed-text';

/** A field that finds towns, addresses and places as you type; picking one returns it. */
export function PlaceSearch({ onPick }: { onPick: (place: SearchPlace) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const shape = useShape();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useQuery({
    ...geocodeListOptions({ query: { q: debounced } }),
    enabled: debounced.length >= 3,
    staleTime: 60 * 60 * 1000,
  });

  return (
    <View style={styles.field}>
      <TextField
        label={t('nearby.placeLabel')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoFocus
        notALogin
      />
      {results.isFetching ? <ActivityIndicator /> : null}
      {debounced.length >= 3 && results.data?.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('nearby.noPlaces')}
        </ThemedText>
      ) : null}
      {results.data?.length ? (
        <View
          style={[
            styles.results,
            { borderRadius: shape.fieldRadius, backgroundColor: theme.backgroundElement },
          ]}>
          {results.data.map((place) => (
            <Pressable
              key={`${place.lat},${place.lng}`}
              role="option"
              onPress={() => onPick({ label: place.label, lat: place.lat, lng: place.lng })}
              style={({ pressed, hovered }) => [
                styles.result,
                (pressed || hovered) && { backgroundColor: theme.backgroundSelected },
              ]}>
              <ThemedText type="small">{place.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  results: {
    overflow: 'hidden',
  },
  result: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
