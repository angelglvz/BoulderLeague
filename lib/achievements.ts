/**
 * Sistema de achievements — Climbify V2
 *
 * 11 categorías, progresión infinita de tiers.
 * Solo cuenta bloques de gym (owner_type = 'gym').
 *
 * Categorías:
 *   volume · difficulty_principiante · difficulty_novato · difficulty_medio
 *   difficulty_avanzado · difficulty_experimentado · difficulty_elite
 *   difficulty_profesional · flash · consistency · explorer
 */

import { supabase } from './supabase'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type AchievementCategory =
  | 'volume'
  | 'difficulty_principiante'
  | 'difficulty_novato'
  | 'difficulty_medio'
  | 'difficulty_avanzado'
  | 'difficulty_experimentado'
  | 'difficulty_elite'
  | 'difficulty_profesional'
  | 'flash'
  | 'consistency'
  | 'explorer'

export interface MedalDefinition {
  key: string             // "volume_tier_3"
  category: AchievementCategory
  tier: number
  threshold: number
  points: number
  label: string
  tierName: string        // "Bronce", "Oro"…
  tierColor: string       // hex
}

export interface UserGymStats {
  gymBlocksCompleted: number
  gymBlocksByDifficulty: {
    principiante: number
    novato: number
    medio: number
    avanzado: number
    experimentado: number
    elite: number
    profesional: number
  }
  gymFlashes: number
  activeDaysThisMonth: number
  distinctGymsWithCompletion: number
}

// ─────────────────────────────────────────────
// FUNCIONES DE UMBRAL
// ─────────────────────────────────────────────

/** Umbral para Volumen y Flash */
export function volumeThreshold(n: number): number {
  if (n === 1) return 5
  if (n === 2) return 15
  if (n === 3) return 30
  if (n === 4) return 50
  if (n === 5) return 100
  return Math.round(100 * Math.pow(2, n - 5))
}

/** Umbral común para todas las categorías de dificultad */
export function difficultyThreshold(n: number): number {
  if (n === 1) return 3
  if (n === 2) return 10
  if (n === 3) return 25
  if (n === 4) return 50
  return Math.round(50 * Math.pow(2, n - 4))
}

/** Umbral para Flash (serie inicial diferenciada) */
export function flashThreshold(n: number): number {
  const fixed = [1, 5, 15, 30, 50]
  if (n <= fixed.length) return fixed[n - 1]
  return Math.round(50 * Math.pow(2, n - fixed.length))
}

/** Umbral para Explorador */
export function explorerThreshold(n: number): number {
  if (n === 1) return 2
  if (n === 2) return 5
  if (n === 3) return 10
  if (n === 4) return 20
  return Math.round(20 * Math.pow(2, n - 4))
}

/** Puntos base por tier (antes de aplicar multiplicador de categoría) */
export function baseTierPoints(n: number): number {
  if (n === 1) return 10
  if (n === 2) return 25
  if (n === 3) return 50
  if (n === 4) return 100
  if (n === 5) return 200
  return Math.round(200 * Math.pow(2, n - 5))
}

/** Nombre y color de tier */
export function tierMeta(n: number): { name: string; color: string } {
  const names  = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante']
  const colors = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2', '#B9F2FF']
  if (n <= names.length) return { name: names[n - 1], color: colors[n - 1] }
  return { name: `Leyenda ${n - names.length}`, color: '#FF6B35' }
}

// ─────────────────────────────────────────────
// LABELS
// ─────────────────────────────────────────────

function volumeLabel(n: number): string {
  const fixed = ['Primeros pasos', 'En racha', 'Escalador regular', 'Dedicado', 'Centenario', 'Incansable']
  return n <= fixed.length ? fixed[n - 1] : `Leyenda del bloque ${n - fixed.length}`
}

const DIFFICULTY_LABELS: Record<string, string[]> = {
  difficulty_principiante:  ['Comenzando', 'Base sólida', 'Confort en el inicio', 'Maestro principiante'],
  difficulty_novato:        ['Un paso más', 'Tomando ritmo', 'Fluido en novato', 'Maestro novato'],
  difficulty_medio:         ['A medio gas', 'Constante', 'Medio maestro', 'Sólido'],
  difficulty_avanzado:      ['Subiendo el nivel', 'Perseverante', 'Élite avanzado', 'Obsesionado'],
  difficulty_experimentado: ['Curtido', 'Con experiencia', 'Veterano', 'Señor de la roca'],
  difficulty_elite:         ['Mentalidad élite', 'De otro nivel', 'Inalcanzable', 'Élite supremo'],
  difficulty_profesional:   ['Toca el cielo', 'Pro en serio', 'Leyenda pro', 'Más allá del límite'],
}

