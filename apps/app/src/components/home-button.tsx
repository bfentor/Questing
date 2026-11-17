import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

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
      <Pressable
        role="link"
        accessibilityLabel={t('common.home')}
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: 'house', android: 'home', web: 'home' }}
          size={20}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    </Link>
  );
}

/** A screen's own header buttons, followed by the home button every screen has. */
export function HeaderActions({ children }: { children?: ReactNode }) {
  return (
    <View style={styles.row}>
      {children}
      <HomeButton />
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
  pressed: {
    opacity: 0.6,
  },
});
