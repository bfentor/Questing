import type { Event } from '@questing/api';
import { Link } from 'expo-router';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useAnswerColors } from '@/hooks/use-answer-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';
import { mix, withAlpha } from '@/lib/color';
import { useFormat } from '@/lib/format';

import { useEventPanel } from './event-panel';
import { FriendsGoing } from './friends-going';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type EventCardProps = {
  event: Event;
  /** Shown in the nearby feed. */
  distanceM?: number;
  /** Stretch to the height of its container, e.g. to match the card beside it. */
  fill?: boolean;
};

export function EventCard({ event, distanceM, fill }: EventCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const place = [event.venue_name, distanceM !== undefined && format.distance(distanceM)]
    .filter(Boolean)
    .join(' · ');
  const going = event.attendance.going;
  const panel = useEventPanel();
  const theme = useTheme();
  const shape = useShape();
  const selected = panel?.selected === event.id;
  const mine = event.attendance.mine;
  const isGoing = mine === 'going';
  const dark = useColorScheme() === 'dark';

  const card = (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.card,
        fill && styles.fill,
        shape.box,
        {
          borderWidth: Math.max(2, shape.border),
          // The open event is outlined in the accent; one you're going to, in a paler accent.
          borderColor: selected
            ? theme.tint
            : isGoing
              ? withAlpha(theme.tint, 0.5)
              : shape.border
                ? theme.backgroundSelected
                : 'transparent',
        },
        // A hint of the accent behind events you're going to, to spot them at a glance.
        isGoing && {
          backgroundColor: mix(theme.backgroundElement, theme.tint, dark ? 0.14 : 0.08),
        },
      ]}>
      <View style={styles.top}>
        <ThemedText
          type="smallBold"
          themeColor={event.status === 'active' ? 'tint' : 'danger'}
          style={styles.time}>
          {event.status === 'active'
            ? format.eventTime(event.starts_at, event.ends_at)
            : `${t(`eventStatus.${event.status ?? 'active'}`)} · ${format.eventTime(event.starts_at, event.ends_at)}`}
        </ThemedText>
        {mine ? <MyAnswer answer={mine} /> : null}
      </View>
      {!event.published_at ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('eventStatus.draft')}
        </ThemedText>
      ) : null}
      <ThemedText type="heading">{event.title}</ThemedText>
      {place ? (
        <ThemedText type="small" themeColor="textSecondary">
          {place}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        {[
          t('common.byOrganizer', { name: event.organizer.display_name }),
          going > 0 ? t('rsvp.goingCount', { count: going }) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </ThemedText>
      <FriendsGoing attendance={event.attendance} />
    </ThemedView>
  );

  // Wide desktop browsers show the event beside the feed; elsewhere it opens as a page.
  if (panel) {
    return (
      <Pressable
        role="link"
        aria-current={selected}
        onPress={() => panel.open(event.id)}
        style={({ pressed }) => [fill && styles.fill, pressed && styles.pressed]}>
        {card}
      </Pressable>
    );
  }
  return (
    // On the web, Link hands its child its own style and drops the child's style function.
    <Link
      href={{ pathname: '/events/[id]', params: { id: event.id } }}
      asChild
      style={fill ? styles.fill : undefined}>
      <Pressable
        role="link"
        style={({ pressed }) => [fill && styles.fill, pressed && styles.pressed]}>
        {card}
      </Pressable>
    </Link>
  );
}

const ANSWER_ICONS: Record<
  'going' | 'interested' | 'waitlisted',
  { ios: SFSymbol; material: AndroidSymbol }
> = {
  going: { ios: 'checkmark.circle.fill', material: 'check_circle' },
  interested: { ios: 'star.fill', material: 'star' },
  waitlisted: { ios: 'hourglass', material: 'hourglass_top' },
};

/**
 * Your answer to the event, as a small label in its corner: filled with the accent if you're
 * going, pale amber if you're interested, pale grey on the waitlist (as on the calendar).
 */
function MyAnswer({ answer }: { answer: 'going' | 'interested' | 'waitlisted' }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const shape = useShape();
  const colors = useAnswerColors();
  const going = answer === 'going';
  const color = going ? theme.onTint : colors[answer];
  return (
    <View
      style={[
        styles.answer,
        shape.selector,
        { backgroundColor: going ? theme.tint : withAlpha(colors[answer], 0.16) },
      ]}>
      <SymbolView
        name={{
          ios: ANSWER_ICONS[answer].ios,
          android: ANSWER_ICONS[answer].material,
          web: ANSWER_ICONS[answer].material,
        }}
        size={14}
        tintColor={color}
      />
      <ThemedText type="smallBold" style={{ color }}>
        {t(`rsvp.${answer}`)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  time: {
    flex: 1,
  },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  fill: {
    flexGrow: 1,
  },
});
