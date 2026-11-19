import { Stack, useLocalSearchParams } from 'expo-router';

import { FollowButton } from '@/components/follow-button';
import { NotifyButton } from '@/components/notify-button';
import { ProfileMenu } from '@/components/profile-menu';
import { ProfileView } from '@/components/profile-view';

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();

  return (
    <>
      <Stack.Screen options={{ title: `@${handle}` }} />
      <ProfileView
        handle={handle}
        hasHeader
        actions={(profile) => (
          <>
            <FollowButton profile={profile} size="small" />
            <NotifyButton profile={profile} />
            <ProfileMenu profile={profile} />
          </>
        )}
      />
    </>
  );
}
