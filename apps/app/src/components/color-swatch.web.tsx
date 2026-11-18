import { useTheme } from '@/hooks/use-theme';

type ColorSwatchProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export const SWATCH_SIZE = 44;

/** A colour preview that opens the browser's own colour picker. */
export function ColorSwatch({ label, value, onChange }: ColorSwatchProps) {
  const theme = useTheme();
  // <input type="color"> only takes #rrggbb; shorter or translucent codes are edited as text.
  const pickable = /^#[0-9a-f]{6}$/i.test(value);

  return (
    <input
      type="color"
      aria-label={label}
      value={pickable ? value.toLowerCase() : '#000000'}
      onChange={(event) => onChange(event.target.value)}
      style={{
        width: SWATCH_SIZE,
        height: SWATCH_SIZE,
        padding: 0,
        border: `1px solid ${theme.backgroundSelected}`,
        borderRadius: SWATCH_SIZE / 4,
        backgroundColor: pickable ? 'transparent' : value,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    />
  );
}
