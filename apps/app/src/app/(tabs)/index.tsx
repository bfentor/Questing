import {
  useFollowingFeed,
  useMyEvents,
  useNearbyFeed,
  useTrendingFeed,
  useUpcomingFeed,
  type Event,
  type LatLng,
} from '@sidequest/api';
import { Link, router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { EventCard } from '@/components/event-card';
import { FeedList } from '@/components/feed-list';
import { FollowSuggestions } from '@/components/follow-suggestions';
import { IconButton } from '@/components/icon-button';
import { PostCard } from '@/components/post-card';
import { Screen } from '@/components/screen';
import { TabTitle } from '@/components/tab-title';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Welcome } from '@/components/welcome';
import { Spacing } from '@/constants/theme';
import { useCurrentPosition } from '@/hooks/use-current-position';
import { useShape } from '@/hooks/use-shape';
import { useBooleanPreference } from '@/lib/preferences';

// How many events each row on the home page shows before "See all".
const PER_ROW = 6;
// Nearby, for the home page's row: a short walk or ride.
const NEAR_KM = 10;

/**
 * A bit of everything: your next event, what's coming up, near you and trending, people to
 * follow, then posts from everyone you follow. Each row links to its full tab.
 */
export default function HomeScreen() {
  const { status } = useAuth();
  const { t } = useTranslation();

  if (status === 'signed-in') {
    return <SignedInHome />;
  }

  return (
    <Screen>
      <TabTitle title={t('tabs.home')} />
      {status === 'loading' ? (
        <ActivityIndicator />
      ) : (
        <>
          <Welcome />
          <Highlights />
          <SignInCard />
        </>
      )}
    </Screen>
  );
}

function SignedInHome() {
  const { t } = useTranslation();
  const shape = useShape();
  const [hidePast, setHidePast] = useBooleanPreference('following.hidePast', false);
  const [hideSuggestions, setHideSuggestions] = useBooleanPreference(
    'following.hideSuggestions',
    false,
  );
  const feed = useFollowingFeed({ hidePast });
  const next = useNextEvent();

  return (
    <FeedList
      query={feed}
      header={
        <View style={styles.header}>
          <TabTitle title={t('tabs.home')}>
            <IconButton
              icon={{ ios: 'square.and.pencil', material: 'edit_square' }}
              label={t('posts.new')}
              size={28}
              onPress={() => router.push('/posts/new')}
            />
          </TabTitle>
          <NextEvent event={next} />
          <Highlights exclude={next ? [next.id] : []} />
          {hideSuggestions ? null : (
            <ThemedView type="backgroundElement" style={[styles.suggestions, shape.box]}>
              <FollowSuggestions
                limit={3}
                title={
                  <View style={styles.sectionTitle}>
                    <ThemedText type="smallBold">{t('suggestions.title')}</ThemedText>
                    <View style={styles.titleActions}>
                      <Link href="/suggestions">
                        <ThemedText type="small" themeColor="tint">
                          {t('suggestions.seeAll')}
                        </ThemedText>
                      </Link>
                      <IconButton
                        icon={{ ios: 'xmark', material: 'close' }}
                        label={t('suggestions.hide')}
                        size={20}
                        onPress={() => setHideSuggestions(true)}
                      />
                    </View>
                  </View>
                }
              />
            </ThemedView>
          )}
          <ThemedText type="heading">{t('home.fromFollowing')}</ThemedText>
          <Checkbox checked={hidePast} onChange={setHidePast} label={t('following.hidePast')} />
        </View>
      }
      renderItem={(post) => <PostCard post={post} />}
      keyExtractor={(post) => String(post.id)}
      emptyText={t('following.empty')}
    />
  );
}

/** The soonest event you're going to (or else interested in or waitlisted for). */
function useNextEvent() {
  const mine = useMyEvents('attending', 'upcoming');
  const events = firstPage(mine.data);
  return events.find((event) => event.attendance.mine === 'going') ?? events[0];
}

function NextEvent({ event }: { event: Event | undefined }) {
  const { t } = useTranslation();
  if (!event) return null;
  return (
    <Section title={t('home.nextEvent')} seeAll="/my-events">
      <EventCard event={event} />
    </Section>
  );
}

/** Rows of events: near you (if you've already shared your location), coming up and trending. */
function Highlights({ exclude = [] }: { exclude?: number[] }) {
  const { position } = useCurrentPosition();
  return position ? (
    <WithNearby position={position} exclude={exclude} />
  ) : (
    <EventRows nearby={[]} exclude={exclude} />
  );
}

function WithNearby({ position, exclude }: { position: LatLng; exclude: number[] }) {
  const nearby = useNearbyFeed(position, NEAR_KM);
  return <EventRows nearby={firstPage(nearby.data)} exclude={exclude} />;
}

/**
 * The feeds overlap a lot, so each row leaves out what the rows above it (and `exclude`)
 * already show. Near you goes first: it's the most personal.
 */
function EventRows({ nearby, exclude }: { nearby: Event[]; exclude: number[] }) {
  const { t } = useTranslation();
  const upcoming = useUpcomingFeed();
  const trending = useTrendingFeed();
  const shown = new Set(exclude);
  const near = unseen(nearby, shown);
  const soon = unseen(firstPage(upcoming.data), shown);
  const hot = unseen(firstPage(trending.data), shown);

  return (
    <>
      <EventRow title={t('home.nearYou')} seeAll="/nearby" events={near} />
      <EventRow title={t('home.comingUp')} seeAll="/upcoming" events={soon} />
      <EventRow title={t('upcoming.trending')} seeAll="/upcoming" events={hot} />
    </>
  );
}

/** Up to a row's worth of `events` not in `shown`, adding them to it. */
function unseen(events: Event[], shown: Set<number>) {
  const row = events.filter((event) => !shown.has(event.id)).slice(0, PER_ROW);
  row.forEach((event) => shown.add(event.id));
  return row;
}

function firstPage(data: { pages: { results: Event[] }[] } | undefined) {
  return data?.pages[0]?.results ?? [];
}

/** Events side by side, scrolling sideways, so a row stays one card tall. */
function EventRow({ title, seeAll, events }: { title: string; seeAll: Href; events: Event[] }) {
  if (events.length === 0) return null;
  return (
    <Section title={title} seeAll={seeAll}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {events.map((event) => (
          <View key={event.id} style={styles.rowItem}>
            <EventCard event={event} />
          </View>
        ))}
      </ScrollView>
    </Section>
  );
}

function Section({
  title,
  seeAll,
  children,
}: {
  title: string;
  seeAll: Href;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <ThemedText type="heading">{title}</ThemedText>
        <Link href={seeAll}>
          <ThemedText type="small" themeColor="tint">
            {t('home.seeAll')}
          </ThemedText>
        </Link>
      </View>
      {children}
    </View>
  );
}

/** For visitors: what the home page would show once signed in. */
function SignInCard() {
  const { t } = useTranslation();
  const shape = useShape();
  return (
    <ThemedView type="backgroundElement" style={[styles.suggestions, shape.box]}>
      <ThemedText type="heading">{t('home.fromFollowing')}</ThemedText>
      <ThemedText themeColor="textSecondary">{t('following.signInPrompt')}</ThemedText>
      <Button title={t('common.signIn')} onPress={() => router.push('/sign-in')} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.four,
    paddingBottom: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.two,
  },
  rowItem: {
    width: 280,
  },
  suggestions: {
    gap: Spacing.three,
    padding: Spacing.three,
  },
});
