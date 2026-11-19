import {
  useForYouFeed,
  useTrendingFeed,
  useUpcomingFeed,
  type Event,
  type FeedFilters,
} from '@sidequest/api';
import { router } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { EventCard } from '@/components/event-card';
import { FeedFilterBar, useFeedFilters } from '@/components/feed-filter-bar';
import { FeedList, type FeedQuery } from '@/components/feed-list';
import { IconButton } from '@/components/icon-button';
import { NewEventButton } from '@/components/new-event-button';
import { SegmentedControl } from '@/components/segmented-control';
import { LABELLED_ACTIONS_MIN_WIDTH, TabTitle } from '@/components/tab-title';
import { Spacing } from '@/constants/theme';
import { useCurrentPosition } from '@/hooks/use-current-position';

type Order = 'all' | 'forYou' | 'trending';

type EventFeedProps = { filters: FeedFilters; header: ReactElement; emptyText: string };

function EventFeed({
  query,
  header,
  emptyText,
}: Omit<EventFeedProps, 'filters'> & { query: FeedQuery<Event> }) {
  return (
    <FeedList
      query={query}
      header={header}
      renderItem={(event) => <EventCard event={event} />}
      keyExtractor={(event) => String(event.id)}
      emptyText={emptyText}
    />
  );
}

function AllFeed({ filters, ...props }: EventFeedProps) {
  return <EventFeed query={useUpcomingFeed(filters)} {...props} />;
}

function TrendingFeed({ filters, ...props }: EventFeedProps) {
  return <EventFeed query={useTrendingFeed(filters)} {...props} />;
}

function ForYouFeed({ filters, ...props }: EventFeedProps) {
  // Nearby events rank higher, if the user already shared their location.
  const { position } = useCurrentPosition();
  return <EventFeed query={useForYouFeed(position, filters)} {...props} />;
}

const FEEDS = { all: AllFeed, forYou: ForYouFeed, trending: TrendingFeed };

export default function UpcomingScreen() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const [chosenOrder, setOrder] = useState<Order>('all');
  const filterState = useFeedFilters();
  const filtered = Object.keys(filterState.filters).length > 0;
  const signedIn = status === 'signed-in';
  const { width } = useWindowDimensions();
  const order = !signedIn && chosenOrder === 'forYou' ? 'all' : chosenOrder;

  const orders: { value: Order; label: string }[] = [
    { value: 'all', label: t('upcoming.all') },
    ...(signedIn ? [{ value: 'forYou' as const, label: t('upcoming.forYou') }] : []),
    { value: 'trending', label: t('upcoming.trending') },
  ];

  const header = (
    <View style={styles.headerBlock}>
      <TabTitle title={t('tabs.upcoming')}>
        <IconButton
          icon={{ ios: 'magnifyingglass', material: 'search' }}
          label={t('search.title')}
          size={28}
          onPress={() => router.push('/search')}
        />
        {signedIn ? <NewEventButton compact={width < LABELLED_ACTIONS_MIN_WIDTH} /> : null}
      </TabTitle>
      <SegmentedControl options={orders} value={order} onChange={setOrder} />
      <FeedFilterBar {...filterState} />
    </View>
  );

  const Feed = FEEDS[order];
  const emptyText = filtered
    ? t('filters.nothing')
    : {
        all: t('upcoming.empty'),
        forYou: t('upcoming.forYouEmpty'),
        trending: t('upcoming.trendingEmpty'),
      }[order];
  return <Feed filters={filterState.filters} header={header} emptyText={emptyText} />;
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: Spacing.three,
  },
});
