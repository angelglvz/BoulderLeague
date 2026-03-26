/**
 * Lógica de puntuación V2 — Climbify
 *
 * Fórmula:
 *   score = base_points + difficulty_bonus
 *
 * base_points (por resultado):
 *   flash          → 10 pts
 *   completed (2)  →  7 pts
 *   completed (3)  →  5 pts
 *   completed (4)  →  4 pts
 *   completed (5)  →  3 pts
 *   completed (>5) →  2 pts
 *   not_completed  →  0 pts
 *
 * difficulty_bonus (aditivo, 7 niveles):
 *   principiante   → +0
 *   novato         → +2
 *   medio          → +3
 *   avanzado       → +4
 *   experimentado  → +8
 *   elite          → +9
 *   profesional    → +10
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
  if (numberOfGoes <= 2) return 7
  if (numberOfGoes === 3) return 5
  if (numberOfGoes === 4) return 4
  if (numberOfGoes === 5) return 3
  return 2 // > 5 pegues
}

/** Bonus aditivo según dificultad (7 niveles) */
export function calcDifficultyBonus(difficulty: BlockDifficulty): number {
  const bonuses: Record<BlockDifficulty, number> = {
    principiante:  0,
    novato:        2,
    medio:         3,
    avanzado:      4,
    experimentado: 8,
    elite:         9,
    profesional:   10,
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
  principiante:  'Principiante',
  novato:        'Novato',
  medio:         'Medio',
  avanzado:      'Avanzado',
  experimentado: 'Experimentado',
  elite:         'Élite',
  profesional:   'Profesional',
}

/** Emoji de resultado para BlockCard */
export function resultEmoji(result: AttemptResult): string {
  if (result === 'flash') return '⚡'
  if (result === 'completed') return '✓'
  return '—'
}

// ── Helpers para el formulario de registro de intentos ──

/** Número de pegues: 0 = sin encadenar, 1 = flash, 2-5 = pegues, 6 = +5 */
export type Goes = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const GOES_LABELS: Record<Goes, string> = {
  0: 'Sin encadenar',
  1: 'Flash',
  2: '2 pegues',
  3: '3 pegues',
  4: '4 pegues',
  5: '5 pegues',
  6: '+5 pegues',
}

/** Convierte el number_of_goes de la BD al tipo Goes del formulario */
export function goesFromDB(numberOfGoes: number): Goes {
  if (numberOfGoes === 0) return 0
  if (numberOfGoes === 1) return 1
  if (numberOfGoes >= 6) return 6
  return numberOfGoes as Goes
}

