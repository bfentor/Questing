import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export type Answer = 'going' | 'interested' | 'waitlisted';

/**
 * One colour per RSVP, the same on event cards and the calendar: the accent for going,
 * amber for interested, grey for the waitlist. Amber is darker on light backgrounds, so
 * small text in it stays readable.
 */
export function useAnswerColors(): Record<Answer, string> {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  return {
    going: theme.tint,
    interested: dark ? '#fbbf24' : '#b45309',
    waitlisted: theme.textSecondary,
  };
}
