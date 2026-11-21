import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/config';

import { Button } from './button';
import { ControlRing } from './course-marks';
import { Logo } from './logo';
import { MapPattern } from './map-pattern';
import { ThemedText } from './themed-text';

/**
 * What Questing is, above the upcoming events, for signed-out visitors to
 * the website: a sign-up button, and the app's store pages once it's out.
 * It opens on a scrap of map with a course across it, the logo pinned on it.
 */
export function Welcome() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const theme = useTheme();
  const shape = useShape();

  if (status !== 'signed-out') {
    return null;
  }
  const stores = [
    { url: APP_STORE_URL, label: t('welcome.appStore') },
    { url: PLAY_STORE_URL, label: t('welcome.playStore') },
  ].filter((store) => store.url);

  return (
    <View
      style={[
        styles.hero,
        { borderRadius: shape.boxRadius * 1.5, backgroundColor: theme.backgroundElement },
      ]}>
      <MapPattern course style={styles.map} />
      <View style={styles.pin}>
        <Logo size={56} />
      </View>
      <View style={styles.body}>
        <ThemedText type="subtitle" role="heading" aria-level={1}>
          {t('welcome.title')}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{t('welcome.tagline')}</ThemedText>
        <View style={styles.points}>
          {[t('welcome.pointNearby'), t('welcome.pointFollow'), t('welcome.pointFriends')].map(
            (point) => (
              <View key={point} style={styles.point}>
                <View style={styles.bullet}>
                  <ControlRing size={16} strokeWidth={2.5} />
                </View>
                <ThemedText style={styles.pointText}>{point}</ThemedText>
              </View>
            ),
          )}
        </View>
        <View style={styles.buttons}>
          <View style={styles.button}>
            <Button title={t('welcome.signUp')} onPress={() => router.push('/sign-up')} />
          </View>
          {stores.map((store) => (
            <View key={store.url} style={styles.button}>
              <Button
                title={store.label}
                variant="secondary"
                onPress={() => Linking.openURL(store.url)}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const MAP_HEIGHT = 132;
const PIN = 56;

const styles = StyleSheet.create({
  hero: {
    overflow: 'hidden',
  },
  map: {
    height: MAP_HEIGHT,
  },
  // The logo stuck on the map's lower edge, like a pin: you are here.
  pin: {
    position: 'absolute',
    top: MAP_HEIGHT - PIN / 2,
    left: Spacing.four,
    padding: 4,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '-6deg' }],
  },
  body: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingTop: PIN / 2 + Spacing.three,
  },
  points: {
    gap: Spacing.two,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 2,
  },
  // Lined up with the first line of the text beside it.
  bullet: {
    paddingTop: 4,
  },
  pointText: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  button: {
    flexGrow: 1,
    flexBasis: 160,
  },
});
