import type { Href } from 'expo-router';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

export type TabDefinition = {
  /** Route file name inside `src/app/(tabs)/`. */
  name: string;
  href: Href;
  /** Key under `tabs` in the translation files. */
  label: 'home' | 'upcoming' | 'nearby' | 'notifications' | 'profile';
  /** SF Symbol on iOS; Material Symbol on Android and web. */
  icon: { ios: SFSymbol; material: AndroidSymbol };
};

/**
 * The main sections of the app, shared by the native and web tab bars and the drawer. At most
 * five: Android's tab bar can't hold more.
 */
export const TABS: TabDefinition[] = [
  {
    name: 'index',
    href: '/',
    label: 'home',
    icon: { ios: 'house', material: 'home' },
  },
  {
    name: 'upcoming',
    href: '/upcoming',
    label: 'upcoming',
    icon: { ios: 'calendar', material: 'calendar_month' },
  },
  {
    name: 'nearby',
    href: '/nearby',
    label: 'nearby',
    icon: { ios: 'location', material: 'near_me' },
  },
  {
    name: 'notifications',
    href: '/notifications',
    label: 'notifications',
    icon: { ios: 'bell', material: 'notifications' },
  },
  {
    name: 'profile',
    href: '/profile',
    label: 'profile',
    icon: { ios: 'person.crop.circle', material: 'person' },
  },
];
