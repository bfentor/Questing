import { meAttendingListOptions, type Event } from '@sidequest/api';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAnswerColors, type Answer } from '@/hooks/use-answer-colors';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { useFormat } from '@/lib/format';

import { Button } from './button';
import { EventCard } from './event-card';
import { IconButton } from './icon-button';
import { ThemedText } from './themed-text';

const ANSWERS: Answer[] = ['going', 'interested', 'waitlisted'];
// From this cell width, days show their events' titles; narrower ones show dots.
const TITLES_MIN_CELL = 72;
// The most events a day shows before "+2".
const SHOWN_PER_DAY = 3;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Monday on or before `date`. */
function startOfWeek(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

/** The weeks shown for a month: Monday before its first day to the Sunday after its last. */
function gridFor(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const start = startOfWeek(first);
  const end = addDays(startOfWeek(last), 7);
  const days: Date[] = [];
  for (let day = start; day < end; day = addDays(day, 1)) days.push(day);
  return { start, end, days };
}

/** Each day's events, an event that spans days on each of them. */
function byDay(events: Event[]) {
  const days = new Map<string, Event[]>();
  for (const event of events) {
    const start = startOfDay(new Date(event.starts_at));
    // An event ending at midnight doesn't reach into the next day.
    const end = new Date(new Date(event.ends_at).getTime() - 1);
    for (let day = start; day <= end; day = addDays(day, 1)) {
      const key = dayKey(day);
      days.set(key, [...(days.get(key) ?? []), event]);
    }
  }
  return days;
}

function answerOf(event: Event): Answer {
  const mine = event.attendance.mine;
  return mine === 'interested' || mine === 'waitlisted' ? mine : 'going';
}

/**
 * A month of the events you're going to, interested in or waitlisted for, coloured by your
 * answer. Wide screens show their titles in each day, phones dots. Tapping a day lists its
 * events under the month.
 */
export function EventCalendar() {
  const { t } = useTranslation();
  const format = useFormat();
  const theme = useTheme();
  const shape = useShape();
  const colors = useAnswerColors();
  const { width } = useWindowDimensions();
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const grid = useMemo(() => gridFor(month), [month]);

  const { data, isFetching } = useQuery({
    ...meAttendingListOptions({
      query: {
        ends_after: grid.start.toISOString(),
        starts_before: grid.end.toISOString(),
        limit: 100,
      },
    }),
    // Keep last month's events on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
  const days = useMemo(() => byDay(data?.results ?? []), [data]);

  // The column is at most MaxContentWidth, with its padding on either side.
  const cell = (Math.min(width, MaxContentWidth) - 2 * Spacing.three) / 7;
  const showTitles = cell >= TITLES_MIN_CELL;
  const thisMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const move = (months: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + months, 1);
    setMonth(next);
    setSelected(next);
  };
  const selectedEvents = days.get(dayKey(selected)) ?? [];

  return (
    <View style={styles.calendar}>
      <View style={styles.titleRow}>
        <IconButton
          icon={{ ios: 'chevron.left', material: 'chevron_left' }}
          label={t('calendar.previousMonth')}
          size={28}
          onPress={() => move(-1)}
        />
        <ThemedText type="heading" style={styles.title} aria-live="polite">
          {format.month(month)}
        </ThemedText>
        <IconButton
          icon={{ ios: 'chevron.right', material: 'chevron_right' }}
          label={t('calendar.nextMonth')}
          size={28}
          onPress={() => move(1)}
        />
      </View>
      <View style={styles.legend}>
        {ANSWERS.map((answer) => (
          <View key={answer} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors[answer] }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {t(`rsvp.${answer}`)}
            </ThemedText>
          </View>
        ))}
        {thisMonth ? null : (
          <View style={styles.today}>
            <Button
              title={t('calendar.today')}
              variant="secondary"
              size="small"
              onPress={() => {
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelected(today);
              }}
            />
          </View>
        )}
      </View>

      <View style={[styles.grid, { opacity: isFetching && !data ? 0.5 : 1 }]}>
        <View style={styles.week}>
          {grid.days.slice(0, 7).map((day) => (
            <ThemedText
              key={day.getDay()}
              type="small"
              themeColor="textSecondary"
              style={styles.weekday}>
              {format.weekday(day)}
            </ThemedText>
          ))}
        </View>
        {Array.from({ length: grid.days.length / 7 }, (_, week) => (
          <View key={week} style={styles.week}>
            {grid.days.slice(week * 7, week * 7 + 7).map((day) => {
              const events = days.get(dayKey(day)) ?? [];
              const isToday = day.getTime() === today.getTime();
              const isSelected = day.getTime() === selected.getTime();
              const inMonth = day.getMonth() === month.getMonth();
              const label = events.length
                ? t('calendar.dayLabel', { date: format.day(day), count: events.length })
                : format.day(day);
              return (
                <Pressable
                  key={day.getTime()}
                  role="button"
                  aria-selected={isSelected}
                  accessibilityLabel={label}
                  onPress={() => setSelected(day)}
                  style={[
                    styles.day,
                    { minHeight: showTitles ? 88 : 52, borderRadius: shape.buttonRadius },
                    isSelected && { backgroundColor: theme.backgroundSelected },
                    !inMonth && styles.outside,
                  ]}>
                  <View style={[styles.dayNumber, isToday && { backgroundColor: theme.tint }]}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        color: isToday
                          ? theme.onTint
                          : day < today
                            ? theme.textSecondary
                            : theme.text,
                      }}>
                      {day.getDate()}
                    </ThemedText>
                  </View>
                  {showTitles ? (
                    <DayTitles events={events} colors={colors} />
                  ) : (
                    <DayDots events={events} colors={colors} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <ThemedText type="heading">{format.day(selected)}</ThemedText>
      {selectedEvents.length ? (
        selectedEvents.map((event) => <EventCard key={event.id} event={event} />)
      ) : (
        <ThemedText themeColor="textSecondary">{t('calendar.nothing')}</ThemedText>
      )}
    </View>
  );
}

/** Up to three titles in their answer's colour, then "+2". */
function DayTitles({ events, colors }: { events: Event[]; colors: Record<Answer, string> }) {
  const theme = useTheme();
  return (
    <View style={styles.titles}>
      {events.slice(0, SHOWN_PER_DAY).map((event) => {
        const answer = answerOf(event);
        const going = answer === 'going';
        return (
          <View
            key={event.id}
            style={[
              styles.chip,
              going
                ? { backgroundColor: colors.going }
                : {
                    backgroundColor: withAlpha(colors[answer], 0.16),
                    borderLeftWidth: 3,
                    borderLeftColor: colors[answer],
                  },
            ]}>
            <ThemedText
              numberOfLines={1}
              style={[styles.chipText, { color: going ? theme.onTint : theme.text }]}>
              {event.title}
            </ThemedText>
          </View>
        );
      })}
      <More count={events.length - SHOWN_PER_DAY} />
    </View>
  );
}

/** Up to three dots in their answer's colour, then "+2". */
function DayDots({ events, colors }: { events: Event[]; colors: Record<Answer, string> }) {
  return (
    <View style={styles.dots}>
      {events.slice(0, SHOWN_PER_DAY).map((event) => (
        <View key={event.id} style={[styles.dot, { backgroundColor: colors[answerOf(event)] }]} />
      ))}
      <More count={events.length - SHOWN_PER_DAY} />
    </View>
  );
}

function More({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <ThemedText themeColor="textSecondary" style={styles.chipText}>
      +{count}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  calendar: {
    gap: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  today: {
    marginLeft: 'auto',
  },
  grid: {
    gap: Spacing.half,
  },
  week: {
    flexDirection: 'row',
    gap: Spacing.half,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  day: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  outside: {
    opacity: 0.4,
  },
  dayNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    alignSelf: 'stretch',
    gap: 2,
    paddingHorizontal: 2,
  },
  chip: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  chipText: {
    fontSize: 11,
    lineHeight: 14,
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
