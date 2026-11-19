/** A `#rrggbb` (or `#rgb`) colour at some opacity, as `#rrggbbaa`; other colours stay as they are. */
export function withAlpha(color: string, alpha: number) {
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = [...hex].map((digit) => digit + digit).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  return `#${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

/**
 * `amount` (0–1) of `top` over `base`, as a solid `#rrggbb`, e.g. a hint of the accent in a
 * card. If either isn't a hex colour, `base` stays as it is.
 */
export function mix(base: string, top: string, amount: number) {
  const channels = (color: string) => {
    let hex = color.replace('#', '');
    if (hex.length === 3) hex = [...hex].map((digit) => digit + digit).join('');
    if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
    return [0, 2, 4].map((start) => parseInt(hex.slice(start, start + 2), 16));
  };
  const under = channels(base);
  const over = channels(top);
  if (!under || !over) return base;
  return `#${under
    .map((value, i) =>
      Math.round(value + (over[i] - value) * amount)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}
