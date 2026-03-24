import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../../../hooks'
import { supabase } from '../../../../lib/supabase'
import { colors, typography, spacing, radius } from '../../../../constants'
import type { League } from '../../../../types'

// ── Tipos locales ─────────────────────────────────────────────────────────────
interface RankingEntry {
  userId: string
  name: string
  totalScore: number
  blocksCompleted: number
  flashes: number
  difficultySum: number
  totalGoes: number
  position: number
}

// ── Lógica de desempate ────────────────────────────────────────────────────────
// 1. Mayor puntuación total
// 2. Mayor nº de bloques encadenados
// 3. Mayor nº de flashes
// 4. Mayor suma de dificultades
// 5. Menor nº total de pegues
function sortRanking(entries: Omit<RankingEntry, 'position'>[]): RankingEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    if (b.blocksCompleted !== a.blocksCompleted) return b.blocksCompleted - a.blocksCompleted
    if (b.flashes !== a.flashes) return b.flashes - a.flashes
    if (b.difficultySum !== a.difficultySum) return b.difficultySum - a.difficultySum
    return a.totalGoes - b.totalGoes
  })

  // Asignar posición (empates técnicos comparten puesto)
  let pos = 1
  return sorted.map((entry, i) => {
    if (i > 0) {
      const prev = sorted[i - 1]
      const isTied =
        entry.totalScore === prev.totalScore &&
        entry.blocksCompleted === prev.blocksCompleted &&
        entry.flashes === prev.flashes &&
        entry.difficultySum === prev.difficultySum &&
        entry.totalGoes === prev.totalGoes
      if (!isTied) pos = i + 1
    }
    return { ...entry, position: pos }
  })
}

const DIFFICULTY_WEIGHT: Record<string, number> = {
  principiante: 1, novato: 2, medio: 3, avanzado: 4,
  experimentado: 5, elite: 6, profesional: 7,
}

const POSITION_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

