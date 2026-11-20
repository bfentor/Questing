import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { ICON_VERSION } from '@/constants/icon-version';
import { Colors } from '@/constants/theme';

/**
 * Runs before the first paint. The server renders the light theme (it can't know the visitor's
 * choice), so when the page should be dark it gets a dark background and its content stays
 * hidden until the app has drawn it dark (components/theme-ready.web.tsx), or 3 seconds pass.
 * Either way, the page's background and the browser's toolbar colour (theme-color, which an
 * installed iPhone app reads for its status bar) match the theme from the start.
 * The key is where lib/appearance.ts keeps the choice.
 */
const THEME_SCRIPT = `(function () {
  try {
    var chosen = localStorage.getItem('sidequest.appearance');
    var dark = chosen === 'dark' || (chosen !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    var background = dark ? '${Colors.dark.background}' : '${Colors.light.background}';
    var root = document.documentElement;
    root.style.backgroundColor = background;
    root.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', background);
    if (!dark) return;
    root.dataset.scheme = 'dark';
    root.setAttribute('data-theme-pending', '');
    setTimeout(function () { root.removeAttribute('data-theme-pending'); }, 3000);
  } catch (error) {}
})();`;

/**
 * The HTML around every web page (server-rendered; not used on phones).
 * Expo's default, plus what makes the site installable as an app and opens in the right color scheme.
 */
export default function Root({ children }: PropsWithChildren) {
  // Each page's metadata and the app's scripts; leaving them out breaks link previews and hydration.
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/*
          viewport-fit=cover: the page reaches the screen's edges, and env(safe-area-inset-*)
          says how much the iPhone's home indicator and notch cover (the bottom bar pads by it).
        */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <link rel="manifest" href={`/manifest.webmanifest?v=${ICON_VERSION}`} />
        {/*
          The browser's toolbar, and an installed app's status bar, in the page's colour. The
          script below and components/theme-ready.web.tsx keep it in step with the theme,
          including the one chosen in Settings.
        */}
        <meta name="theme-color" content={Colors.light.background} />
        {/* Icons: scripts/make-icons draws them, and versions their links (icon-version.ts). */}
        <link rel="icon" href={`/icons/favicon.svg?v=${ICON_VERSION}`} type="image/svg+xml" />
        <link rel="icon" href={`/icons/favicon.ico?v=${ICON_VERSION}`} sizes="48x48" />
        <link rel="apple-touch-icon" href={`/icons/apple-touch-icon.png?v=${ICON_VERSION}`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* The status bar takes theme-color, with dark or light text to suit it. */}
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Questing" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <style>{'html[data-theme-pending] #root { visibility: hidden; }'}</style>
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
