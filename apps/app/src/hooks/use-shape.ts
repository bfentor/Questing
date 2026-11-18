import type { ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useShapeValues } from '@/lib/theme-lab';

/** Shadows for Shape.depth 0, 1 and 2. */
const SHADOWS = [
  undefined,
  '0px 1px 2px rgba(0, 0, 0, 0.08), 0px 1px 3px rgba(0, 0, 0, 0.12)',
  '0px 2px 4px rgba(0, 0, 0, 0.1), 0px 6px 16px rgba(0, 0, 0, 0.16)',
];

/**
 * Ready-made styles for the app's shape (constants/theme.ts `Shape`), so every card, button
 * and field follows the same corners, outline and depth.
 */
export function useShape() {
  const shape = useShapeValues();
  const theme = useTheme();
  const outline: ViewStyle = shape.border
    ? { borderWidth: shape.border, borderColor: theme.backgroundSelected }
    : {};
  const shadow: ViewStyle = { boxShadow: SHADOWS[shape.depth] };

  return {
    ...shape,
    /** Cards and panels. */
    box: { borderRadius: shape.boxRadius, ...outline, ...shadow } satisfies ViewStyle,
    /** Dialogs and other large surfaces, a little rounder than cards. */
    dialog: { borderRadius: shape.boxRadius * 1.5, ...outline, ...shadow } satisfies ViewStyle,
    /** Pictures and maps the size of a card. */
    picture: { borderRadius: shape.boxRadius } satisfies ViewStyle,
    /** Thumbnails and small blocks inside a card. */
    inner: { borderRadius: shape.boxRadius / 2 } satisfies ViewStyle,
    /** Buttons; filled ones also get the shadow. */
    button: {
      borderRadius: shape.buttonRadius,
      minHeight: shape.controlHeight,
    } satisfies ViewStyle,
    raised: shadow,
    /** Text inputs and date fields. */
    field: {
      borderRadius: shape.fieldRadius,
      minHeight: shape.controlHeight,
      ...outline,
    } satisfies ViewStyle,
    /** Chips, pills and progress bars. */
    selector: { borderRadius: shape.selectorRadius } satisfies ViewStyle,
    /** Checkboxes are too small to be fully round, which would make them look like radio buttons. */
    checkbox: { borderRadius: Math.min(shape.selectorRadius, 6) } satisfies ViewStyle,
  };
}
