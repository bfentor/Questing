import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { PressableScale } from './pressable-scale';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Back to the home page from anywhere. Closes the screens on top of the tabs rather than
 * stacking another home page, and on the web it is a plain link to "/".
 */
export function HomeButton() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Link href="/" dismissTo asChild>
      <PressableScale
        squish="card"
        role="link"
        accessibilityLabel={t('common.home')}
        hitSlop={8}
        style={[styles.button]}>
        <SymbolView
          name={{ ios: 'house', android: 'home', web: 'home' }}
          size={20}
          tintColor={theme.textSecondary}
        />
      </PressableScale>
    </Link>
  );
}

/**
 * A screen's own header buttons, followed by the home button every screen has on phones. The
 * website leaves it out: its sidebar or bottom bar, on every page, already has Home.
 */
export function HeaderActions({ children }: { children?: ReactNode }) {
  if (Platform.OS === 'web' && !children) {
    return null;
  }
  return (
    <View style={styles.row}>
      {children}
      {Platform.OS === 'web' ? null : <HomeButton />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    // The web header puts its right-hand buttons flush with the edge; phones add their own margin.
    marginRight: Platform.OS === 'web' ? Spacing.three : 0,
  },
  button: {
    padding: 4,
    borderRadius: 999,
  },
});
