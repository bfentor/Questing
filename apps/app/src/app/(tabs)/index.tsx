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
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { EventCard } from '@/components/event-card';
import { FeedList } from '@/components/feed-list';
import { FollowSuggestions } from '@/components/follow-suggestions';
import { IconButton } from '@/components/icon-button';
import { NewEventButton } from '@/components/new-event-button';
import { NewPostButton } from '@/components/new-post-button';
import { PostCard } from '@/components/post-card';
import { QuickPost } from '@/components/quick-post';
import { Screen } from '@/components/screen';
import { TabTitle } from '@/components/tab-title';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Welcome } from '@/components/welcome';
import { Spacing } from '@/constants/theme';
import { useCurrentPosition } from '@/hooks/use-current-position';
import { useShape } from '@/hooks/use-shape';
import { useBooleanPreference } from '@/lib/preferences';

// From this window width, the home page's event sections have two columns.
const TWO_COLUMNS_MIN_WIDTH = 600;
// Below this window width, "New post" and "New event" don't both fit beside the title with
// their labels, so they're round icon buttons.
const LABELLED_BUTTONS_MIN_WIDTH = 480;
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
  const { width } = useWindowDimensions();
  const compact = width < LABELLED_BUTTONS_MIN_WIDTH;
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
            <NewEventButton compact={compact} />
            <NewPostButton compact={compact} />
          </TabTitle>
          <QuickPost />
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
  const { width } = useWindowDimensions();
  const upcoming = useUpcomingFeed();
  const trending = useTrendingFeed();
  // Two rows of two side by side, or three under each other.
  const columns = width >= TWO_COLUMNS_MIN_WIDTH ? 2 : 1;
  const count = columns === 2 ? 4 : 3;
  const shown = new Set(exclude);
  const near = unseen(nearby, shown, count);
  const soon = unseen(firstPage(upcoming.data), shown, count);
  const hot = unseen(firstPage(trending.data), shown, count);

  return (
    <>
      <EventGrid title={t('home.nearYou')} seeAll="/nearby" events={near} columns={columns} />
      <EventGrid title={t('home.comingUp')} seeAll="/upcoming" events={soon} columns={columns} />
      <EventGrid title={t('upcoming.trending')} seeAll="/upcoming" events={hot} columns={columns} />
    </>
  );
}

/** Up to `count` of `events` not in `shown`, adding them to it. */
function unseen(events: Event[], shown: Set<number>, count: number) {
  const row = events.filter((event) => !shown.has(event.id)).slice(0, count);
  row.forEach((event) => shown.add(event.id));
  return row;
}

function firstPage(data: { pages: { results: Event[] }[] } | undefined) {
  return data?.pages[0]?.results ?? [];
}

/** Events in rows of `columns`, the cards in a row as tall as each other. */
function EventGrid({
  title,
  seeAll,
  events,
  columns,
}: {
  title: string;
  seeAll: Href;
  events: Event[];
  columns: number;
}) {
  if (events.length === 0) return null;
  const rows: Event[][] = [];
  for (let start = 0; start < events.length; start += columns) {
    rows.push(events.slice(start, start + columns));
  }
  return (
    <Section title={title} seeAll={seeAll}>
      {rows.map((row) => (
        <View key={row[0].id} style={styles.row}>
          {row.map((event) => (
            <View key={event.id} style={styles.cell}>
              <EventCard event={event} fill />
            </View>
          ))}
          {/* Keeps a lone last card as wide as the others. */}
          {row.length < columns ? <View style={styles.cell} /> : null}
        </View>
      ))}
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
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cell: {
    flex: 1,
  },
  suggestions: {
    gap: Spacing.three,
    padding: Spacing.three,
  },
});