function difficultyLabel(cat: AchievementCategory, n: number): string {
  const arr = DIFFICULTY_LABELS[cat] ?? []
  if (n <= arr.length) return arr[n - 1]
  const suffix = cat.replace('difficulty_', '')
  return `${suffix.charAt(0).toUpperCase() + suffix.slice(1)} Lv.${n - arr.length}`
}

function flashLabel(n: number): string {
  const fixed = ['Primer flash', 'Flash en racha', 'Ojo de halcón', 'Lector de bloques', 'Señal de flash']
  return n <= fixed.length ? fixed[n - 1] : `Flash maestro ${n - fixed.length}`
}

function explorerLabel(n: number): string {
  const fixed = ['Explorador novato', 'Rodante', 'Trotamundos', 'Sin fronteras']
  return n <= fixed.length ? fixed[n - 1] : `Explorador mundial ${n - fixed.length}`
}

// ─────────────────────────────────────────────
// MULTIPLICADORES DE CATEGORÍA
// ─────────────────────────────────────────────

const DIFF_MULT: Record<string, number> = {
  difficulty_principiante:  1,
  difficulty_novato:        1.2,
  difficulty_medio:         1.5,
  difficulty_avanzado:      1.8,
  difficulty_experimentado: 2.2,
  difficulty_elite:         2.6,
  difficulty_profesional:   3,
}

const CONSTANCY_DAYS   = [3, 7, 14, 20, 28]
const CONSTANCY_POINTS = [20, 50, 100, 200, 400]
const CONSTANCY_LABELS = [
  'Asistencia regular',
  'Escalador semanal',
  'Quincenal',
  'Escalador constante',
  'Un mes sin parar',
]

// ─────────────────────────────────────────────
// GENERADOR INFINITO DE DEFINICIONES
// maxTier=30 cubre décadas de uso.
// ─────────────────────────────────────────────

export function generateMedalDefinitions(maxTier = 30): MedalDefinition[] {
  const medals: MedalDefinition[] = []

  // ── Volumen
  for (let n = 1; n <= maxTier; n++) {
    const { name, color } = tierMeta(n)
    medals.push({
      key: `volume_tier_${n}`,
      category: 'volume',
      tier: n,
      threshold: volumeThreshold(n),
      points: baseTierPoints(n),
      label: volumeLabel(n),
      tierName: name,
      tierColor: color,
    })
  }

  // ── Dificultades (7 niveles)
  const diffCategories = Object.keys(DIFF_MULT) as AchievementCategory[]
  for (const cat of diffCategories) {
    const mult = DIFF_MULT[cat]
    for (let n = 1; n <= maxTier; n++) {
      const { name, color } = tierMeta(n)
      medals.push({
        key: `${cat}_tier_${n}`,
        category: cat,
        tier: n,
        threshold: difficultyThreshold(n),
        points: Math.round(baseTierPoints(n) * mult),
        label: difficultyLabel(cat, n),
        tierName: name,
        tierColor: color,
      })
    }
  }

  // ── Flash
  for (let n = 1; n <= maxTier; n++) {
    const { name, color } = tierMeta(n)
    medals.push({
      key: `flash_tier_${n}`,
      category: 'flash',
      tier: n,
      threshold: flashThreshold(n),
      points: Math.round(baseTierPoints(n) * 1.5),
      label: flashLabel(n),
      tierName: name,
      tierColor: color,
    })
  }

  // ── Constancia (solo 5 tiers fijos, reestrenable cada mes)
  for (let n = 1; n <= 5; n++) {
    const { name, color } = tierMeta(n)
    medals.push({
      key: `consistency_tier_${n}`,
      category: 'consistency',
      tier: n,
      threshold: CONSTANCY_DAYS[n - 1],
      points: CONSTANCY_POINTS[n - 1],
      label: CONSTANCY_LABELS[n - 1],
      tierName: name,
      tierColor: color,
    })
  }

  // ── Explorador
  for (let n = 1; n <= maxTier; n++) {
    const { name, color } = tierMeta(n)
    medals.push({
      key: `explorer_tier_${n}`,
      category: 'explorer',
      tier: n,
      threshold: explorerThreshold(n),
      points: Math.round(baseTierPoints(n) * 1.5),
      label: explorerLabel(n),
      tierName: name,
      tierColor: color,
    })
  }

  return medals
}

