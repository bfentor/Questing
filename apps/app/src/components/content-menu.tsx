import {
  profilesBlockCreateMutation,
  profilesMuteCreateMutation,
  type TargetTypeEnum,
} from '@sidequest/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { useActingProfiles } from '@/hooks/use-acting-profiles';

import { ActionMenu, type MenuAction, type MenuAnchor } from './action-menu';
import { IconButton, RoundIconButton } from './icon-button';

export type ReportTarget = { type: TargetTypeEnum; id: string };

type ContentMenuProps = {
  /** What "Report" reports. */
  target: ReportTarget;
  /** Whose content it is: they can be muted or blocked. */
  owner: { handle: string };
  /** Shown instead when the content is the signed-in user's own (e.g. delete). */
  ownActions?: MenuAction[];
  /** Shown first when it isn't, e.g. deleting someone's comment on your post. */
  extraActions?: MenuAction[];
  /** `round` is a filled circle, to sit beside pill buttons such as Follow. */
  appearance?: 'plain' | 'round';
};

/** The "…" menu on posts, events and profiles: report, mute and block, or the owner's actions. */
export function ContentMenu({
  target,
  owner,
  ownActions = [],
  extraActions = [],
  appearance = 'plain',
}: ContentMenuProps) {
  const { t } = useTranslation();
  const { status } = useAuth();
  // Your own content, or an organization's you belong to.
  const mine = useActingProfiles().some((profile) => profile.handle === owner.handle);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const trigger = useRef<ComponentRef<typeof View>>(null);

  // Blocked or muted content disappears from every list, so refetch them all.
  const onSuccess = () => queryClient.invalidateQueries();
  const block = useMutation({ ...profilesBlockCreateMutation(), onSuccess });
  const mute = useMutation({ ...profilesMuteCreateMutation(), onSuccess });

  const whenSignedIn = (action: () => void) => () =>
    status === 'signed-in' ? action() : router.push('/sign-in');
  const path = { handle: owner.handle };

  const actions: MenuAction[] = mine
    ? ownActions
    : [
        ...extraActions,
        {
          label: t('moderation.report'),
          onPress: whenSignedIn(() => router.push({ pathname: '/report', params: target })),
        },
        {
          label: t('moderation.mute', { handle: owner.handle }),
          onPress: whenSignedIn(() => mute.mutate({ path })),
        },
        {
          label: t('moderation.block', { handle: owner.handle }),
          destructive: true,
          onPress: whenSignedIn(() => block.mutate({ path })),
          confirm:
            status === 'signed-in'
              ? {
                  title: t('moderation.blockConfirmTitle', { handle: owner.handle }),
                  message: t('moderation.blockConfirmMessage'),
                  confirmLabel: t('moderation.blockAction'),
                }
              : undefined,
        },
      ];

  if (actions.length === 0) {
    return null;
  }

  // The menu drops down from the button, so it needs to know where the button is.
  const show = () => {
    if (!trigger.current) return setOpen(true);
    trigger.current.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  return (
    <>
      <View ref={trigger} collapsable={false}>
        {appearance === 'round' ? (
          <RoundIconButton
            icon={{ ios: 'ellipsis', material: 'more_horiz' }}
            label={t('common.moreActions')}
            onPress={show}
          />
        ) : (
          <IconButton
            icon={{ ios: 'ellipsis', material: 'more_horiz' }}
            label={t('common.moreActions')}
            onPress={show}
          />
        )}
      </View>
      <ActionMenu visible={open} onClose={() => setOpen(false)} actions={actions} anchor={anchor} />
    </>
  );
}
