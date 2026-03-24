/**
 * Lógica de puntuación para BoulderLeague
 *
 * Reglas:
 *  - Flash (1 pegue)         → puntuación máxima: 100 pts
 *  - 2 pegues                → 80 pts
 *  - 3 pegues                → 65 pts
 *  - 4 pegues                → 55 pts
 *  - 5 pegues                → 45 pts
 *  - Más de 5 pegues         → 35 pts
 *  - Sin encadenar (0 / top) → 0 pts
 *
 * Bonus por dificultad (multiplicador sobre la base):
 *  - novato        → ×1.0
 *  - medio         → ×1.2
 *  - avanzado      → ×1.5
 *  - experimentado → ×1.8
 *  - profesional   → ×2.0
 */

export type Goes = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = no encadenado, 6 = +5

export type Difficulty =
  | 'principiante'
  | 'novato'
  | 'medio'
  | 'avanzado'
  | 'experimentado'
  | 'elite'
  | 'profesional'

const BASE_SCORE: Record<Goes, number> = {
  0: 0,   // no encadenado
  1: 100, // flash
  2: 80,
  3: 65,
  4: 55,
  5: 45,
  6: 35,  // +5 pegues
}

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  principiante:  0.8,
  novato:        1,
  medio:         1.2,
  avanzado:      1.5,
  experimentado: 1.8,
  elite:         2.2,
  profesional:   2.5,
}

/** Etiquetas legibles para cada opción de pegues */
export const GOES_LABELS: Record<Goes, string> = {
  0: 'Sin encadenar',
  1: '⚡ Flash',
  2: '2 pegues',
  3: '3 pegues',
  4: '4 pegues',
  5: '5 pegues',
  6: '+5 pegues',
}

/** Calcula la puntuación base según número de pegues */
export function calcBaseScore(goes: Goes): number {
  return BASE_SCORE[goes] ?? 0
}

/** Calcula el bonus multiplicador según dificultad */
export function calcBonus(difficulty: string | null): number {
  if (!difficulty) return 1
  return DIFFICULTY_MULTIPLIER[difficulty as Difficulty] ?? 1
}

/** Calcula la puntuación final redondeada */
export function calcScore(goes: Goes, difficulty: string | null): number {
  return Math.round(calcBaseScore(goes) * calcBonus(difficulty))
}

/** Convierte number_of_goes de la BD a tipo Goes (6 = +5) */
export function goesFromDB(numberOfGoes: number): Goes {
  if (numberOfGoes === 0) return 0
  if (numberOfGoes >= 6) return 6
  return numberOfGoes as Goes
}

/** Convierte Goes al valor que se guarda en BD */
export function goesToDB(goes: Goes): number {
  if (goes === 6) return 6 // representa +5 en pantalla
  return goes
}

/** Devuelve una etiqueta de emoji para mostrar en BlockCard */
export function resultEmoji(numberOfGoes: number): string {
  if (numberOfGoes === 0) return '—'
  if (numberOfGoes === 1) return '⚡'
  if (numberOfGoes <= 5) return `${numberOfGoes}×`
  return '+5×'
}

