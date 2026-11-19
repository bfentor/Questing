/**
 * A colour for each category, so they can be told apart at a glance. The light shades are dark
 * enough for white text on them, the dark shades light enough for dark text. Categories added
 * later in the admin fall back to the theme's tint.
 */
export const CATEGORY_COLORS: Record<string, { light: string; dark: string }> = {
  party: { light: '#b91c1c', dark: '#fca5a5' },
  music: { light: '#6d28d9', dark: '#c4b5fd' },
  sports: { light: '#15803d', dark: '#86efac' },
  outdoors: { light: '#0f766e', dark: '#5eead4' },
  academic: { light: '#1d4ed8', dark: '#93c5fd' },
  career: { light: '#475569', dark: '#cbd5e1' },
  tech: { light: '#0e7490', dark: '#67e8f9' },
  culture: { light: '#a21caf', dark: '#f0abfc' },
  food: { light: '#c2410c', dark: '#fdba74' },
  games: { light: '#be185d', dark: '#f9a8d4' },
  wellbeing: { light: '#a16207', dark: '#fde047' },
  volunteering: { light: '#4d7c0f', dark: '#bef264' },
  community: { light: '#0369a1', dark: '#7dd3fc' },
};
