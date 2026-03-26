import { supabase } from './supabase'

/**
 * Devuelve un mapa blockId → media de stars (valor raw, sin redondear).
 * El redondeo (Math.round) se hace en el componente para mayor flexibilidad.
 */
export async function fetchBlockAvgRatings(
  blockIds: string[]
): Promise<Record<string, number>> {
  if (blockIds.length === 0) return {}

  const { data } = await supabase
    .from('block_ratings')
    .select('block_id, stars')
    .in('block_id', blockIds)

  if (!data || data.length === 0) return {}

  const acc: Record<string, { total: number; count: number }> = {}
  for (const r of data) {
    if (!acc[r.block_id]) acc[r.block_id] = { total: 0, count: 0 }
    acc[r.block_id].total += r.stars
    acc[r.block_id].count += 1
  }

  const result: Record<string, number> = {}
  for (const [id, { total, count }] of Object.entries(acc)) {
    result[id] = total / count
  }
  return result
}

