import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { ProfileMenu } from '@/components/profile-menu';
import { ProfileView } from '@/components/profile-view';
import { Screen } from '@/components/screen';
import { TabTitle } from '@/components/tab-title';
import { ThemedText } from '@/components/themed-text';
import { useMe } from '@/hooks/use-me';

export default function ProfileTab() {
  const { status } = useAuth();
  const { t } = useTranslation();
  const me = useMe();

  if (me) {
    return (
      <ProfileView
        handle={me.handle}
        top={<TabTitle title={t('tabs.profile')} />}
        actions={(profile) => (
          <>
            <Button
              title={t('profile.edit')}
              variant="secondary"
              size="small"
              onPress={() => router.push('/edit-profile')}
            />
            <ProfileMenu profile={profile} />
          </>
        )}
      />
    );
  }

  return (
    <Screen>
      <TabTitle title={t('tabs.profile')} />
      {status === 'signed-out' ? (
        <>
          <ThemedText themeColor="textSecondary">{t('profile.signInPrompt')}</ThemedText>
          <Button title={t('common.signIn')} onPress={() => router.push('/sign-in')} />
        </>
      ) : (
        <ActivityIndicator />
      )}
    </Screen>
  );
}
