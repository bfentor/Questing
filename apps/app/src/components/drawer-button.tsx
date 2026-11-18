import { useTranslation } from 'react-i18next';

import { useDrawer } from './drawer';
import { IconButton } from './icon-button';

/** Opens the drawer. Phones only: wide web screens show its links in the sidebar instead. */
export function DrawerButton() {
  const drawer = useDrawer();
  const { t } = useTranslation();

  if (!drawer) return null;
  return (
    <IconButton
      icon={{ ios: 'line.3.horizontal', material: 'menu' }}
      label={t('drawer.open')}
      size={28}
      onPress={drawer.open}
    />
  );
}
