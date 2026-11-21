import {
  eventsAttendanceDestroy,
  eventsAttendanceUpdate,
  eventsRetrieveQueryKey,
  feedsUpcomingListInfiniteQueryKey,
  meAttendingListInfiniteQueryKey,
  type AttendanceSummary,
  type Event,
} from '@questing/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Spacing } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

import { Button } from './button';
import { ControlFlag } from './course-marks';
import { Punch } from './punch';
import { ThemedText } from './themed-text';

type Wants = 'going' | 'interested' | null;

/** The counts as they'll be once `wants` replaces the current answer (a full event waitlists). */
function expected(attendance: AttendanceSummary, wants: Wants): AttendanceSummary {
  const next: AttendanceSummary = { ...attendance, mine: wants };
  const old = attendance.mine;
  if (old === 'going' || old === 'interested' || old === 'waitlisted') {
    next[old] = Math.max(0, next[old] - 1);
  }
  const bucket = wants === 'going' && attendance.is_full ? 'waitlisted' : wants;
  if (bucket) {
    next[bucket] += 1;
    next.mine = bucket;
  }
  return next;
}

/** Going / Interested buttons for an event, updated instantly and confirmed by the server. */
export function RsvpBar({ event }: { event: Event }) {
  const { t } = useTranslation();
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = eventsRetrieveQueryKey({ path: { id: event.id } });
  const { attendance } = event;
  const mine = attendance.mine;
  // Counts the times Going was chosen here, so each one plays the punch again.
  const [punches, setPunches] = useState(0);

  const setAttendance = (summary: AttendanceSummary) =>
    queryClient.setQueryData<Event>(queryKey, (old) => old && { ...old, attendance: summary });

  const update = useMutation({
    mutationFn: async (wants: Wants) => {
      const options = { path: { id: event.id }, throwOnError: true } as const;
      const { data } = wants
        ? await eventsAttendanceUpdate({ ...options, body: { status: wants } })
        : await eventsAttendanceDestroy(options);
      return data;
    },
    onMutate: (wants) => {
      const previous = attendance;
      // Show the choice and counts right away; the server's answer replaces them.
      setAttendance(expected(attendance, wants));
      return { previous };
    },
    onError: (_error, _wants, context) => context && setAttendance(context.previous),
    onSuccess: (summary) => {
      setAttendance(summary);
      queryClient.invalidateQueries({ queryKey: feedsUpcomingListInfiniteQueryKey() });
      queryClient.invalidateQueries({ queryKey: meAttendingListInfiniteQueryKey() });
    },
  });

  const choose = (wants: 'going' | 'interested') => {
    if (status !== 'signed-in') {
      router.push('/sign-in');
      return;
    }
    const current = mine === 'waitlisted' ? 'going' : mine;
    const next = current === wants ? null : wants;
    if (next === 'going') {
      haptic('success');
      setPunches((count) => count + 1);
    }
    update.mutate(next);
  };

  const goingSelected = mine === 'going' || mine === 'waitlisted';

  return (
    <View style={styles.bar}>
      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button
            title={mine === 'waitlisted' ? t('rsvp.waitlisted') : t('rsvp.going')}
            variant={mine === 'going' ? 'flag' : goingSelected ? 'primary' : 'secondary'}
            onPress={() => choose('going')}
          />
          {/* Going is a punched checkpoint: the flag stays on the button's corner. */}
          {mine === 'going' ? (
            punches ? (
              <Punch key={punches} />
            ) : (
              <ControlFlag size={24} style={styles.flag} />
            )
          ) : null}
        </View>
        <View style={styles.button}>
          <Button
            title={t('rsvp.interested')}
            variant={mine === 'interested' ? 'primary' : 'secondary'}
            onPress={() => choose('interested')}
          />
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {[
          t('rsvp.goingCount', { count: attendance.going }),
          t('rsvp.interestedCount', { count: attendance.interested }),
          event.capacity ? t('rsvp.capacity', { count: event.capacity }) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </ThemedText>
      {attendance.is_full && !goingSelected ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('rsvp.fullHint')}
        </ThemedText>
      ) : null}
      {mine === 'waitlisted' ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('rsvp.waitlistHint')}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: Spacing.two,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
  },
  flag: {
    position: 'absolute',
    top: -8,
    left: -6,
    transform: [{ rotate: '-10deg' }],
  },
});
