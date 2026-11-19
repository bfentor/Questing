import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from './button';
import { RoundIconButton } from './icon-button';

const PENCIL = { ios: 'square.and.pencil', material: 'edit_square' } as const;

/**
 * A filled "New post" button with a pencil, opening the full composer. `compact` makes it a
 * round pencil button, for where there's no room for the label.
 */
export function NewPostButton({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const open = () => router.push('/posts/new');
  return compact ? (
    <RoundIconButton icon={PENCIL} label={t('posts.new')} primary onPress={open} />
  ) : (
    <Button title={t('posts.new')} size="small" icon={PENCIL} onPress={open} />
  );
}
