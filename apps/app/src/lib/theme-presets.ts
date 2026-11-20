import { DEFAULT_LOOK, type Look, type Palette } from './theme-lab';

/** Starting points for the Theme lab (development only). */
export const PRESETS: { name: string; look: Look }[] = [
  { name: 'Questing', look: DEFAULT_LOOK },
  {
    name: 'Paper',
    look: {
      light: {
        text: '#111111',
        background: '#fafaf7',
        backgroundElement: '#f0efe9',
        backgroundSelected: '#dddcd3',
        textSecondary: '#5f5e58',
        tint: '#111111',
        onTint: '#fafaf7',
        danger: '#c2261b',
      },
      dark: {
        text: '#f2f1ec',
        background: '#121211',
        backgroundElement: '#1d1d1b',
        backgroundSelected: '#3a3a36',
        textSecondary: '#a9a8a1',
        tint: '#f2f1ec',
        onTint: '#121211',
        danger: '#ff6b5e',
      },
      shape: {
        boxRadius: 0,
        buttonRadius: 0,
        fieldRadius: 0,
        selectorRadius: 0,
        border: 1,
        depth: 0,
        controlHeight: 44,
      },
    },
  },
  {
    name: 'Bubblegum',
    look: {
      light: {
        text: '#2b1630',
        background: '#fff7fb',
        backgroundElement: '#fde8f3',
        backgroundSelected: '#f8cfe6',
        textSecondary: '#7a5a72',
        tint: '#c42a7c',
        onTint: '#ffffff',
        danger: '#c92a36',
      },
      dark: {
        text: '#fbeaf4',
        background: '#1a0f17',
        backgroundElement: '#2a1825',
        backgroundSelected: '#3d2236',
        textSecondary: '#c7a3bb',
        tint: '#ff6eb4',
        onTint: '#2b0a1c',
        danger: '#ff6b78',
      },
      shape: {
        boxRadius: 24,
        buttonRadius: 999,
        fieldRadius: 16,
        selectorRadius: 999,
        border: 0,
        depth: 1,
        controlHeight: 48,
      },
    },
  },
  {
    name: 'Forest',
    look: {
      light: {
        text: '#13231a',
        background: '#f6f8f3',
        backgroundElement: '#e8eee2',
        backgroundSelected: '#d3dfca',
        textSecondary: '#52634f',
        tint: '#2f7a3f',
        onTint: '#ffffff',
        danger: '#b8322a',
      },
      dark: {
        text: '#e6efe2',
        background: '#0d1510',
        backgroundElement: '#17231a',
        backgroundSelected: '#2a3d2e',
        textSecondary: '#9fb39b',
        tint: '#5fbf73',
        onTint: '#08130b',
        danger: '#ff7b6e',
      },
      shape: {
        boxRadius: 12,
        buttonRadius: 12,
        fieldRadius: 8,
        selectorRadius: 8,
        border: 1,
        depth: 0,
        controlHeight: 44,
      },
    },
  },
  {
    name: 'Sunset',
    look: {
      light: {
        text: '#2a1a10',
        background: '#fffaf4',
        backgroundElement: '#fdeedd',
        backgroundSelected: '#f9dcbd',
        textSecondary: '#7c5f4a',
        tint: '#c2410c',
        onTint: '#ffffff',
        danger: '#b91c1c',
      },
      dark: {
        text: '#fdeee0',
        background: '#1a120c',
        backgroundElement: '#2a1d13',
        backgroundSelected: '#3d2a1b',
        textSecondary: '#c9a98f',
        tint: '#ff8a3d',
        onTint: '#2a1204',
        danger: '#ff6b6b',
      },
      shape: {
        boxRadius: 24,
        buttonRadius: 999,
        fieldRadius: 12,
        selectorRadius: 999,
        border: 0,
        depth: 2,
        controlHeight: 48,
      },
    },
  },
  {
    name: 'Midnight',
    look: {
      light: {
        text: '#0f172a',
        background: '#f8fafc',
        backgroundElement: '#eef2f7',
        backgroundSelected: '#dbe3ee',
        textSecondary: '#526079',
        tint: '#4f46e5',
        onTint: '#ffffff',
        danger: '#dc2626',
      },
      dark: {
        text: '#e2e8f0',
        background: '#0b1020',
        backgroundElement: '#151b2e',
        backgroundSelected: '#2a3350',
        textSecondary: '#94a3b8',
        tint: '#818cf8',
        onTint: '#0b1020',
        danger: '#f87171',
      },
      shape: {
        boxRadius: 8,
        buttonRadius: 8,
        fieldRadius: 6,
        selectorRadius: 4,
        border: 1,
        depth: 1,
        controlHeight: 44,
      },
    },
  },
];

function hsl(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

const pick = <T>(options: readonly T[]) => options[Math.floor(Math.random() * options.length)];

/** Readable text colour on a filled background: white or near-black. */
function textOn(background: string) {
  return contrastRatio('#ffffff', background) >= contrastRatio('#111111', background)
    ? '#ffffff'
    : '#111111';
}

/** A random but readable look: one hue for the accent, faintly tinted neutrals. */
export function randomLook(): Look {
  const hue = Math.floor(Math.random() * 360);
  const warmth = pick([4, 10, 18]);
  const light: Palette = {
    text: hsl(hue, warmth, 9),
    background: hsl(hue, warmth + 20, 99),
    backgroundElement: hsl(hue, warmth + 10, 94),
    backgroundSelected: hsl(hue, warmth + 8, 87),
    textSecondary: hsl(hue, warmth, 38),
    tint: hsl(hue, 70, 40),
    onTint: '',
    danger: '#c62828',
  };
  const dark: Palette = {
    text: hsl(hue, warmth, 95),
    background: hsl(hue, warmth + 10, 6),
    backgroundElement: hsl(hue, warmth + 6, 12),
    backgroundSelected: hsl(hue, warmth + 6, 20),
    textSecondary: hsl(hue, warmth, 70),
    tint: hsl(hue, 80, 66),
    onTint: '',
    danger: '#ff6b6b',
  };
  light.onTint = textOn(light.tint);
  dark.onTint = textOn(dark.tint);
  const box = pick([0, 8, 12, 16, 24]);
  return {
    light,
    dark,
    shape: {
      boxRadius: box,
      buttonRadius: pick([box, box / 2, 999]),
      fieldRadius: pick([0, 4, 8, 12]),
      selectorRadius: pick([0, 4, 8, 999]),
      border: pick([0, 0, 1, 2]),
      depth: pick([0, 1, 2]),
      controlHeight: pick([44, 48]),
    },
  };
}

function luminance(hex: string) {
  let digits = hex.replace('#', '');
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(digits.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque hex colours (1 to 21). */
export function contrastRatio(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}
