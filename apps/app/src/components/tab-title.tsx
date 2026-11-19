import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { DrawerButton } from './drawer-button';
import { ThemedText } from './themed-text';

/**
 * Below this window width, labelled buttons (e.g. New event and New post) don't fit beside a
 * tab's title, so they're round icon buttons.
 */
export const LABELLED_ACTIONS_MIN_WIDTH = 480;

/** A tab's title, with the drawer button before it and the tab's own buttons after. */
export function TabTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.row}>
      <DrawerButton />
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
