/**
 * Design Tokens — JS/TS mirror of CSS custom properties in globals.css
 * Used for Framer Motion animations and dynamic styling.
 */

export const colors = {
  bg: {
    base: '#111113',
    surface: '#18181b',
    raised: '#1f1f23',
    overlay: '#27272b',
    hover: 'rgba(255,255,255,0.04)',
    active: 'rgba(255,255,255,0.06)',
  },
  bgLight: {
    base: '#f4f4f5',
    surface: '#ffffff',
    raised: '#fafafa',
  },
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    default: 'rgba(255,255,255,0.09)',
    strong: 'rgba(255,255,255,0.14)',
    light: '#e4e4e7',
    lightStrong: '#d4d4d8',
  },
  text: {
    primary: '#fafafa',
    secondary: '#a1a1aa',
    tertiary: '#71717a',
    muted: '#52525b',
  },
  textLight: {
    primary: '#09090b',
    secondary: '#3f3f46',
    tertiary: '#71717a',
  },
  accent: {
    default: '#3b82f6',
    dim: '#2563eb',
    muted: 'rgba(59,130,246,0.10)',
    text: '#60a5fa',
  },
  positive: { default: '#22c55e', muted: 'rgba(34,197,94,0.10)' },
  caution: { default: '#eab308', muted: 'rgba(234,179,8,0.08)' },
  negative: { default: '#ef4444', muted: 'rgba(239,68,68,0.08)' },
  tier: {
    elite: '#eab308',
    member: '#22c55e',
    initiate: '#a1a1aa',
  },
} as const;

export const typography = {
  fontSans: "'Inter', -apple-system, system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  display: { size: '44px', weight: 700, letterSpacing: '-0.035em', lineHeight: 1.1 },
  h1: { size: '24px', weight: 700, letterSpacing: '-0.025em', lineHeight: 1.2 },
  h2: { size: '18px', weight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
  h3: { size: '14px', weight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
  body: { size: '14px', weight: 400, letterSpacing: '0', lineHeight: 1.6 },
  small: { size: '13px', weight: 500, letterSpacing: '0', lineHeight: 1.5 },
  caption: { size: '12px', weight: 500, letterSpacing: '0', lineHeight: 1.4 },
  label: { size: '11px', weight: 600, letterSpacing: '0.1em', lineHeight: 1.4 },
  mono: { size: '12px', weight: 500, letterSpacing: '0', lineHeight: 1.4 },
} as const;

export const spacing = {
  1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px',
  6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px',
} as const;

export const radii = {
  xs: '3px', sm: '5px', md: '8px', lg: '12px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.3)',
  md: '0 4px 12px rgba(0,0,0,0.4)',
  lg: '0 8px 24px rgba(0,0,0,0.5)',
} as const;

export const motion = {
  fast: 100,
  normal: 150,
  easeOut: [0, 0, 0.2, 1] as const,
} as const;

export const layout = {
  sidebarWidth: 220,
  headerHeight: 48,
  contentMax: 1400,
} as const;

/** Tier color lookup — use in components that render tier-specific UI */
export const tierColor = {
  elite: colors.tier.elite,
  member: colors.tier.member,
  initiate: colors.tier.initiate,
} as const;
