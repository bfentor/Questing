import { useTranslation } from 'react-i18next';

import classes from './drawer-button.module.css';
import { useDrawer } from './drawer';
import { IconButton } from './icon-button';

/**
 * Opens the drawer, on screens narrow enough for the bottom tab bar. Hidden by CSS rather than
 * by measuring, so the server-rendered page already matches (see navigation/app-tabs.module.css).
 */
export function DrawerButton() {
  const drawer = useDrawer();
  const { t } = useTranslation();

  if (!drawer) return null;
  return (
    <div className={classes.phoneOnly}>
      <IconButton
        icon={{ ios: 'line.3.horizontal', material: 'menu' }}
        label={t('drawer.open')}
        size={28}
        onPress={drawer.open}
      />
    </div>
  );
}
