import { useUnreadCount } from '@questing/api';
import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/auth/auth-provider';

import { FontFamily } from '@/constants/fonts';
import { useTheme } from '@/hooks/use-theme';
import { mix } from '@/lib/color';

import { TABS } from './tabs';

/** Platform-native tab bar on iOS and Android. */
export default function AppTabs() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { status } = useAuth();
  const unread = useUnreadCount({ enabled: status === 'signed-in' });

  return (
    <NativeTabs
      backgroundColor={theme.backgroundElement}
      tintColor={theme.tint}
      // Android's pill behind the current tab: a pale wash of the accent.
      indicatorColor={mix(theme.backgroundElement, theme.tint, 0.16)}
      labelStyle={{
        default: { fontFamily: FontFamily.bodySemiBold },
        selected: { fontFamily: FontFamily.bodyBold, color: theme.tint },
      }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{t(`tabs.${tab.label}`)}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.icon.ios} md={tab.icon.material} />
          {tab.name === 'notifications' && unread > 0 ? (
            <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge>
          ) : null}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
