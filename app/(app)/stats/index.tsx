import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useSession } from '../../../hooks'
import { useTheme } from '../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../constants'
import { Icon } from '../../../components'
import { DIFFICULTY_LABELS, type BlockDifficulty } from '../../../lib/scoring'

// Orden canónico de dificultades
const DIFFICULTY_ORDER: BlockDifficulty[] = [
  'principiante', 'novato', 'medio', 'avanzado', 'experimentado', 'elite', 'profesional',
]

const GOES_DISPLAY = [
  { key: 'flash',  label: 'Flash' },
  { key: '2',      label: '2 pegues' },
  { key: '3',      label: '3 pegues' },
  { key: '4',      label: '4 pegues' },
  { key: '5',      label: '5 pegues' },
  { key: '+5',     label: '+5 pegues' },
]

interface Attempt {
  block_id: string
  result: string
  number_of_goes: number
  score: number
  blocks?: {
    difficulty: BlockDifficulty
    color: string | null
  }
}

interface Stats {
  totalBlocks: number
  totalFlashes: number
  totalScore: number
  byDifficulty: Record<string, number>
  byGoes: Record<string, number>
  byStyle: Record<string, number>
}

function goesKey(goes: number): string {
  if (goes === 1) return 'flash'
  if (goes >= 6) return '+5'
  return String(goes)
}

function computeStats(attempts: Attempt[]): Stats {
  const byDifficulty: Record<string, number> = {}
  const byGoes: Record<string, number> = {}
  const byStyle: Record<string, number> = {}
  let totalFlashes = 0
  let totalScore = 0

  for (const a of attempts) {
    if (a.result === 'not_completed') continue
    totalScore += a.score

    const diff = a.blocks?.difficulty
    if (diff) byDifficulty[diff] = (byDifficulty[diff] ?? 0) + 1

    const gk = goesKey(a.number_of_goes)
    byGoes[gk] = (byGoes[gk] ?? 0) + 1
    if (gk === 'flash') totalFlashes++

    const styles = (a.blocks?.color ?? '').split(', ').filter(Boolean)
    for (const s of styles) {
      byStyle[s] = (byStyle[s] ?? 0) + 1
    }
  }

  const totalBlocks = attempts.filter(a => a.result !== 'not_completed').length

  return { totalBlocks, totalFlashes, totalScore, byDifficulty, byGoes, byStyle }
}

function HorizontalBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label} numberOfLines={1}>{label}</Text>
      <View style={barStyles.trackWrap}>
        <View style={[barStyles.track]}>
          <View style={[barStyles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={barStyles.value}>{value}</Text>
    </View>
  )
}

const barStyles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label:     { width: 100, fontSize: typography.size.sm, color: '#888' },
  trackWrap: { flex: 1 },
  track:     { height: 10, borderRadius: 5, backgroundColor: 'rgba(128,128,128,0.15)', overflow: 'hidden' },
  fill:      { height: 10, borderRadius: 5 },
  value:     { width: 28, fontSize: typography.size.sm, textAlign: 'right', color: '#888', fontWeight: typography.weight.semibold },
})

export default function StatsScreen() {
  const { user } = useSession()
  const { colors } = useTheme()
  const router = useRouter()

  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadStats()
  }, [user])

  async function loadStats() {
    setLoading(true)
    const { data } = await supabase
      .from('attempts')
      .select('block_id, result, number_of_goes, score, blocks(difficulty, color)')
      .eq('user_id', user!.id)

    setStats(computeStats((data as Attempt[]) ?? []))
    setLoading(false)
  }

  const s = stats

  // Máximos para escalar las barras
  const maxDiff = s ? Math.max(1, ...Object.values(s.byDifficulty)) : 1
  const maxGoes = s ? Math.max(1, ...GOES_DISPLAY.map(g => s.byGoes[g.key] ?? 0)) : 1
  const maxStyle = s ? Math.max(1, ...Object.values(s.byStyle)) : 1

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Mis estadísticas</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['2xl'] }} />
      ) : !s ? null : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Resumen ── */}
          <View style={[styles.summaryRow]}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{s.totalBlocks}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Resueltos</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{s.totalFlashes}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Flash</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{s.totalScore}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Puntos</Text>
            </View>
          </View>

          {/* ── Por dificultad ── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>POR DIFICULTAD</Text>
            <View style={styles.barsSection}>
              {DIFFICULTY_ORDER.map(d => (
                <HorizontalBar
                  key={d}
                  label={DIFFICULTY_LABELS[d]}
                  value={s.byDifficulty[d] ?? 0}
                  max={maxDiff}
                  color={colors.primary}
                />
              ))}
            </View>
          </View>

          {/* ── Por pegues ── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>POR PEGUES</Text>
            <View style={styles.barsSection}>
              {GOES_DISPLAY.map(g => (
                <HorizontalBar
                  key={g.key}
                  label={g.label}
                  value={s.byGoes[g.key] ?? 0}
                  max={maxGoes}
                  color={colors.primary}
                />
              ))}
            </View>
          </View>

          {/* ── Por estilo ── */}
          {Object.keys(s.byStyle).length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>POR ESTILO</Text>
              <View style={styles.barsSection}>
                {Object.entries(s.byStyle)
                  .sort((a, b) => b[1] - a[1])
                  .map(([style, count]) => (
                    <HorizontalBar
                      key={style}
                      label={style}
                      value={count}
                      max={maxStyle}
                      color={colors.primary}
                    />
                  ))}
              </View>
            </View>
          )}

          {s.totalBlocks === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon name="bar-chart-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin datos todavía</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Registra resultados en bloques para ver tus estadísticas
              </Text>
            </View>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:        { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  scroll:       { padding: spacing.lg, gap: spacing.md },
  summaryRow:   { flexDirection: 'row', gap: spacing.sm },
  summaryCard:  { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  summaryValue: { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  summaryLabel: { fontSize: typography.size.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:         { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  cardTitle:    { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  barsSection:  { gap: spacing.sm },
  emptyCard:    { borderRadius: radius.lg, borderWidth: 1, padding: spacing['2xl'], alignItems: 'center', gap: spacing.sm },
  emptyText:    { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  emptySubtext: { fontSize: typography.size.sm, textAlign: 'center', lineHeight: 20 },
})

