import { eventsRetrieveOptions, useUnreadCount } from '@questing/api';
import { useQuery } from '@tanstack/react-query';
import { Link, usePathname, type Href } from 'expo-router';
import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import {
  useCallback,
  useMemo,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { BesideSidebar } from '@/components/column';
import { EventDetails, EventMenu } from '@/components/event-details';
import { EventPanelProvider } from '@/components/event-panel';
import { IconButton } from '@/components/icon-button';
import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import classes from './app-tabs.module.css';
import { KeyboardShortcuts } from './keyboard-shortcuts';
import { TABS } from './tabs';

// From this width, events open in a panel beside the feed instead of on their own page.
const PANEL_MIN_WIDTH = 1200;
// Pages shown without the navigation around them.
const BARE_PAGES = ['/embed/', '/onboarding'];

/** Whether `href` is the page shown, or one under it: Home only for itself. */
function isCurrent(pathname: string, href: Href) {
  const path = String(href);
  return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Responsive navigation around every page of the website: a sidebar on desktop and a bottom
 * bar on phones, so it's there on profiles, events and posts too, not only on the tabs. The
 * switch happens in CSS (see app-tabs.module.css), so server and client render identical
 * markup. Wide screens also get a side panel for event details, and every page keyboard
 * shortcuts. Embeds (shown inside other sites) and onboarding (left through its own buttons)
 * get the page alone.
 */
export function WebShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { status } = useAuth();
  const unread = useUnreadCount({ enabled: status === 'signed-in' });
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const [selected, setSelected] = useState<number | null>(null);
  const close = useCallback(() => setSelected(null), []);
  const wide = width >= PANEL_MIN_WIDTH;
  const panel = useMemo(() => ({ selected, open: setSelected, close }), [selected, close]);
  const panelOpen = wide && selected !== null;
  // The shell keeps clear of the notch (sides) and the home indicator (the bottom bar pads by
  // it), so the pages inside only need to mind the top; otherwise they'd pad twice.
  const insets = useSafeAreaInsets();
  const insetsInside = useMemo(
    () => ({ top: insets.top, bottom: 0, left: 0, right: 0 }),
    [insets.top],
  );

  // Another page, another context: the panel closes.
  const [panelPath, setPanelPath] = useState(pathname);
  if (panelPath !== pathname) {
    setPanelPath(pathname);
    setSelected(null);
  }

  if (BARE_PAGES.some((prefix) => pathname.startsWith(prefix))) {
    return children;
  }

  return (
    <EventPanelProvider value={wide ? panel : null}>
      <KeyboardShortcuts onEscape={close} />
      <div
        className={panelOpen ? `${classes.shell} ${classes.withPanel}` : classes.shell}
        // Around the pages' own backgrounds, e.g. behind the sidebar; the CSS colours the
        // bottom bar and the lines between areas from these.
        style={
          {
            backgroundColor: theme.background,
            '--nav-background': theme.backgroundElement,
            '--nav-line': theme.backgroundSelected,
            '--nav-accent': theme.tint,
            '--nav-on-accent': theme.onTint,
          } as CSSProperties
        }>
        <NavBar>
          {TABS.map((tab) => (
            <Link key={tab.name} href={tab.href} asChild>
              <TabButton
                icon={tab.icon.material}
                isFocused={isCurrent(pathname, tab.href)}
                badge={tab.name === 'notifications' ? unread : 0}>
                {t(`tabs.${tab.label}`)}
              </TabButton>
            </Link>
          ))}
        </NavBar>
        <div className={classes.content}>
          <SafeAreaInsetsContext.Provider value={insetsInside}>
            <BesideSidebar value>{children}</BesideSidebar>
          </SafeAreaInsetsContext.Provider>
        </div>
        {panelOpen && selected !== null ? (
          <div className={classes.panelArea}>
            <aside className={classes.panel} aria-label={t('event.title')}>
              <View style={styles.panelBar}>
                <Link href={{ pathname: '/events/[id]', params: { id: selected } }}>
                  <ThemedText type="small" themeColor="tint">
                    {t('event.openPage')}
                  </ThemedText>
                </Link>
                <View style={styles.panelActions}>
                  <PanelMenu id={selected} onDeleted={close} />
                  <IconButton
                    icon={{ ios: 'xmark', material: 'close' }}
                    label={t('event.closePanel')}
                    onPress={close}
                  />
                </View>
              </View>
              <ScrollView contentContainerStyle={styles.panelContent}>
                <EventDetails key={selected} id={selected} />
              </ScrollView>
            </aside>
          </div>
        ) : null}
      </div>
    </EventPanelProvider>
  );
}

/** The event's menu, once it has loaded (it's already cached by the details). */
function PanelMenu({ id, onDeleted }: { id: number; onDeleted: () => void }) {
  const { data: event } = useQuery(eventsRetrieveOptions({ path: { id } }));
  return event ? <EventMenu event={event} onDeleted={onDeleted} /> : null;
}

/** In the gutter left of the column on wide screens, against its edge (see the CSS). */
function NavBar({ children }: { children: ReactNode }) {
  return (
    <div className={classes.navArea}>
      <nav className={classes.nav}>
        <div className={classes.brand}>
          <Link href="/" asChild>
            <Pressable role="link" style={styles.brandLink}>
              <Logo size={30} />
              <ThemedText type="subtitle" themeColor="tint" style={styles.brand}>
                Questing
              </ThemedText>
            </Pressable>
          </Link>
        </div>
        {children}
        <SidebarLinks />
      </nav>
    </div>
  );
}

/** The drawer's places without a tab, under the tabs in the desktop sidebar (hidden on phones). */
function SidebarLinks() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const pathname = usePathname();
  const links: {
    href: '/my-events' | '/organizations' | '/settings';
    label: string;
    icon: AndroidSymbol;
  }[] = [
    ...(status === 'signed-in'
      ? [
          {
            href: '/my-events' as const,
            label: t('myEvents.title'),
            icon: 'event_available' as const,
          },
          {
            href: '/organizations' as const,
            label: t('organizations.title'),
            icon: 'groups' as const,
          },
        ]
      : []),
    { href: '/settings', label: t('common.settings'), icon: 'settings' },
  ];

  return (
    <div className={classes.extras}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} asChild>
          <TabButton icon={link.icon} isFocused={pathname === link.href}>
            {link.label}
          </TabButton>
        </Link>
      ))}
    </div>
  );
}

