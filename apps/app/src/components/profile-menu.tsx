import type { Profile } from '@questing/api';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActingProfiles } from '@/hooks/use-acting-profiles';
import { WEB_URL } from '@/lib/config';
import { shareLink } from '@/lib/share';

import type { MenuAction } from './action-menu';
import { ContentMenu } from './content-menu';
import { ThemedText } from './themed-text';

/**
 * The "…" beside a profile's main button. Your own profile: share it, your events and your
 * organizations. One you manage: share, its dashboard and (for admins) managing it. Anyone
 * else's: share, report, mute and block.
 */
export function ProfileMenu({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const acting = useActingProfiles().find((candidate) => candidate.handle === profile.handle);
  const [copied, setCopied] = useState(false);
  const { handle } = profile;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const share: MenuAction = {
    label: t('profile.share'),
    onPress: async () => {
      const url = `${WEB_URL}/profiles/${handle}`;
      if ((await shareLink(profile.display_name, url)) === 'copied') setCopied(true);
    },
  };

  const ownActions: MenuAction[] =
    acting?.role === 'self'
      ? [
          share,
          { label: t('myEvents.title'), onPress: () => router.push('/my-events') },
          { label: t('organizations.title'), onPress: () => router.push('/organizations') },
        ]
      : [
          share,
          {
            label: t('dashboard.title'),
            onPress: () =>
              router.push({ pathname: '/profiles/[handle]/dashboard', params: { handle } }),
          },
          ...(acting?.role === 'admin'
            ? [
                {
                  label: t('organizations.manage'),
                  onPress: () =>
                    router.push({ pathname: '/organizations/[handle]/manage', params: { handle } }),
                },
              ]
            : []),
        ];

  return (
    <>
      {copied ? (
        <ThemedText type="small" themeColor="textSecondary" role="status">
          {t('eventActions.linkCopied')}
        </ThemedText>
      ) : null}
      <ContentMenu
        appearance="round"
        target={{ type: 'profile', id: handle }}
        owner={{ handle }}
        ownActions={ownActions}
        extraActions={[share]}
      />
    </>
  );
}