// ─────────────────────────────────────────────
// EVALUACIÓN
// ─────────────────────────────────────────────

/**
 * Compara las stats actuales con las medallas ya obtenidas
 * y devuelve las que acaba de conseguir (sin insertar aún en BD).
 */
export function evaluateNewAchievements(
  stats: UserGymStats,
  earned: Set<string>,
): MedalDefinition[] {
  const allMedals = generateMedalDefinitions(30)
  const newMedals: MedalDefinition[] = []

  for (const medal of allMedals) {
    if (earned.has(medal.key)) continue

    let stat = 0
    switch (medal.category) {
      case 'volume':                   stat = stats.gymBlocksCompleted; break
      case 'difficulty_principiante':  stat = stats.gymBlocksByDifficulty.principiante; break
      case 'difficulty_novato':        stat = stats.gymBlocksByDifficulty.novato; break
      case 'difficulty_medio':         stat = stats.gymBlocksByDifficulty.medio; break
      case 'difficulty_avanzado':      stat = stats.gymBlocksByDifficulty.avanzado; break
      case 'difficulty_experimentado': stat = stats.gymBlocksByDifficulty.experimentado; break
      case 'difficulty_elite':         stat = stats.gymBlocksByDifficulty.elite; break
      case 'difficulty_profesional':   stat = stats.gymBlocksByDifficulty.profesional; break
      case 'flash':                    stat = stats.gymFlashes; break
      case 'consistency':              stat = stats.activeDaysThisMonth; break
      case 'explorer':                 stat = stats.distinctGymsWithCompletion; break
    }

    if (stat >= medal.threshold) newMedals.push(medal)
  }

  return newMedals
}

/**
 * Función principal a llamar desde log-attempt.tsx tras guardar un intento.
 * 1. Obtiene las stats del usuario via RPC.
 * 2. Compara con medallas ya obtenidas.
 * 3. Inserta las nuevas en `achievements` y en `activity_feed`.
 * 4. Devuelve las MedalDefinition nuevas para mostrar el toast.
 */
export async function evaluateAchievements(userId: string): Promise<MedalDefinition[]> {
  // Obtener stats del usuario (solo bloques de gym)
  const { data: rawStats, error: statsError } = await supabase
    .rpc('get_user_gym_stats', { p_user_id: userId })

  if (statsError || !rawStats) {
    console.warn('[achievements] Error obteniendo stats:', statsError)
    return []
  }

  const stats = rawStats as UserGymStats

  // Medallas ya obtenidas (permanentes + constancia del mes actual)
  const { data: earnedRows } = await supabase
    .from('achievements')
    .select('medal_key')
    .eq('user_id', userId)

  const earned = new Set(
    (earnedRows ?? []).map((r: { medal_key: string }) => r.medal_key)
  )

  const newMedals = evaluateNewAchievements(stats, earned)
  if (newMedals.length === 0) return []

  // Bulk insert — recuperar los IDs para el activity_feed
  const { data: inserted, error: insertError } = await supabase
    .from('achievements')
    .insert(
      newMedals.map(m => ({
        user_id:   userId,
        medal_key: m.key,
        category:  m.category,
        tier:      m.tier,
        points:    m.points,
      }))
    )
    .select('id, medal_key')

  if (insertError) {
    console.warn('[achievements] Error insertando medallas:', insertError)
    return []
  }

  // Insertar en feed de actividad con el achievement_id real
  if (inserted && inserted.length > 0) {
    await supabase.from('activity_feed').insert(
      inserted.map((row: { id: string; medal_key: string }) => ({
        user_id:        userId,
        event_type:     'achievement_earned',
        achievement_id: row.id,
      }))
    )
  }

  return newMedals
}


