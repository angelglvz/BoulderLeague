/**
 * Lógica de puntuación V2 — Climbify
 *
 * Fórmula:
 *   score = base_points + difficulty_bonus
 *
 * base_points (por resultado):
 *   flash          → 10 pts
 *   completed (2)  →  5 pts
 *   completed (3)  →  4 pts
 *   completed (4)  →  3 pts
 *   completed (5)  →  2 pts
 *   completed (>5) →  1 pt
 *   not_completed  →  0 pts
 *
 * difficulty_bonus (aditivo):
 *   novato         → +0
 *   medio          → +1
 *   avanzado       → +2
 *   experimentado  → +3
 *   profesional    → +4
 */

import type { Database } from '../types/database.types'

// Tipos directamente del schema V2
export type AttemptResult = Database['public']['Enums']['attempt_result']
export type BlockDifficulty = Database['public']['Enums']['block_difficulty']

/** Puntos base según resultado y número de pegues */
export function calcBasePoints(result: AttemptResult, numberOfGoes: number): number {
  if (result === 'not_completed') return 0
  if (result === 'flash') return 10
  // result === 'completed'
  if (numberOfGoes <= 2) return 5
  if (numberOfGoes === 3) return 4
  if (numberOfGoes === 4) return 3
  if (numberOfGoes === 5) return 2
  return 1 // > 5 pegues
}

/** Bonus aditivo según dificultad */
export function calcDifficultyBonus(difficulty: BlockDifficulty): number {
  const bonuses: Record<BlockDifficulty, number> = {
    novato:        0,
    medio:         1,
    avanzado:      2,
    experimentado: 3,
    profesional:   4,
  }
  return bonuses[difficulty] ?? 0
}

/** Calcula la puntuación final */
export function calcScore(
  result: AttemptResult,
  numberOfGoes: number,
  difficulty: BlockDifficulty
): number {
  return calcBasePoints(result, numberOfGoes) + calcDifficultyBonus(difficulty)
}

/** Infiere el AttemptResult a partir del número de pegues (0 = no encadenado, 1 = flash) */
export function resultFromGoes(numberOfGoes: number): AttemptResult {
  if (numberOfGoes === 0) return 'not_completed'
  if (numberOfGoes === 1) return 'flash'
  return 'completed'
}

/** Etiquetas legibles para mostrar en UI */
export const RESULT_LABELS: Record<AttemptResult, string> = {
  flash:         '⚡ Flash',
  completed:     '✓ Encadenado',
  not_completed: '— Sin encadenar',
}

export const DIFFICULTY_LABELS: Record<BlockDifficulty, string> = {
  novato:        'Novato',
  medio:         'Medio',
  avanzado:      'Avanzado',
  experimentado: 'Experimentado',
  profesional:   'Profesional',
}

/** Emoji de resultado para BlockCard */
export function resultEmoji(result: AttemptResult): string {
  if (result === 'flash') return '⚡'
  if (result === 'completed') return '✓'
  return '—'
}
