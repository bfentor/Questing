import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from './button';
import { RoundIconButton } from './icon-button';

const CALENDAR_PLUS = { ios: 'calendar.badge.plus', material: 'calendar_add_on' } as const;

/**
 * An outlined "New event" button with a calendar, opening the event form. It sits beside the
 * filled New post button and is meant to look different from it. `compact` makes it a round
 * calendar button, for where there's no room for the label.
 */
export function NewEventButton({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const open = () => router.push('/events/new');
  return compact ? (
    <RoundIconButton icon={CALENDAR_PLUS} label={t('eventForm.newEvent')} outline onPress={open} />
  ) : (
    <Button
      title={t('eventForm.newEvent')}
      variant="outline"
      size="small"
      icon={CALENDAR_PLUS}
      onPress={open}
    />
  );
}
