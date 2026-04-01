/**
 * Design Tokens — JS/TS mirror of CSS custom properties in globals.css
 * "Vault" aesthetic: deep black, warm gold accent, Clash Display + Satoshi.
 */

export const colors = {
  bg: {
    base: '#08080a',
    surface: '#121216',
    raised: '#1a1a20',
    overlay: '#222228',
    hover: 'rgba(212,168,83,0.04)',
    active: 'rgba(212,168,83,0.08)',
  },
  border: {
    subtle: 'rgba(212,168,83,0.06)',
    default: 'rgba(212,168,83,0.10)',
    strong: 'rgba(212,168,83,0.18)',
  },
  text: {
    primary: '#F0ECE4',
    secondary: '#9B9689',
    tertiary: '#6B6660',
    muted: '#4A4640',
  },
  accent: {
    default: '#D4A853',
    dim: '#B8923F',
    muted: 'rgba(212,168,83,0.10)',
    text: '#E8C475',
  },
  positive: { default: '#4ADE80', muted: 'rgba(74,222,128,0.10)' },
  caution: { default: '#FBBF24', muted: 'rgba(251,191,36,0.08)' },
  negative: { default: '#F87171', muted: 'rgba(248,113,113,0.08)' },
  tier: {
    elite: '#D4A853',
    member: '#4ADE80',
    initiate: '#9B9689',
  },
} as const;

export const typography = {
  fontDisplay: "'Clash Display', 'Inter', sans-serif",
  fontSans: "'Satoshi', 'Inter', -apple-system, system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  display: { size: '52px', weight: 600, letterSpacing: '-0.04em', lineHeight: 1.05 },
  h1: { size: '28px', weight: 600, letterSpacing: '-0.025em', lineHeight: 1.15 },
  h2: { size: '20px', weight: 600, letterSpacing: '-0.02em', lineHeight: 1.2 },
  h3: { size: '15px', weight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
  body: { size: '14px', weight: 400, letterSpacing: '0', lineHeight: 1.6 },
  small: { size: '13px', weight: 500, letterSpacing: '0', lineHeight: 1.5 },
  caption: { size: '12px', weight: 500, letterSpacing: '0', lineHeight: 1.4 },
  label: { size: '11px', weight: 600, letterSpacing: '0.12em', lineHeight: 1.4 },
  mono: { size: '12px', weight: 500, letterSpacing: '0', lineHeight: 1.4 },
} as const;

export const spacing = {
  1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px',
  6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px',
} as const;

export const radii = {
  xs: '4px', sm: '6px', md: '10px', lg: '14px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.55), 0 1px 8px rgba(212,168,83,0.06)',
  md: '0 2px 8px rgba(0,0,0,0.55), 0 4px 20px rgba(212,168,83,0.08)',
  lg: '0 4px 16px rgba(0,0,0,0.55), 0 8px 40px rgba(212,168,83,0.10)',
  xl: '0 8px 28px rgba(0,0,0,0.60), 0 16px 64px rgba(212,168,83,0.12)',
  '2xl': '0 16px 48px rgba(0,0,0,0.65), 0 24px 80px rgba(212,168,83,0.14)',
  gold: '0 0 0 1px rgba(212,168,83,0.08), 0 2px 12px rgba(212,168,83,0.12), 0 8px 32px rgba(212,168,83,0.08)',
} as const;

export const motion = {
  fast: 120,
  normal: 200,
  easeOut: [0.16, 1, 0.3, 1] as const,
} as const;

export const layout = {
  sidebarWidth: 260,
  headerHeight: 56,
  contentMax: 1400,
} as const;

/** Tier color lookup */
export const tierColor = {
  elite: colors.tier.elite,
  member: colors.tier.member,
  initiate: colors.tier.initiate,
} as const;
