import { useUnreadCount } from '@questing/api';
import { router, usePathname, type Href } from 'expo-router';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { Spacing } from '@/constants/theme';
import { useMe } from '@/hooks/use-me';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { TABS } from '@/navigation/tabs';

import { PressableScale } from './pressable-scale';
import { Avatar } from './avatar';
import { Button } from './button';
import { Logo } from './logo';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const WIDTH = 300;

const DrawerContext = createContext<{ open: () => void } | null>(null);

/** Opens the drawer, from a DrawerButton. */
export function useDrawer() {
  return useContext(DrawerContext);
}

/** Holds the drawer for the tab screens; their DrawerButtons open it. */
export function DrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const value = useMemo(() => ({ open: () => setVisible(true) }), []);

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <Drawer visible={visible} onClose={() => setVisible(false)} />
    </DrawerContext.Provider>
  );
}

type Item = {
  label: string;
  href: Href;
  icon: { ios: SFSymbol; material: AndroidSymbol };
  badge?: number;
};

/**
 * A panel from the left with who you are, every tab, and the places that don't have a tab of
 * their own (your events, organizations, settings). Phones use it; wide web screens have the
 * same links in the sidebar.
 */
function Drawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  const { status } = useAuth();
  const signedIn = status === 'signed-in';
  const me = useMe();
  const unread = useUnreadCount({ enabled: signedIn });
  const [offset] = useState(() => new Animated.Value(-WIDTH));

  useEffect(() => {
    if (!visible) return;
    offset.setValue(reducedMotion ? 0 : -WIDTH);
    Animated.timing(offset, {
      toValue: 0,
      duration: reducedMotion ? 0 : 200,
      useNativeDriver: true,
    }).start();
  }, [visible, offset, reducedMotion]);

  const go = (href: Href) => {
    onClose();
    router.navigate(href);
  };

  const sections: Item[][] = [
    TABS.map((tab) => ({
      label: t(`tabs.${tab.label}`),
      href: tab.href,
      icon: tab.icon,
      badge: tab.name === 'notifications' ? unread : 0,
    })),
    [
      ...(signedIn
        ? [
            {
              label: t('myEvents.title'),
              href: '/my-events' as const,
              icon: { ios: 'calendar.badge.checkmark', material: 'event_available' },
            },
            {
              label: t('organizations.title'),
              href: '/organizations' as const,
              icon: { ios: 'building.2', material: 'groups' },
            },
          ]
        : []),
      {
        label: t('common.settings'),
        href: '/settings',
        icon: { ios: 'gearshape', material: 'settings' },
      },
    ] as Item[],
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={t('drawer.close')}
        />
        <Animated.View
          style={[styles.panel, { transform: [{ translateX: offset }] }]}
          role="navigation"
          aria-label={t('drawer.title')}>
          <ThemedView
            style={[
              styles.panelInner,
              { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom },
            ]}>
            <ScrollView contentContainerStyle={styles.content}>
              {me ? (
                <PressableScale
                  squish="card"
                  role="link"
                  onPress={() => go('/profile')}
                  style={[styles.me]}>
                  <Avatar name={me.display_name} image={me.avatar} size={52} />
                  <View>
                    <ThemedText type="heading">{me.display_name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      @{me.handle}
                    </ThemedText>
                  </View>
                </PressableScale>
              ) : (
                <View style={[styles.me, styles.brand]}>
                  <Logo size={32} />
                  <ThemedText type="subtitle" themeColor="tint">
                    Questing
                  </ThemedText>
                </View>
              )}
              {status === 'signed-out' ? (
                <Button title={t('common.signIn')} onPress={() => go('/sign-in')} />
              ) : null}
              {sections.map((items, index) => (
                <View key={index} style={styles.section}>
                  {index > 0 ? (
                    <View
                      style={[styles.separator, { backgroundColor: theme.backgroundSelected }]}
                    />
                  ) : null}
                  {items.map((item) => {
                    const current = pathname === item.href;
                    const color = current ? theme.tint : theme.text;
                    return (
                      <Pressable
                        key={item.label}
                        role="link"
                        aria-current={current ? 'page' : undefined}
                        onPress={() => go(item.href)}
                        style={({ pressed }) => [
                          styles.item,
                          (pressed || current) && { backgroundColor: theme.backgroundElement },
                        ]}>
                        <SymbolView
                          name={{
                            ios: item.icon.ios,
                            android: item.icon.material,
                            web: item.icon.material,
                          }}
                          size={24}
                          tintColor={color}
                        />
                        <ThemedText type="smallBold" style={[styles.label, { color }]}>
                          {item.label}
                        </ThemedText>
                        {item.badge ? (
                          <View style={[styles.badge, { backgroundColor: theme.tint }]}>
                            <ThemedText type="small" themeColor="onTint">
                              {item.badge > 99 ? '99+' : item.badge}
                            </ThemedText>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </ThemedView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  panel: {
    width: WIDTH,
    maxWidth: '85%',
    height: '100%',
  },
  panelInner: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  me: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  section: {
    gap: Spacing.half,
  },
  separator: {
    height: 1,
    marginBottom: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 48,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  label: {
    flex: 1,
    fontSize: 16,
  },
  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderRadius: 11,
  },
});
