import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { IconButton } from './icon-button';
import type { ZoomSliderProps } from './zoom-slider';

const STEP = 0.25;

/** The browser's own range slider, between zoom out and in buttons. */
export function ZoomSlider({ value, min, max, onChange }: ZoomSliderProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <View style={styles.row}>
      <IconButton
        icon={{ ios: 'minus.magnifyingglass', material: 'zoom_out' }}
        label={t('crop.zoomOut')}
        onPress={() => onChange(clamp(value - STEP))}
      />
      <input
        type="range"
        aria-label={t('crop.zoom')}
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ flex: 1, minWidth: 0, accentColor: theme.tint, cursor: 'pointer' }}
      />
      <IconButton
        icon={{ ios: 'plus.magnifyingglass', material: 'zoom_in' }}
        label={t('crop.zoomIn')}
        onPress={() => onChange(clamp(value + STEP))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
