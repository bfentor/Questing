/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/lib/theme-lab';

export function useTheme() {
  const scheme = useColorScheme();

  return usePalette(scheme === 'dark' ? 'dark' : 'light');
}
