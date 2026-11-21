import { createContext, useContext, useSyncExternalStore } from 'react';
import { Platform, useWindowDimensions, type ViewStyle } from 'react-native';

/** From this width, the web app has a sidebar beside the page's column. */
export const SidebarMinWidth = 768;

const BesideSidebarContext = createContext(false);
const subscribe = () => () => {};

/** Set by the web tabs: their column sits against the sidebar instead of in the middle. */
export const BesideSidebar = BesideSidebarContext.Provider;

/**
 * Extra style for a screen's content column. On wide web screens it fills the window's
 * height, and beside the sidebar it lines up with it. Elsewhere nothing changes. (Its cards
 * are white on the map-paper background, so it needs no borders of its own.)
 */
export function useColumnStyle(): ViewStyle | null {
  const { width } = useWindowDimensions();
  const besideSidebar = useContext(BesideSidebarContext);
  // The server doesn't know the window's width. Hydration renders what it did, and the column
  // follows right after; otherwise React would keep the server's styles on pages opened directly.
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (Platform.OS !== 'web' || !hasHydrated || width < SidebarMinWidth) {
    return null;
  }
  return {
    alignSelf: besideSidebar ? 'flex-start' : 'center',
    flexGrow: 1,
  };
}
