import { createContext, useContext } from 'react';
import { Platform, useWindowDimensions, type ViewStyle } from 'react-native';

/** From this width, the web app has a sidebar and frames the page's column. */
export const SidebarMinWidth = 768;
/** The lines between the sidebar, the column and the event panel. */
export const DividerColor = 'rgba(127, 127, 127, 0.25)';

const BesideSidebarContext = createContext(false);

/** Set by the web tabs: their column sits against the sidebar instead of in the middle. */
export const BesideSidebar = BesideSidebarContext.Provider;

/**
 * Extra style for a screen's content column. On wide web screens it gets a border on each
 * side and fills the window's height, so it doesn't just fade into the background; beside
 * the sidebar it lines up with it. Elsewhere nothing changes.
 */
export function useColumnStyle(): ViewStyle | null {
  const { width } = useWindowDimensions();
  const besideSidebar = useContext(BesideSidebarContext);
  if (Platform.OS !== 'web' || width < SidebarMinWidth) {
    return null;
  }
  return {
    alignSelf: besideSidebar ? 'flex-start' : 'center',
    flexGrow: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: DividerColor,
  };
}
