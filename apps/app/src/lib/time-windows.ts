/** Quick time filters for the feeds, in the device's local time. */
export type TimeWindow = 'any' | 'today' | 'tomorrow' | 'week';

function at(day: Date, hours: number) {
  const date = new Date(day);
  date.setHours(hours, 0, 0, 0);
  return date;
}

function addDays(day: Date, days: number) {
  const date = new Date(day);
  date.setDate(date.getDate() + days);
  return date;
}

/** [start, end] of a window starting from `now`, or null for any time. */
export function timeWindow(window: TimeWindow, now: Date): [Date, Date] | null {
  switch (window) {
    case 'any':
      return null;
    case 'today':
      return [now, at(addDays(now, 1), 0)];
    case 'tomorrow':
      return [at(addDays(now, 1), 0), at(addDays(now, 2), 0)];
    case 'week': {
      // The rest of the week, which (as in Finland) ends on Sunday: until Monday 00:00.
      const daysToMonday = (8 - now.getDay()) % 7 || 7; // getDay(): 0 = Sunday, 1 = Monday
      return [now, at(addDays(now, daysToMonday), 0)];
    }
  }
}