// ── Pantalla ──────────────────────────────────────────────────────────────────
export default function RankingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useSession()

  const [league, setLeague] = useState<League | null>(null)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  // ── Calcular si el usuario puede ver el ranking ──────────────────────────
  function canViewRanking(l: League): boolean {
    if (!user) return false
    if (user.id === l.creator_id) return true
    if (l.ranking_visible_during) return true
    if (l.end_date && new Date() > new Date(l.end_date + 'T23:59:59')) return true
    return false
  }

  // ── Carga y cálculo del ranking ──────────────────────────────────────────
  const buildRanking = useCallback(async (leagueData: League) => {
    // 1. Bloques de la liga
    const { data: blocks } = await supabase
      .from('blocks')
      .select('id, difficulty')
      .eq('league_id', leagueData.id)

    if (!blocks || blocks.length === 0) {
      setRanking([])
      return
    }

    const blockIds = blocks.map(b => b.id)
    const diffMap: Record<string, string | null> = {}
    blocks.forEach(b => { diffMap[b.id] = b.difficulty })

    // 2. Participantes
    const { data: participants } = await supabase
      .from('league_participants')
      .select('user_id, users(name)')
      .eq('league_id', leagueData.id)

    if (!participants || participants.length === 0) {
      setRanking([])
      return
    }

    // 3. Intentos de todos los participantes en estos bloques
    const { data: attempts } = await supabase
      .from('attempts')
      .select('user_id, block_id, number_of_goes, score')
      .in('block_id', blockIds)

    const attemptsMap: Record<string, typeof attempts> = {}
    participants.forEach(p => { attemptsMap[p.user_id] = [] })
    attempts?.forEach(a => {
      if (attemptsMap[a.user_id]) attemptsMap[a.user_id]!.push(a)
    })

    // 4. Construir entradas de ranking
    const entries: Omit<RankingEntry, 'position'>[] = participants.map(p => {
      const userAttempts = attemptsMap[p.user_id] ?? []
      const completed = userAttempts.filter(a => a.number_of_goes >= 1)

      const totalScore = userAttempts.reduce((sum, a) => sum + (a.score ?? 0), 0)
      const blocksCompleted = completed.length
      const flashes = completed.filter(a => a.number_of_goes === 1).length
      const difficultySum = completed.reduce((sum, a) => {
        const d = diffMap[a.block_id]
        return sum + (d ? (DIFFICULTY_WEIGHT[d] ?? 0) : 0)
      }, 0)
      const totalGoes = completed.reduce((sum, a) => sum + a.number_of_goes, 0)

      // Nombre del usuario (join devuelve objeto o array)
      const userObj = p.users as unknown as { name: string } | { name: string }[] | null
      const name = Array.isArray(userObj)
        ? (userObj[0]?.name ?? 'Sin nombre')
        : (userObj?.name ?? 'Sin nombre')

      return { userId: p.user_id, name, totalScore, blocksCompleted, flashes, difficultySum, totalGoes }
    })

    setRanking(sortRanking(entries))
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', id)
      .single()

    if (leagueData) {
      setLeague(leagueData)
      await buildRanking(leagueData)
    }
    setLoading(false)
  }, [id, buildRanking])

  useEffect(() => {
    if (id) loadData()
  }, [id, loadData])

  // ── Supabase Realtime ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !league) return
    if (!canViewRanking(league)) return

    const channel = supabase
      .channel(`ranking-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attempts' },
        () => { buildRanking(league) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, league, buildRanking])

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!league) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Liguilla no encontrada</Text>
      </View>
    )
  }

  // Pantalla de bloqueo si el usuario no tiene permiso
  if (!canViewRanking(league)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace(`/(app)/leagues/${id}`)}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.locked}>
          <Text style={styles.lockedEmoji}>🔒</Text>
          <Text style={styles.lockedTitle}>Ranking bloqueado</Text>
          <Text style={styles.lockedSubtitle}>
            El creador ha decidido que el ranking se revelará cuando finalice la liguilla.
          </Text>
          {league.end_date && (
            <Text style={styles.lockedDate}>
              Disponible a partir del{' '}
              {new Date(league.end_date + 'T12:00:00').toLocaleDateString('es-ES', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          )}
        </View>
      </SafeAreaView>
    )
  }

  const isFinished = !!league.end_date && new Date() > new Date(league.end_date + 'T23:59:59')

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={ranking}
        keyExtractor={item => item.userId}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.replace(`/(app)/leagues/${id}`)}>
                <Text style={styles.backText}>← Volver</Text>
              </TouchableOpacity>
              <Text style={styles.title}>🏆 Ranking</Text>
              <Text style={styles.leagueName}>{league.name}</Text>
              {isFinished && (
                <View style={styles.finishedBadge}>
                  <Text style={styles.finishedBadgeText}>🏁 Liguilla finalizada — resultado definitivo</Text>
                </View>
              )}
              {!league.ranking_visible_during && !isFinished && (
                <View style={styles.visibilityBadge}>
                  <Text style={styles.visibilityBadgeText}>👁 Solo tú ves el ranking hasta el final</Text>
                </View>
              )}
            </View>

            {ranking.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyText}>Aún no hay resultados registrados</Text>
                <Text style={styles.emptySubtext}>El ranking aparecerá cuando los participantes registren sus primeros intentos</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.userId === user?.id
          const emoji = POSITION_EMOJI[item.position] ?? `${item.position}º`
          return (
            <View style={[styles.row, isMe && styles.rowMe]}>
              <Text style={styles.position}>{emoji}</Text>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
                  {item.name}{isMe ? ' (tú)' : ''}
                </Text>
                <Text style={styles.rowStats}>
                  {item.blocksCompleted} bloques · {item.flashes} flash
                  {item.totalGoes > 0 ? ` · ${item.totalGoes} pegues` : ''}
                </Text>
              </View>
              <Text style={[styles.rowScore, isMe && styles.rowScoreMe]}>
                {item.totalScore} pts
              </Text>
            </View>
          )
        }}
        ListFooterComponent={
          ranking.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isFinished ? '🏁 Ranking final' : '🔄 Se actualiza en tiempo real'}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.background },
  centered:           { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  content:            { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header:             { paddingTop: spacing.xl, marginBottom: spacing.lg },
  backText:           { color: colors.textSecondary, fontSize: typography.size.md, marginBottom: spacing.md },
  title:              { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, color: colors.textPrimary },
  leagueName:         { fontSize: typography.size.md, color: colors.textMuted, marginTop: spacing.xs },
  finishedBadge:      { marginTop: spacing.sm, backgroundColor: colors.error + '18', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.error + '40' },
  finishedBadgeText:  { fontSize: typography.size.sm, color: colors.error, fontWeight: typography.weight.semibold },
  visibilityBadge:    { marginTop: spacing.sm, backgroundColor: colors.primary + '18', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.primary + '40' },
  visibilityBadgeText:{ fontSize: typography.size.sm, color: colors.primary, fontWeight: typography.weight.semibold },
  row:                { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  rowMe:              { borderColor: colors.primary, backgroundColor: colors.primary + '0C' },
  position:           { fontSize: typography.size.xl, width: 36, textAlign: 'center' },
  rowInfo:            { flex: 1, gap: 2 },
  rowName:            { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.textPrimary },
  rowNameMe:          { color: colors.primary },
  rowStats:           { fontSize: typography.size.xs, color: colors.textMuted },
  rowScore:           { fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.textSecondary },
  rowScoreMe:         { color: colors.primary },
  empty:              { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyEmoji:         { fontSize: 48 },
  emptyText:          { fontSize: typography.size.md, color: colors.textSecondary, fontWeight: typography.weight.medium },
  emptySubtext:       { fontSize: typography.size.sm, color: colors.textMuted, textAlign: 'center' },
  footer:             { alignItems: 'center', paddingTop: spacing.md },
  footerText:         { fontSize: typography.size.xs, color: colors.textMuted },
  locked:             { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  lockedEmoji:        { fontSize: 64 },
  lockedTitle:        { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, color: colors.textPrimary, textAlign: 'center' },
  lockedSubtitle:     { fontSize: typography.size.md, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  lockedDate:         { fontSize: typography.size.sm, color: colors.primary, fontWeight: typography.weight.semibold, textAlign: 'center' },
  errorText:          { color: colors.error, fontSize: typography.size.md },
})

