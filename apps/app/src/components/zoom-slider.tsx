import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';

import { IconButton } from './icon-button';

export type ZoomSliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

const STEP = 0.25;

/** Zoom out and in buttons, with how far it's zoomed between them (pinching works too). */
export function ZoomSlider({ value, min, max, onChange }: ZoomSliderProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const shape = useShape();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <View style={styles.row}>
      <IconButton
        icon={{ ios: 'minus.magnifyingglass', material: 'zoom_out' }}
        label={t('crop.zoomOut')}
        onPress={() => onChange(clamp(value - STEP))}
      />
      <View
        style={[styles.track, shape.selector, { backgroundColor: theme.backgroundSelected }]}
        role="progressbar"
        aria-label={t('crop.zoom')}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}>
        <View
          style={[
            styles.fill,
            shape.selector,
            { backgroundColor: theme.tint, width: `${((value - min) / (max - min)) * 100}%` },
          ]}
        />
      </View>
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
  track: {
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
