/**
 * stats.tsx — Estadísticas mensuales del rocódromo
 * Ruta: /(app)/gym/stats
 *
 * Muestra KPIs por mes (usuarios activos, bloques resueltos, intentos totales)
 * con comparativa vs mes anterior y evolución de los últimos 6 meses.
 * Toda la agregación es client-side sobre la tabla `attempts`.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSession } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../constants'
import { Icon } from '../../../components'

// ── Constantes ────────────────────────────────────────────────────────────────

const MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const DIFFICULTIES: { value: string; label: string; color: string }[] = [
  { value: 'principiante',  label: 'Principiante',  color: '#AAAAAA' },
  { value: 'novato',        label: 'Novato',        color: '#4CAF50' },
  { value: 'medio',         label: 'Medio',         color: '#2196F3' },
  { value: 'avanzado',      label: 'Avanzado',      color: '#FFC107' },
  { value: 'experimentado', label: 'Experimentado', color: '#FF9800' },
  { value: 'elite',         label: 'Élite',         color: '#F44336' },
  { value: 'profesional',   label: 'Profesional',   color: '#9C27B0' },
]

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface RawAttempt {
  user_id: string
  block_id: string
  result: string
  updated_at: string | null
}

interface MonthStats {
  year: number
  month: number  // 0-indexed
  uniqueUsers: number
  resolvedBlocks: number  // bloques distintos encadenados al menos una vez
  totalAttempts: number
  byDifficulty: Record<string, number>  // difficulty → nº de bloques distintos resueltos
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(year: number, month: number) { return `${year}-${month}` }

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

function aggregateMonth(
  attempts: RawAttempt[],
  blockDiffMap: Record<string, string>,
  year: number,
  month: number,
): MonthStats {
  const start = new Date(year, month, 1).getTime()
  const end   = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()

  const monthAttempts = attempts.filter(a => {
    const t = a.updated_at ? new Date(a.updated_at).getTime() : 0
    return t >= start && t <= end
  })

  const uniqueUsers   = new Set(monthAttempts.map(a => a.user_id)).size
  const totalAttempts = monthAttempts.length

  const resolved = monthAttempts.filter(a => a.result !== 'not_completed')
  const resolvedBlocks = new Set(resolved.map(a => a.block_id)).size

  // Bloques resueltos por dificultad
  const byDiff: Record<string, Set<string>> = {}
  resolved.forEach(a => {
    const diff = blockDiffMap[a.block_id]
    if (!diff) return
    if (!byDiff[diff]) byDiff[diff] = new Set()
    byDiff[diff].add(a.block_id)
  })
  const byDifficulty: Record<string, number> = {}
  Object.entries(byDiff).forEach(([d, set]) => { byDifficulty[d] = set.size })

  return { year, month, uniqueUsers, resolvedBlocks, totalAttempts, byDifficulty }
}

function deltaLabel(curr: number, prev: number): { text: string; color: string; icon: string } {
  if (prev === 0) {
    return curr > 0
      ? { text: `+${curr} vs anterior`, color: '#22C55E', icon: 'trending-up-outline' }
      : { text: 'Sin datos previos', color: '', icon: '' }
  }
  const pct = Math.round(((curr - prev) / prev) * 100)
  if (pct === 0) return { text: 'Igual que el mes anterior', color: '', icon: '' }
  const up = pct > 0
  return {
    text: `${up ? '+' : ''}${pct}% vs mes anterior`,
    color: up ? '#22C55E' : '#EF4444',
    icon: up ? 'trending-up-outline' : 'trending-down-outline',
  }
}

// ── Pantalla ──────────────────────────────────────────────────────────────────

export default function GymStatsScreen() {
  const router = useRouter()
  const { user } = useSession()
  const { colors } = useTheme()

  const now = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  // Caché de todos los intentos de los últimos 12 meses (se carga una sola vez)
  const [allAttempts,  setAllAttempts]  = useState<RawAttempt[]>([])
  const [blockDiffMap, setBlockDiffMap] = useState<Record<string, string>>({})

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    // 1. Todos los bloques del gym (activos e inactivos para datos históricos)
    const { data: blocksData, error: blocksErr } = await supabase
      .from('blocks')
      .select('id, difficulty')
      .eq('gym_id', user.id)
      .eq('owner_type', 'gym')

    if (blocksErr) {
      setError('No se pudieron cargar los datos. Comprueba tu conexión.')
      setLoading(false)
      return
    }

    const blockIds = (blocksData ?? []).map((b: any) => b.id)
    const diffMap: Record<string, string> = {}
    ;(blocksData ?? []).forEach((b: any) => { if (b.difficulty) diffMap[b.id] = b.difficulty })
    setBlockDiffMap(diffMap)

    if (blockIds.length === 0) {
      setAllAttempts([])
      setLoading(false)
      return
    }

    // 2. Intentos de los últimos 12 meses
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()
    const { data: attemptsData, error: attemptsErr } = await supabase
      .from('attempts')
      .select('user_id, block_id, result, updated_at')
      .in('block_id', blockIds)
      .gte('updated_at', twelveMonthsAgo)

    if (attemptsErr) {
      setError('No se pudieron cargar los intentos.')
      setLoading(false)
      return
    }

    setAllAttempts((attemptsData ?? []) as RawAttempt[])
    setLoading(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  // ── Datos calculados ───────────────────────────────────────────────────────

  // Mes seleccionado y el anterior (para comparativa)
  const curr = aggregateMonth(allAttempts, blockDiffMap, selYear, selMonth)
  const { year: prevY, month: prevM } = addMonths(selYear, selMonth, -1)
  const prev = aggregateMonth(allAttempts, blockDiffMap, prevY, prevM)

  // Últimos 6 meses para el gráfico de evolución
  const trendMonths: MonthStats[] = Array.from({ length: 6 }).map((_, i) => {
    const { year, month } = addMonths(selYear, selMonth, i - 5)
    return aggregateMonth(allAttempts, blockDiffMap, year, month)
  })

  // Altura de barras proporcional (px)
  const maxResolved = Math.max(...trendMonths.map(m => m.resolvedBlocks), 1)
  const BAR_MAX_H = 72

  // Navegación
  const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth()
  const minDate = addMonths(now.getFullYear(), now.getMonth(), -11)
  const isOldestMonth = selYear === minDate.year && selMonth === minDate.month

  function prevMonth() {
    if (isOldestMonth) return
    const { year, month } = addMonths(selYear, selMonth, -1)
    setSelYear(year); setSelMonth(month)
  }
  function nextMonth() {
    if (isCurrentMonth) return
    const { year, month } = addMonths(selYear, selMonth, +1)
    setSelYear(year); setSelMonth(month)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando estadísticas…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Icon name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={loadData}>
            <Text style={[styles.retryText, { color: colors.textInverse }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const hasData = allAttempts.length > 0

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Estadísticas</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Selector de mes ── */}
        <View style={[styles.monthSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={prevMonth}
            disabled={isOldestMonth}
            style={[styles.navBtn, isOldestMonth && styles.navBtnDisabled]}
            activeOpacity={0.7}
          >
            <Icon name="chevron-back-outline" size={22} color={isOldestMonth ? colors.textMuted : colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
            {MONTHS_FULL[selMonth]} {selYear}
          </Text>
          <TouchableOpacity
            onPress={nextMonth}
            disabled={isCurrentMonth}
            style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]}
            activeOpacity={0.7}
          >
            <Icon name="chevron-forward-outline" size={22} color={isCurrentMonth ? colors.textMuted : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {!hasData ? (
          /* ── Estado vacío ── */
          <View style={styles.empty}>
            <Icon name="bar-chart-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Sin datos todavía</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Las estadísticas aparecerán cuando los usuarios registren intentos en tus bloques.
            </Text>
          </View>
        ) : (
          <>
            {/* ── KPIs ── */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>RESUMEN DEL MES</Text>
            <View style={styles.kpiRow}>
              <KPICard
                label="Usuarios activos"
                value={curr.uniqueUsers}
                delta={deltaLabel(curr.uniqueUsers, prev.uniqueUsers)}
                colors={colors}
              />
              <KPICard
                label="Bloques resueltos"
                value={curr.resolvedBlocks}
                delta={deltaLabel(curr.resolvedBlocks, prev.resolvedBlocks)}
                colors={colors}
              />
              <KPICard
                label="Intentos totales"
                value={curr.totalAttempts}
                delta={deltaLabel(curr.totalAttempts, prev.totalAttempts)}
                colors={colors}
              />
            </View>

            {/* ── Evolución 6 meses ── */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>EVOLUCIÓN (últimos 6 meses)</Text>
            <View style={[styles.trendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.trendChart}>
                {trendMonths.map((m, i) => {
                  const isSelected = m.year === selYear && m.month === selMonth
                  const barH = maxResolved === 0 ? 2 : Math.max(2, (m.resolvedBlocks / maxResolved) * BAR_MAX_H)
                  return (
                    <TouchableOpacity
                      key={monthKey(m.year, m.month)}
                      style={styles.trendBarCol}
                      onPress={() => { setSelYear(m.year); setSelMonth(m.month) }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.trendValue, { color: isSelected ? colors.primary : colors.textMuted }]}>
                        {m.resolvedBlocks > 0 ? m.resolvedBlocks : ''}
                      </Text>
                      <View style={styles.trendBarTrack}>
                        <View style={[
                          styles.trendBarFill,
                          { height: barH, backgroundColor: isSelected ? colors.primary : colors.primaryMuted },
                        ]} />
                      </View>
                      <Text style={[styles.trendBarLabel, { color: isSelected ? colors.primary : colors.textMuted }]}>
                        {MONTHS_SHORT[m.month]}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              <Text style={[styles.trendCaption, { color: colors.textMuted }]}>
                Toca una barra para ver ese mes en detalle
              </Text>
            </View>

            {/* ── Desglose por dificultad ── */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>BLOQUES RESUELTOS POR DIFICULTAD</Text>
            <View style={[styles.diffCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {curr.resolvedBlocks === 0 ? (
                <Text style={[styles.noDataText, { color: colors.textMuted }]}>
                  Sin bloques resueltos este mes
                </Text>
              ) : (
                DIFFICULTIES.map(d => {
                  const val = curr.byDifficulty[d.value] ?? 0
                  const maxVal = Math.max(...DIFFICULTIES.map(x => curr.byDifficulty[x.value] ?? 0), 1)
                  const pct = (val / maxVal) * 100
                  return (
                    <View key={d.value} style={styles.diffRow}>
                      <View style={[styles.diffDot, { backgroundColor: d.color }]} />
                      <Text style={[styles.diffLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                        {d.label}
                      </Text>
                      <View style={[styles.diffBarTrack, { backgroundColor: colors.surfaceAlt }]}>
                        <View style={[
                          styles.diffBarFill,
                          { width: `${pct}%`, backgroundColor: d.color + 'CC' },
                        ]} />
                      </View>
                      <Text style={[styles.diffValue, { color: val > 0 ? colors.textPrimary : colors.textMuted }]}>
                        {val}
                      </Text>
                    </View>
                  )
                })
              )}
            </View>

            {/* ── Nota sobre datos ── */}
            <Text style={[styles.footnote, { color: colors.textMuted }]}>
              Los datos se actualizan en tiempo real. Los bloques inactivos también cuentan en el historial.
            </Text>
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Sub-componente KPI Card ────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  delta,
  colors,
}: {
  label: string
  value: number
  delta: { text: string; color: string; icon: string }
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={[kpiStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[kpiStyles.value, { color: colors.primary }]}>{value}</Text>
      <Text style={[kpiStyles.label, { color: colors.textSecondary }]} numberOfLines={2}>{label}</Text>
      {delta.text && delta.color ? (
        <View style={kpiStyles.deltaRow}>
          {delta.icon ? (
            <Icon name={delta.icon as any} size={12} color={delta.color} />
          ) : null}
          <Text style={[kpiStyles.deltaText, { color: delta.color }]} numberOfLines={2}>
            {delta.text}
          </Text>
        </View>
      ) : (
        delta.text ? (
          <Text style={[kpiStyles.deltaText, { color: colors.textMuted }]} numberOfLines={2}>
            {delta.text}
          </Text>
        ) : null
      )}
    </View>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1 },
  headerRow:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm,
  },
  backBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60 },
  backText:       { fontSize: typography.size.md },
  title:          { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  loadingText:    { fontSize: typography.size.md },
  errorText:      { fontSize: typography.size.md, textAlign: 'center' },
  retryBtn:       { borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, marginTop: spacing.sm },
  retryText:      { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  scroll:         { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },

  // Selector de mes
  monthSelector:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.lg, borderWidth: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
  },
  navBtn:         { padding: spacing.xs },
  navBtnDisabled: { opacity: 0.3 },
  monthLabel:     { fontSize: typography.size.lg, fontWeight: typography.weight.bold },

  // Sección
  sectionLabel:   {
    fontSize: typography.size.xs, fontWeight: typography.weight.semibold,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: spacing.xs,
  },

  // KPIs
  kpiRow:         { flexDirection: 'row', gap: spacing.sm },

  // Trend chart
  trendCard:      { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  trendChart:     { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 4 },
  trendBarCol:    { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  trendBarTrack:  { width: '100%', alignItems: 'center', justifyContent: 'flex-end', height: 72 },
  trendBarFill:   { width: '60%', borderRadius: 3, minHeight: 2 },
  trendValue:     { fontSize: 9, fontWeight: typography.weight.bold, height: 14 },
  trendBarLabel:  { fontSize: 9, fontWeight: typography.weight.medium },
  trendCaption:   { fontSize: typography.size.xs, textAlign: 'center', marginTop: spacing.sm },

  // Dificultad
  diffCard:       { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  diffRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  diffDot:        { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  diffLabel:      { fontSize: typography.size.sm, width: 100, flexShrink: 0 },
  diffBarTrack:   { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  diffBarFill:    { height: 8, borderRadius: 4 },
  diffValue:      { fontSize: typography.size.sm, fontWeight: typography.weight.bold, width: 24, textAlign: 'right' },
  noDataText:     { fontSize: typography.size.sm, textAlign: 'center', paddingVertical: spacing.md },

  // Estado vacío
  empty:          { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  emptyTitle:     { fontSize: typography.size.lg, fontWeight: typography.weight.semibold },
  emptySubtitle:  { fontSize: typography.size.md, textAlign: 'center', lineHeight: 22 },

  // Nota
  footnote:       { fontSize: typography.size.xs, textAlign: 'center', paddingHorizontal: spacing.md },
})

const kpiStyles = StyleSheet.create({
  card:       { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.sm, gap: 2, minHeight: 90 },
  value:      { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  label:      { fontSize: typography.size.xs, lineHeight: 14 },
  deltaRow:   { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  deltaText:  { fontSize: 9, fontWeight: typography.weight.semibold, flex: 1, lineHeight: 12 },
})

