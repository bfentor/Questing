import { Stack, useLocalSearchParams } from 'expo-router';

import { FollowButton } from '@/components/follow-button';
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
            <ProfileMenu profile={profile} />
          </>
        )}
      />
    </>
  );
}
