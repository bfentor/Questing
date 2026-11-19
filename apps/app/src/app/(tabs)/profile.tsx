import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, useWindowDimensions } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { NewPostButton } from '@/components/new-post-button';
import { ProfileMenu } from '@/components/profile-menu';
import { ProfileView } from '@/components/profile-view';
import { Screen } from '@/components/screen';
import { TabTitle } from '@/components/tab-title';
import { ThemedText } from '@/components/themed-text';
import { useMe } from '@/hooks/use-me';

// Below this window width, "New post", "Edit profile" and "…" don't all fit beside the
// profile picture with their labels, so New post is just a pencil.
const LABELLED_NEW_POST_MIN_WIDTH = 440;

export default function ProfileTab() {
  const { status } = useAuth();
  const { t } = useTranslation();
  const me = useMe();
  const { width } = useWindowDimensions();

  if (me) {
    return (
      <ProfileView
        handle={me.handle}
        top={<TabTitle title={t('tabs.profile')} />}
        actions={(profile) => (
          <>
            <NewPostButton compact={width < LABELLED_NEW_POST_MIN_WIDTH} />
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
