import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

import { ConfirmDialog } from './confirm-dialog';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export type MenuAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  /** Ask before running the action. */
  confirm?: { title: string; message?: string; confirmLabel: string };
};

/** Where the button that opened a menu is on screen (from measureInWindow). */
export type MenuAnchor = { x: number; y: number; width: number; height: number };

type ActionMenuProps = {
  visible: boolean;
  onClose: () => void;
  actions: MenuAction[];
  title?: string;
  /** Drop the menu down from this button; without one it's a small dialog in the middle. */
  anchor?: MenuAnchor | null;
};

const DROPDOWN_WIDTH = 240;
const ITEM_HEIGHT = 48;
const GAP = 4;
// Kept free at the bottom, so a menu doesn't cover the tab bar; lower down it opens upwards.
const BOTTOM_CLEARANCE = 72;

/**
 * A list of actions, dropped down from the button that opened it (`anchor`). Without one
 * (its button couldn't be measured) it's a small dialog in the middle of the screen. Nothing
 * slides up from the bottom: on a desktop that's far from the button, and on phones it covers
 * the tab bar.
 */
export function ActionMenu({ visible, onClose, actions, title, anchor }: ActionMenuProps) {
  const reducedMotion = useReducedMotion();
  const theme = useTheme();
  const [confirming, setConfirming] = useState<MenuAction | null>(null);

  const items = actions.map((action) => (
    <Pressable
      key={action.label}
      role="menuitem"
      onPress={() => {
        onClose();
        if (action.confirm) {
          setConfirming(action);
        } else {
          action.onPress();
        }
      }}
      style={({ pressed, hovered }) => [
        styles.item,
        anchor && styles.dropdownItem,
        (pressed || hovered) && { backgroundColor: theme.backgroundSelected },
      ]}>
      <ThemedText style={action.destructive && { color: theme.danger }}>{action.label}</ThemedText>
    </Pressable>
  ));

  return (
    <>
      <Modal
        visible={visible}
        transparent
        // Coordinates from measureInWindow include the status bar on Android.
        statusBarTranslucent
        animationType={reducedMotion ? 'none' : 'fade'}
        onRequestClose={onClose}>
        {anchor ? (
          <Dropdown anchor={anchor} count={actions.length} title={title} onClose={onClose}>
            {items}
          </Dropdown>
        ) : (
          <Centered title={title} onClose={onClose}>
            {items}
          </Centered>
        )}
      </Modal>
      {confirming?.confirm ? (
        <ConfirmDialog
          visible
          title={confirming.confirm.title}
          message={confirming.confirm.message}
          confirmLabel={confirming.confirm.confirmLabel}
          destructive={confirming.destructive}
          onConfirm={confirming.onPress}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
    </>
  );
}

type PanelProps = { title?: string; onClose: () => void; children: ReactNode };

function Centered({ title, onClose, children }: PanelProps) {
  const theme = useTheme();
  const shape = useShape();
  const { t } = useTranslation();

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel={t('common.cancel')}
      />
      <ThemedView
        type="backgroundElement"
        role="menu"
        style={[styles.centered, shape.dialog, { borderColor: theme.backgroundSelected }]}>
        {title ? (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
            {title}
          </ThemedText>
        ) : null}
        {children}
        <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />
        <Pressable
          role="button"
          onPress={onClose}
          style={({ pressed, hovered }) => [
            styles.item,
            (pressed || hovered) && { backgroundColor: theme.backgroundSelected },
          ]}>
          <ThemedText themeColor="textSecondary">{t('common.cancel')}</ThemedText>
        </Pressable>
      </ThemedView>
    </View>
  );
}

/**
 * Under the button, its right edge lined up with the button's ("…" buttons sit at the right),
 * kept on screen; above the button when there's no room below. Tapping outside closes it.
 */
function Dropdown({
  anchor,
  count,
  title,
  onClose,
  children,
}: PanelProps & { anchor: MenuAnchor; count: number }) {
  const theme = useTheme();
  const shape = useShape();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const screen = useWindowDimensions();

  // As wide as a wide button (e.g. Add to calendar); a fixed width under a small one ("…").
  const width = Math.min(Math.max(DROPDOWN_WIDTH, anchor.width), screen.width - 2 * Spacing.three);
  const height = count * ITEM_HEIGHT + (title ? ITEM_HEIGHT : 0) + 2 * Spacing.one;
  const left = Math.min(
    Math.max(Spacing.three, anchor.x + anchor.width - width),
    screen.width - Spacing.three - width,
  );
  const below = anchor.y + anchor.height + GAP;
  const fitsBelow = below + height <= screen.height - insets.bottom - BOTTOM_CLEARANCE;
  const vertical = fitsBelow ? { top: below } : { bottom: screen.height - anchor.y + GAP };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel={t('common.cancel')}
      />
      <ThemedView
        type="backgroundElement"
        role="menu"
        style={[
          styles.dropdown,
          {
            left,
            width,
            borderColor: theme.backgroundSelected,
            borderRadius: Math.min(shape.boxRadius, 16),
          },
          vertical,
        ]}>
        {title ? (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.dropdownTitle}>
            {title}
          </ThemedText>
        ) : null}
        {children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  centered: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: Spacing.two,
    overflow: 'hidden',
  },
  title: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  item: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  separator: {
    height: 1,
    marginVertical: Spacing.one,
  },
  dropdown: {
    position: 'absolute',
    paddingVertical: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    // A floating menu has a shadow whatever the theme's depth.
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.18)',
  },
  dropdownTitle: {
    minHeight: ITEM_HEIGHT,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  dropdownItem: {
    minHeight: ITEM_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 0,
  },
});
