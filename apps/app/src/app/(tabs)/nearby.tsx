import { useNearbyFeed, type LatLng } from '@sidequest/api';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { EventCard } from '@/components/event-card';
import { EventMap } from '@/components/event-map';
import { FeedFilterBar, useFeedFilters } from '@/components/feed-filter-bar';
import { FeedList } from '@/components/feed-list';
import { PlaceSearch } from '@/components/place-search';
import { Screen } from '@/components/screen';
import { TabTitle } from '@/components/tab-title';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCurrentPosition } from '@/hooks/use-current-position';
import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';
import { useBooleanPreference } from '@/lib/preferences';
import { useSearchPlace, type SearchPlace } from '@/lib/search-place';

function Header() {
  const { t } = useTranslation();
  return <TabTitle title={t('tabs.nearby')} />;
}

export default function NearbyScreen() {
  const { permission, requestPermission, position: device, failed } = useCurrentPosition();
  const [place, setPlace] = useSearchPlace();
  const { t } = useTranslation();
  // A chosen place wins over the device's position, which can be far off on a computer.
  const position = place ?? device;

  if (position) {
    return <NearbyFeed position={position} place={place} onPlace={setPlace} />;
  }

  return (
    <Screen>
      <Header />
      {!permission ? (
        <ActivityIndicator />
      ) : permission.granted ? (
        failed ? (
          <ThemedText themeColor="textSecondary">{t('nearby.locationFailed')}</ThemedText>
        ) : (
          <ActivityIndicator />
        )
      ) : (
        <>
          <ThemedText themeColor="textSecondary">
            {permission.canAskAgain ? t('nearby.askPermission') : t('nearby.permissionDenied')}
          </ThemedText>
          {permission.canAskAgain ? (
            <Button title={t('nearby.useMyLocation')} onPress={requestPermission} />
          ) : null}
        </>
      )}
      {permission && (!permission.granted || failed) ? (
        <>
          <ThemedText themeColor="textSecondary">{t('nearby.orChoosePlace')}</ThemedText>
          <PlaceSearch onPick={setPlace} />
        </>
      ) : null}
    </Screen>
  );
}

const RADII_KM = [2, 5, 10, 25];
const WIDEST_KM = RADII_KM[RADII_KM.length - 1];

type NearbyFeedProps = {
  position: LatLng;
  /** The place searched around, if one was chosen instead of the device's position. */
  place: SearchPlace | null;
  onPlace: (place: SearchPlace | null) => void;
};

function NearbyFeed({ position, place, onPlace }: NearbyFeedProps) {
  const shape = useShape();
  const { t } = useTranslation();
  const theme = useTheme();
  const [radius, setRadius] = useState(10);
  const filterState = useFeedFilters();
  const feed = useNearbyFeed(position, radius, filterState.filters);
  const [showMap, setShowMap] = useBooleanPreference('nearby.showMap', false);
  const events = feed.data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <FeedList
      query={feed}
      header={
        <View style={styles.header}>
          <Header />
          <SearchOrigin place={place} onPlace={onPlace} />
          <View style={styles.radii}>
            {RADII_KM.map((km) => (
              <Pressable
                key={km}
                role="radio"
                aria-checked={radius === km}
                onPress={() => setRadius(km)}
                style={[
                  styles.radius,
                  shape.selector,
                  { backgroundColor: radius === km ? theme.backgroundSelected : 'transparent' },
                ]}>
                <ThemedText type="small">{t('nearby.within', { km })}</ThemedText>
              </Pressable>
            ))}
          </View>
          <FeedFilterBar {...filterState} />
          <Checkbox checked={showMap} onChange={setShowMap} label={t('nearby.showMap')} />
          {showMap ? (
            <>
              <EventMap
                center={position}
                radiusKm={radius}
                events={events}
                onSelect={(event) =>
                  router.push({ pathname: '/events/[id]', params: { id: event.id } })
                }
                centerLabel={place ? t('nearby.searchingHere') : t('nearby.youAreHere')}
                onMove={(spot) => onPlace({ ...spot, label: '' })}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {t('nearby.mapHint')}
              </ThemedText>
            </>
          ) : null}
        </View>
      }
      renderItem={(event) => <EventCard event={event} distanceM={event.distance_m} />}
      keyExtractor={(event) => String(event.id)}
      emptyText={radius < WIDEST_KM ? t('nearby.emptyWithin', { km: radius }) : t('nearby.empty')}
      emptyAction={
        radius < WIDEST_KM ? (
          <Button
            title={t('nearby.widen', { km: WIDEST_KM })}
            variant="secondary"
            onPress={() => setRadius(WIDEST_KM)}
          />
        ) : undefined
      }
    />
  );
}

/** Where the search is centred, with a way to search around another place (or go back). */
function SearchOrigin({
  place,
  onPlace,
}: {
  place: SearchPlace | null;
  onPlace: (place: SearchPlace | null) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [changing, setChanging] = useState(false);

  return (
    <View style={styles.origin}>
      <View style={styles.originRow}>
        <SymbolView
          name={{ ios: 'location', android: 'location_on', web: 'location_on' }}
          size={18}
          tintColor={theme.textSecondary}
        />
        <ThemedText type="small" themeColor="textSecondary" style={styles.originText}>
          {place
            ? t('nearby.searchingAround', {
                // "Lahti, Lahti sub-region, Päijät-Häme, …" reads as just "Lahti".
                place: place.label.split(',')[0] || t('nearby.mapSpot'),
              })
            : t('nearby.searchingAroundYou')}
        </ThemedText>
        {place ? (
          <Button
            size="small"
            variant="secondary"
            title={t('nearby.useMyLocation')}
            onPress={() => onPlace(null)}
          />
        ) : null}
        <Button
          size="small"
          variant="secondary"
          title={changing ? t('common.cancel') : t('nearby.change')}
          onPress={() => setChanging(!changing)}
        />
      </View>
      {changing ? (
        <PlaceSearch
          onPick={(picked) => {
            onPlace(picked);
            setChanging(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  origin: {
    gap: Spacing.two,
  },
  originRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  originText: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 160,
  },
  header: {
    gap: Spacing.three,
  },
  radii: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  radius: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
