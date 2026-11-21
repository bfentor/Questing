import { profilesRetrieveOptions } from '@questing/api';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';

import { FollowButton } from '@/components/follow-button';
import { NotifyButton } from '@/components/notify-button';
import { PageTitle } from '@/components/page-title';
import { ProfileMenu } from '@/components/profile-menu';
import { ProfileView } from '@/components/profile-view';

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  // The same request ProfileView makes, so it's already cached.
  const { data: profile } = useQuery(profilesRetrieveOptions({ path: { handle } }));

  return (
    <>
      <Stack.Screen options={{ title: `@${handle}` }} />
      {/* The browser tab has room for the name too: "Aino Virtanen (@aino)". */}
      {profile ? <PageTitle title={`${profile.display_name} (@${profile.handle})`} /> : null}
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
