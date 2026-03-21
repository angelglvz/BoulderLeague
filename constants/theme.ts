/**
 * theme.ts — Sistema de diseño de BoulderLeague
 *
 * Paleta inspirada en "arcade sport": colores vibrantes sobre fondos oscuros,
 * con acentos neón que evocan la energía del rocódromo y el juego competitivo.
 *
 * Recursos de referencia: /recursos_graficos/paleta arcade sport.png
 */

// ─────────────────────────────────────────────
// COLORES
// ─────────────────────────────────────────────

export const colors = {
  // Fondos
  background: '#0F0F14',       // Negro azulado — fondo principal
  surface: '#1A1A24',          // Superficie de tarjetas y modales
  surfaceAlt: '#23232F',       // Superficie alternativa (inputs, rows)

  // Marca / Primario
  primary: '#C8FF00',          // Verde lima neón — acción principal, CTA
  primaryDark: '#8FB800',      // Verde lima oscuro — estados pressed

  // Secundario / Acento
  accent: '#FF6B35',           // Naranja escalada — flashes, logros destacados
  accentAlt: '#FF3CAC',        // Rosa neón — badges, highlights especiales

  // Estado
  success: '#00E096',          // Verde menta — resultados positivos, encadenado
  warning: '#FFD60A',          // Amarillo — avisos, dificultad media
  error: '#FF4D4D',            // Rojo — errores, validaciones

  // Texto
  textPrimary: '#FFFFFF',      // Blanco — texto principal sobre fondos oscuros
  textSecondary: '#A0A0B8',    // Gris azulado — texto secundario, subtítulos
  textMuted: '#55556A',        // Gris oscuro — placeholders, texto desactivado
  textInverse: '#0F0F14',      // Negro — texto sobre fondos claros (botón primary)

  // Bordes
  border: '#2C2C3E',           // Borde sutil para tarjetas e inputs
  borderFocus: '#C8FF00',      // Borde activo en inputs con foco

  // Dificultades (sistema de puntuación)
  diffNovato: '#6BCB77',       // Verde suave
  diffMedio: '#FFD60A',        // Amarillo
  diffAvanzado: '#FF6B35',     // Naranja
  diffExperimentado: '#FF3CAC',// Rosa
  diffProfesional: '#BF5AF2',  // Púrpura

  // Resultados (intentos)
  resultFlash: '#C8FF00',      // Verde lima — flash
  resultSend: '#00E096',       // Verde menta — encadenado
  resultAttempted: '#A0A0B8',  // Gris — intentado sin encadenar
  resultUntried: '#55556A',    // Gris oscuro — sin intentar

  // Transparencias útiles
  overlay: 'rgba(15, 15, 20, 0.85)',
  shimmer: 'rgba(200, 255, 0, 0.08)',
} as const;

// ─────────────────────────────────────────────
// TIPOGRAFÍA
// ─────────────────────────────────────────────

export const typography = {
  // Familias — se usará la fuente del sistema por defecto en el MVP
  // En Fase 7 se puede integrar una fuente custom (ej: Space Grotesk, Inter)
  fontFamily: {
    regular: undefined,   // System default
    medium: undefined,
    bold: undefined,
  },

  // Tamaños
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 38,
  },

  // Pesos
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Interlineado
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ─────────────────────────────────────────────
// ESPACIADO (escala de 4px)
// ─────────────────────────────────────────────

export const spacing = {
  xs:   4,
  sm:   8,
  md:  16,
  lg:  24,
  xl:  32,
  '2xl': 48,
  '3xl': 64,
} as const;

// ─────────────────────────────────────────────
// BORDES REDONDEADOS
// ─────────────────────────────────────────────

export const radius = {
  sm:   6,
  md:  12,
  lg:  18,
  xl:  24,
  full: 9999,
} as const;

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
    shadowColor: '#C8FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ─────────────────────────────────────────────
// EXPORT UNIFICADO
// ─────────────────────────────────────────────

const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} as const;

export default theme;

