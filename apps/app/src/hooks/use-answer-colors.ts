import { useTheme } from '@/hooks/use-theme';

export type Answer = 'going' | 'interested' | 'waitlisted';

/**
 * One colour per RSVP, the same on event cards and the calendar: the checkpoint flag's orange
 * for going (filled, with `onFlag` text on it), the accent for interested, grey for the
 * waitlist.
 */
export function useAnswerColors(): Record<Answer, string> {
  const theme = useTheme();
  return {
    going: theme.flag,
    interested: theme.tint,
    waitlisted: theme.textSecondary,
  };
}
