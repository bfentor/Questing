import type { Event } from '@questing/api';
import { Link } from 'expo-router';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FontFamily } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useAnswerColors } from '@/hooks/use-answer-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_COLORS } from '@/lib/category-colors';
import { mix, withAlpha } from '@/lib/color';
import { useFormat } from '@/lib/format';

import { ControlFlag } from './course-marks';
import { useEventPanel } from './event-panel';
import { FriendsGoing } from './friends-going';
import { PressableScale } from './pressable-scale';
import { RemoteImage } from './remote-image';
import { ThemedText } from './themed-text';

type EventCardProps = {
  event: Event;
  /** Shown in the nearby feed. */
  distanceM?: number;
  /**
   * Stretch to the height of its container, e.g. to match the card beside it in a grid. The
   * picture goes on top then, as the card is narrow.
   */
  fill?: boolean;
};

/** Tile beside the text in a list; banner above it in a grid. */
const TILE = 88;
const BANNER = 112;

/**
 * An event in a list: its cover picture (or its date, in its category's colour), then when,
 * what, where and who. One you're going to carries a checkpoint flag, like a sticker.
 */
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

  const card = (
    <View
      style={[
        styles.card,
        fill ? styles.column : styles.row,
        fill && styles.fill,
        shape.box,
        {
          backgroundColor: theme.backgroundElement,
          // The event open beside the feed is outlined in the accent.
          borderColor: selected ? theme.tint : 'transparent',
        },
      ]}>
      <View>
        <Tile event={event} banner={fill} />
        {mine === 'going' ? <ControlFlag size={28} style={styles.flag} /> : null}
      </View>
      <View style={[styles.body, fill && styles.bodyBelow]}>
        <ThemedText type="smallBold" themeColor={event.status === 'active' ? 'tint' : 'danger'}>
          {event.status === 'active'
            ? format.eventTime(event.starts_at, event.ends_at)
            : `${t(`eventStatus.${event.status ?? 'active'}`)} · ${format.eventTime(event.starts_at, event.ends_at)}`}
        </ThemedText>
        {!event.published_at ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('eventStatus.draft')}
          </ThemedText>
        ) : null}
        <ThemedText type="heading" style={styles.title} numberOfLines={3}>
          {event.title}
        </ThemedText>
        {place ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {place}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {[
            t('common.byOrganizer', { name: event.organizer.display_name }),
            going > 0 ? t('rsvp.goingCount', { count: going }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
        <FriendsGoing attendance={event.attendance} />
        {mine ? <MyAnswer answer={mine} /> : null}
      </View>
    </View>
  );

  // Wide desktop browsers show the event beside the feed; elsewhere it opens as a page.
  if (panel) {
    return (
      <PressableScale
        role="link"
        aria-current={selected}
        squish="card"
        feedback="tap"
        onPress={() => panel.open(event.id)}
        style={fill && styles.fill}>
        {card}
      </PressableScale>
    );
  }
  return (
    // On the web, Link hands its child its own style and drops the child's style function.
    <Link
      href={{ pathname: '/events/[id]', params: { id: event.id } }}
      asChild
      style={fill ? styles.fill : undefined}>
      <PressableScale role="link" squish="card" feedback="tap" style={fill && styles.fill}>
        {card}
      </PressableScale>
    </Link>
  );
}

/**
 * The cover picture, or without one the date ("Sat / 21 / Nov") on a patch of the event's
 * first category's colour, the way a map tints its areas.
 */
function Tile({ event, banner }: { event: Event; banner?: boolean }) {
  const theme = useTheme();
  const shape = useShape();
  const dark = useColorScheme() === 'dark';
  const { i18n } = useTranslation();
  const size = banner ? { height: BANNER, width: '100%' as const } : { width: TILE, height: TILE };
  const radius = { borderRadius: Math.max(0, shape.boxRadius - Spacing.two) };

  if (event.cover) {
    return (
      <RemoteImage image={event.cover} contentFit="cover" style={[size, radius, styles.cover]} />
    );
  }
  const colors = CATEGORY_COLORS[event.categories?.[0] ?? ''];
  const ink = colors ? (dark ? colors.dark : colors.light) : theme.tint;
  const start = new Date(event.starts_at);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(i18n.language, options).format(start).replace('.', '');
  return (
    <View
      style={[
        styles.dateTile,
        size,
        radius,
        { backgroundColor: mix(theme.backgroundElement, ink, dark ? 0.22 : 0.13) },
      ]}>
      <ThemedText type="smallBold" style={[styles.dateSmall, { color: ink }]}>
        {part({ weekday: 'short' })}
      </ThemedText>
      <ThemedText style={[styles.dateDay, { color: ink }]}>{part({ day: 'numeric' })}</ThemedText>
      <ThemedText type="smallBold" style={[styles.dateSmall, { color: ink }]}>
        {part({ month: 'short' })}
      </ThemedText>
    </View>
  );
}

const ANSWER_ICONS: Record<
  'going' | 'interested' | 'waitlisted',
  { ios: SFSymbol; material: AndroidSymbol }
> = {
  going: { ios: 'checkmark.circle.fill', material: 'check_circle' },
  interested: { ios: 'star', material: 'star' },
  waitlisted: { ios: 'hourglass', material: 'hourglass_top' },
};

/**
 * Your answer to the event, as a small label under it: filled with the flag's orange if you're
 * going, ringed in the accent if you're interested, grey on the waitlist (as on the calendar).
 */
function MyAnswer({ answer }: { answer: 'going' | 'interested' | 'waitlisted' }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const shape = useShape();
  const colors = useAnswerColors();
  const color =
    answer === 'going' ? theme.onFlag : answer === 'interested' ? theme.tint : theme.textSecondary;
  return (
    <View
      style={[
        styles.answer,
        shape.selector,
        answer === 'going'
          ? { backgroundColor: colors.going, borderColor: colors.going }
          : answer === 'interested'
            ? {
                borderColor: colors.interested,
                backgroundColor: withAlpha(colors.interested, 0.08),
              }
            : { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected },
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
  card: {
    padding: Spacing.two + 2,
    gap: Spacing.three,
    borderWidth: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    flexDirection: 'column',
    gap: Spacing.two,
  },
  body: {
    flex: 1,
    gap: 2,
    paddingVertical: Spacing.half,
    paddingRight: Spacing.one,
  },
  bodyBelow: {
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.one,
  },
  title: {
    fontSize: 19,
    lineHeight: 23,
    marginVertical: 2,
  },
  cover: {
    aspectRatio: undefined,
  },
  dateTile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSmall: {
    fontSize: 13,
    lineHeight: 16,
  },
  dateDay: {
    fontFamily: FontFamily.displayBlack,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  // A sticker on the picture's corner, a little askew.
  flag: {
    position: 'absolute',
    top: -6,
    left: -6,
    transform: [{ rotate: '-10deg' }],
  },
  answer: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderWidth: 1.5,
  },
  fill: {
    flexGrow: 1,
  },
});
