import { useLayoutEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shows the page once it's drawn in the scheme it should have. The script in
 * app/+html.tsx hides it when that's dark, since the server-rendered page is
 * light, so dark-mode visitors don't see a light flash while it loads.
 *
 * From then on it keeps what's around the app in the theme's colours whenever the theme
 * changes (e.g. Light or Dark in Settings): the page's background, which shows when you
 * scroll past the ends and behind the iPhone's home indicator, and theme-color, the
 * browser's toolbar and an installed app's status bar.
 */
export function ThemeReady() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { background } = useTheme();

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (root.hasAttribute('data-theme-pending')) {
      // Still the light first render; the script has already coloured the page dark.
      if (scheme !== root.dataset.scheme) return;
      root.removeAttribute('data-theme-pending');
    }
    root.style.backgroundColor = background;
    root.style.colorScheme = scheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  }, [scheme, background]);

  return null;
}
