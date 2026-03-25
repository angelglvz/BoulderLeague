/**
 * theme.ts — Sistema de diseño de BoulderLeague
 *
 * Paleta: Arcade Sport (#7B61FF / #00C2A8 / #FFD93D)
 * Dos modos: dark (fondo #121826) y light (fondo #F5F7FA)
 */

// ─────────────────────────────────────────────
// COLORES COMPARTIDOS (no cambian con el tema)
// ─────────────────────────────────────────────

const brand = {
  primary:           '#7B61FF',
  primaryLight:      '#A48FFF',
  primaryDark:       '#5A3FD6',
  primaryMuted:      'rgba(123,97,255,0.15)',

  secondary:         '#00C2A8',
  secondaryLight:    '#33D4BD',
  secondaryDark:     '#009E88',
  secondaryMuted:    'rgba(0,194,168,0.15)',

  accent:            '#FFD93D',
  accentLight:       '#FFE676',
  accentDark:        '#E6C200',
  accentMuted:       'rgba(255,217,61,0.15)',

  success:           '#22C55E',
  successLight:      'rgba(34,197,94,0.15)',
  successDark:       '#16A34A',

  warning:           '#F97316',
  warningLight:      'rgba(249,115,22,0.15)',
  warningDark:       '#C2410C',

  error:             '#EF4444',
  errorLight:        'rgba(239,68,68,0.15)',
  errorDark:         '#B91C1C',

  info:              '#38BDF8',
  infoLight:         'rgba(56,189,248,0.15)',
  infoDark:          '#0284C7',

  // Dificultades (7 niveles)
  diffNovato:        '#6BCB77',
  diffIniciado:      '#A8D84E',
  diffMedio:         '#FFD93D',
  diffAvanzado:      '#F97316',
  diffExperimentado: '#EF4444',
  diffElite:         '#7B61FF',
  diffProfesional:   '#00C2A8',

  // Resultados
  resultFlash:       '#FFD93D',
  resultSend:        '#22C55E',
  resultAttempted:   '#A0AABB',
  resultUntried:     '#6B7A8D',

  white: '#FFFFFF',
  black: '#000000',
} as const

// ─────────────────────────────────────────────
// TEMA OSCURO (default)
// ─────────────────────────────────────────────

const darkColors = {
  ...brand,

  background:    '#121826',
  surface:       '#1C2537',
  surfaceAlt:    '#243048',
  surfaceLight:  '#F5F7FA',

  textPrimary:   '#F5F7FA',
  textSecondary: '#A0AABB',
  textMuted:     '#6B7A8D',
  textInverse:   '#121826',
  textOnPrimary: '#FFFFFF',

  border:        '#2A3447',
  borderLight:   '#E2E8F0',
  borderFocus:   '#7B61FF',

  overlay:       'rgba(0,0,0,0.6)',
  shimmer:       'rgba(123,97,255,0.08)',
  divider:       '#1E2D40',
  skeleton:      '#2A3447',
} as const

// ─────────────────────────────────────────────
// TEMA CLARO
// ─────────────────────────────────────────────

const lightColors = {
  ...brand,

  background:    '#F5F7FA',
  surface:       '#FFFFFF',
  surfaceAlt:    '#EEF1F6',
  surfaceLight:  '#F5F7FA',

  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  textInverse:   '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  border:        '#DDE3EE',
  borderLight:   '#E2E8F0',
  borderFocus:   '#7B61FF',

  overlay:       'rgba(0,0,0,0.4)',
  shimmer:       'rgba(123,97,255,0.06)',
  divider:       '#E2E8F0',
  skeleton:      '#E2E8F0',
} as const

// ─────────────────────────────────────────────
// Export dinámico por modo
// ─────────────────────────────────────────────

export type ThemeMode = 'dark' | 'light'

export function getColors(mode: ThemeMode) {
  return mode === 'light' ? lightColors : darkColors
}

// Export estático (retrocompatibilidad — dark por defecto)
export const colors = darkColors

// ─────────────────────────────────────────────
// TIPOGRAFÍA
// ─────────────────────────────────────────────

export const typography = {
  fontFamily: {
    regular: undefined,
    medium: undefined,
    bold: undefined,
  },

  size: {
    xs:   11,
    sm:   13,
    md:   15,
    lg:   17,
    xl:   20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 38,
  },

  weight: {
    regular:   '400' as const,
    medium:    '500' as const,
    semibold:  '600' as const,
    bold:      '700' as const,
    extrabold: '800' as const,
  },

  lineHeight: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.75,
  },
} as const

// ─────────────────────────────────────────────
// ESPACIADO
// ─────────────────────────────────────────────

export const spacing = {
  xs:    4,
  sm:    8,
  md:   16,
  lg:   24,
  xl:   32,
  '2xl': 48,
  '3xl': 64,
} as const

// ─────────────────────────────────────────────
// BORDES REDONDEADOS
// ─────────────────────────────────────────────

export const radius = {
  sm:   6,
  md:  12,
  lg:  18,
  xl:  24,
  full: 9999,
} as const

// ─────────────────────────────────────────────
// SOMBRAS
// ─────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  glow: {
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
} as const

// ─────────────────────────────────────────────
// EXPORT UNIFICADO
// ─────────────────────────────────────────────

const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} as const

export default theme