type TabButtonProps = Omit<ComponentProps<typeof Pressable>, 'children'> & {
  icon: AndroidSymbol;
  children: string;
  /** A count shown next to the label, e.g. unread notifications. */
  badge?: number;
  isFocused?: boolean;
};

function TabButton({ icon, children, badge = 0, isFocused, ...props }: TabButtonProps) {
  const theme = useTheme();
  const color = isFocused ? theme.tint : theme.textSecondary;

  return (
    <Pressable {...props} aria-current={isFocused ? 'page' : undefined}>
      <div className={classes.tabButton}>
        <span className={classes.icon}>
          {/* Where you are, circled like a checkpoint on the course; it springs in. */}
          {isFocused ? <span className={classes.ring} /> : null}
          <SymbolView name={{ web: icon }} tintColor={color} size={24} />
        </span>
        <span className={classes.label}>
          <ThemedText
            type="smallBold"
            style={{ color: isFocused ? theme.text : theme.textSecondary }}>
            {children}
          </ThemedText>
        </span>
        {badge > 0 ? <span className={classes.badge}>{badge > 99 ? '99+' : badge}</span> : null}
      </div>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  panelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  panelContent: {
    gap: Spacing.three,
    padding: Spacing.three,
  },
  brandLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brand: { fontSize: 24, lineHeight: 32 },
});
