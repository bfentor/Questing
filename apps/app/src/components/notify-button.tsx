import {
  profilesNotificationsUpdate,
  profilesRetrieveQueryKey,
  type NotifyEnum,
  type Profile,
} from '@questing/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ActionMenu, type MenuAction, type MenuAnchor } from './action-menu';
import { RoundIconButton } from './icon-button';

const ICONS = {
  all: { ios: 'bell.fill', material: 'notifications_active' },
  events: { ios: 'bell', material: 'notifications' },
  none: { ios: 'bell.slash', material: 'notifications_off' },
} as const;

const LABELS = {
  all: 'profile.notifyAll',
  events: 'profile.notifyEvents',
  none: 'profile.notifyNone',
} as const;

/**
 * A bell beside Following: what you hear about from this profile. New events and posts, new
 * events only (the default) or nothing. Only for profiles you follow.
 */
export function NotifyButton({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = profilesRetrieveQueryKey({ path: { handle: profile.handle } });
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const trigger = useRef<ComponentRef<typeof View>>(null);
  const current: NotifyEnum = profile.notify ?? 'events';

  const show = (notify: NotifyEnum) =>
    queryClient.setQueryData<Profile>(queryKey, (old) => old && { ...old, notify });

  const choose = useMutation({
    mutationFn: async (notify: NotifyEnum) =>
      profilesNotificationsUpdate({
        path: { handle: profile.handle },
        body: { notify },
        throwOnError: true,
      }),
    onMutate: (notify) => {
      show(notify);
      return { previous: current };
    },
    onError: (_error, _notify, context) => context && show(context.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (!profile.is_followed || profile.is_blocked) {
    return null;
  }

  const title = t('profile.notifyMenu', { name: profile.display_name });
  const actions: MenuAction[] = (['all', 'events', 'none'] as const).map((notify) => ({
    label: `${notify === current ? '✓ ' : ''}${t(LABELS[notify])}`,
    onPress: () => notify !== current && choose.mutate(notify),
  }));

  // The menu drops down from the button, so it needs to know where the button is.
  const openMenu = () => {
    if (!trigger.current) return setOpen(true);
    trigger.current.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  return (
    <>
      <View ref={trigger} collapsable={false}>
        <RoundIconButton
          icon={ICONS[current]}
          label={`${title}: ${t(LABELS[current])}`}
          onPress={openMenu}
        />
      </View>
      <ActionMenu
        visible={open}
        onClose={() => setOpen(false)}
        actions={actions}
        title={title}
        anchor={anchor}
      />
    </>
  );
}
