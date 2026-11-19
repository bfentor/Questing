import { useMyEvents, type MyEventList } from '@sidequest/api';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { EventCalendar } from '@/components/event-calendar';
import { EventCard } from '@/components/event-card';
import { FeedList } from '@/components/feed-list';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { Spacing } from '@/constants/theme';
import { useMe } from '@/hooks/use-me';
import { useBooleanPreference } from '@/lib/preferences';

/**
 * Events you're going to, saved, or host (with your organizations), upcoming or past. The
 * ones you're going to can also be seen as a calendar (remembered on this device).
 */
export default function MyEventsScreen() {
  const { t } = useTranslation();
  const [list, setList] = useState<MyEventList>('attending');
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const events = useMyEvents(list, when);
  const me = useMe();
  const [calendarChosen, setCalendar] = useBooleanPreference('myEvents.calendar', false);
  const calendar = list === 'attending' && calendarChosen;

  const lists = (
    <SegmentedControl
      value={list}
      onChange={setList}
      options={[
        { value: 'attending', label: t('myEvents.attending') },
        { value: 'saved', label: t('myEvents.saved') },
        { value: 'hosting', label: t('myEvents.hosting') },
      ]}
    />
  );
  const views =
    list === 'attending' ? (
      <SegmentedControl
        value={calendar ? 'calendar' : 'list'}
        onChange={(view) => setCalendar(view === 'calendar')}
        options={[
          { value: 'list', label: t('calendar.list') },
          { value: 'calendar', label: t('calendar.calendar') },
        ]}
      />
    ) : null;

  if (calendar) {
    return (
      <Screen hasHeader>
        <View style={styles.header}>
          {lists}
          {views}
        </View>
        <EventCalendar />
      </Screen>
    );
  }

  return (
    <FeedList
      query={events}
      hasHeader
      header={
        <View style={styles.header}>
          {lists}
          {views}
          <SegmentedControl
            value={when}
            onChange={setWhen}
            options={[
              { value: 'upcoming', label: t('myEvents.upcoming') },
              { value: 'past', label: t('myEvents.past') },
            ]}
          />
          {list === 'hosting' && me ? (
            <Button
              title={t('dashboard.title')}
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/profiles/[handle]/dashboard',
                  params: { handle: me.handle },
                })
              }
            />
          ) : null}
        </View>
      }
      renderItem={(event) => <EventCard event={event} />}
      keyExtractor={(event) => String(event.id)}
      emptyText={
        {
          attending: t('myEvents.attendingEmpty'),
          saved: t('myEvents.savedEmpty'),
          hosting: t('myEvents.empty'),
        }[list]
      }
    />
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.two,
  },
});
