import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * A small tap felt in the hand, on phones (the web has none). `tap` is for buttons and cards,
 * `tick` for toggles, chips and tabs, `success` for a choice that's been made, e.g. Going.
 */
export type HapticKind = 'tap' | 'tick' | 'success';

export function haptic(kind: HapticKind) {
  if (Platform.OS === 'web') return;
  const done =
    kind === 'success'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : kind === 'tick'
        ? Haptics.selectionAsync()
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // Devices without a vibration motor (or with it turned off) just stay still.
  done.catch(() => {});
}
