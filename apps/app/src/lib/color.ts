/** A `#rrggbb` (or `#rgb`) colour at some opacity, as `#rrggbbaa`; other colours stay as they are. */
export function withAlpha(color: string, alpha: number) {
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = [...hex].map((digit) => digit + digit).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  return `#${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
}
