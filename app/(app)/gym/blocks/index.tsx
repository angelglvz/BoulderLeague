import { useState, useCallback, useMemo } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, ScrollView, Modal,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { supabase } from '../../../../lib/supabase'
import { fetchBlockAvgRatings } from '../../../../lib/ratings'
import { useSession } from '../../../../hooks'
import { useTheme } from '../../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../../constants'
import { Icon, BlockCard } from '../../../../components'

type StatusFilter = 'active' | 'inactive'

const DIFFICULTIES = [
  { value: 'principiante', label: 'Principiante', color: '#AAAAAA' },
  { value: 'novato',       label: 'Novato',       color: '#4CAF50' },
  { value: 'medio',        label: 'Medio',        color: '#2196F3' },
  { value: 'avanzado',     label: 'Avanzado',     color: '#FFC107' },
  { value: 'experimentado',label: 'Experimentado',color: '#FF9800' },
  { value: 'elite',        label: 'Élite',        color: '#F44336' },
  { value: 'profesional',  label: 'Profesional',  color: '#9C27B0' },
]

const STYLES_OPTIONS = [
  'Vertical', 'Placa', 'Desplome', 'Regletas',
  'Romos', 'Talones', 'Empeines', 'Dinámicos',
]

interface Block {
  id: string; identifier: string; difficulty: string
  photo_url: string; color?: string | null; sector?: string | null
  is_active: boolean; created_at?: string | null
}

export default function GymBlocksScreen() {
  const router = useRouter()
  const { user } = useSession()
  const { colors } = useTheme()

  const [blocks, setBlocks] = useState<Block[]>([])
  const [avgRatings, setAvgRatings] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [activeCount, setActiveCount] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  // Filtros
  const [filterDiffs, setFilterDiffs] = useState<Set<string>>(new Set())
  const [filterStyles, setFilterStyles] = useState<Set<string>>(new Set())
  const [filterSections, setFilterSections] = useState<Set<string>>(new Set())

  const fetchBlocks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data }, { count }] = await Promise.all([
      supabase.from('blocks').select('*')
        .eq('gym_id', user.id)
        .eq('is_active', statusFilter === 'active')
        .order('created_at', { ascending: false }),
      supabase.from('blocks').select('id', { count: 'exact', head: true })
        .eq('gym_id', user.id).eq('is_active', true),
    ])
    setBlocks(data ?? [])
    setActiveCount(count ?? 0)
    if (data && data.length > 0) {
      const ratings = await fetchBlockAvgRatings(data.map((b: Block) => b.id))
      setAvgRatings(ratings)
    }
    setLoading(false)
  }, [user, statusFilter])

  useFocusEffect(useCallback(() => { fetchBlocks() }, [fetchBlocks]))

  // Secciones únicas
  const availableSections = useMemo(() => {
    const set = new Set<string>()
    blocks.forEach(b => { if (b.sector) set.add(b.sector) })
    return Array.from(set).sort()
  }, [blocks])

  // Filtrado en cliente
  const filteredBlocks = useMemo(() => {
    return blocks.filter(b => {
      if (filterDiffs.size > 0 && !filterDiffs.has(b.difficulty)) return false
      if (filterStyles.size > 0) {
        const bs = (b.color ?? '').split(', ')
        if (!bs.some(s => filterStyles.has(s))) return false
      }
      if (filterSections.size > 0 && !filterSections.has(b.sector ?? '')) return false
      return true
    })
  }, [blocks, filterDiffs, filterStyles, filterSections])

  const activeFilters = filterDiffs.size + filterStyles.size + filterSections.size

  function toggleSet(set: Set<string>, value: string): Set<string> {
    const next = new Set(set)
    next.has(value) ? next.delete(value) : next.add(value)
    return next
  }

  function clearFilters() {
    setFilterDiffs(new Set())
    setFilterStyles(new Set())
    setFilterSections(new Set())
  }

  async function handleDeactivate(block: Block) {
    Alert.alert(
      'Desactivar bloque',
      'Este bloque se desactivará. Seguirá visible en el historial de los usuarios que lo escalaron.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar', style: 'destructive',
          onPress: async () => {
            await supabase.from('blocks').update({ is_active: false }).eq('id', block.id)
            fetchBlocks()
          },
        },
      ]
    )
  }

  async function handleReactivate(block: Block) {
    if (activeCount >= 100) {
      Alert.alert('Límite alcanzado', 'Tienes 100 bloques activos. Desactiva uno antes de reactivar este.')
      return
    }
    await supabase.from('blocks').update({ is_active: true }).eq('id', block.id)
    fetchBlocks()
  }

  const atLimit = activeCount >= 100
  const blockPct = Math.min(activeCount / 100, 1)
  const nearLimit = activeCount >= 90

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Bloques</Text>
        <View style={styles.headerRight}>
          {/* Filtros */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: activeFilters > 0 ? colors.primary : colors.border }]}
            onPress={() => setShowFilters(true)} activeOpacity={0.8}
          >
            <Icon name="options-outline" size={18} color={activeFilters > 0 ? colors.primary : colors.textSecondary} />
            {activeFilters > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFilters}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Añadir */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: atLimit ? colors.surfaceAlt : colors.primary, borderColor: colors.border }]}
            onPress={() => !atLimit && router.push('/(app)/gym/blocks/add')}
            activeOpacity={atLimit ? 1 : 0.8}
          >
            <Icon name="add-outline" size={20} color={atLimit ? colors.textMuted : colors.textInverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contador con barra */}
      <View style={[styles.counterRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt, flex: 1 }]}>
          <View style={[styles.barFill, { width: `${blockPct * 100}%` as any, backgroundColor: nearLimit ? colors.warning : colors.primary }]} />
        </View>
        <Text style={[styles.counterText, { color: nearLimit ? colors.warning : colors.textSecondary }]}>
          {activeCount}/100 activos
        </Text>
      </View>

      {/* Tabs activos/inactivos */}
      <View style={[styles.statusRow, { borderBottomColor: colors.border }]}>
        {(['active', 'inactive'] as StatusFilter[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.statusTab, statusFilter === s && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setStatusFilter(s)} activeOpacity={0.8}
          >
            <Text style={[styles.statusTabText, { color: statusFilter === s ? colors.primary : colors.textMuted }]}>
              {s === 'active' ? 'Activos' : 'Inactivos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : filteredBlocks.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="grid-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {blocks.length === 0
              ? statusFilter === 'active' ? 'No hay bloques activos' : 'No hay bloques inactivos'
              : 'Sin resultados'}
          </Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            {blocks.length === 0 && statusFilter === 'active' ? 'Añade tu primer bloque con el botón +' : activeFilters > 0 ? 'Prueba a cambiar los filtros' : ''}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBlocks}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.blockRow}>
              <View style={{ flex: 1 }}>
                <BlockCard block={item as any} onPress={() => router.push(`/(app)/blocks/${item.id}`)} avgRating={avgRatings[item.id] ?? null} />
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => item.is_active ? handleDeactivate(item) : handleReactivate(item)}
                activeOpacity={0.8}
              >
                <Icon
                  name={item.is_active ? 'eye-off-outline' : 'refresh-outline'}
                  size={18}
                  color={item.is_active ? colors.error : colors.success}
                />
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}

      {/* ── Modal filtros ── */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.filterSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.filterSheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filterSheetTitle, { color: colors.textPrimary }]}>Filtros</Text>
              <View style={styles.filterSheetActions}>
                {activeFilters > 0 && (
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={[styles.clearText, { color: colors.primary }]}>Limpiar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Icon name="close-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterBody}>
              {/* Dificultad */}
              <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Dificultad</Text>
              <View style={styles.filterChips}>
                {DIFFICULTIES.map(d => {
                  const sel = filterDiffs.has(d.value)
                  return (
                    <TouchableOpacity
                      key={d.value}
                      style={[styles.filterChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, sel && { backgroundColor: d.color + '22', borderColor: d.color }]}
                      onPress={() => setFilterDiffs(prev => toggleSet(prev, d.value))} activeOpacity={0.8}
                    >
                      <View style={[styles.diffDot, { backgroundColor: d.color }]} />
                      <Text style={[styles.filterChipText, { color: sel ? d.color : colors.textSecondary }]}>{d.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Estilo */}
              <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Estilo</Text>
              <View style={styles.filterChips}>
                {STYLES_OPTIONS.map(s => {
                  const sel = filterStyles.has(s)
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.filterChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, sel && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
                      onPress={() => setFilterStyles(prev => toggleSet(prev, s))} activeOpacity={0.8}
                    >
                      <Text style={[styles.filterChipText, { color: sel ? colors.primary : colors.textSecondary }]}>{s}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Sección */}
              {availableSections.length > 0 && (
                <>
                  <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Sección</Text>
                  <View style={styles.filterChips}>
                    {availableSections.map(s => {
                      const sel = filterSections.has(s)
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[styles.filterChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, sel && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
                          onPress={() => setFilterSections(prev => toggleSet(prev, s))} activeOpacity={0.8}
                        >
                          <Text style={[styles.filterChipText, { color: sel ? colors.primary : colors.textSecondary }]}>{s}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowFilters(false)} activeOpacity={0.8}
            >
              <Text style={[styles.applyBtnText, { color: colors.textInverse }]}>
                {filteredBlocks.length === blocks.length
                  ? 'Ver todos los bloques'
                  : `Ver ${filteredBlocks.length} bloque${filteredBlocks.length !== 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  headerRight: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { position: 'relative', width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  barTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  counterText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, minWidth: 90, textAlign: 'right' },
  statusRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  statusTab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  statusTabText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  loader: { marginTop: spacing['2xl'] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold, textAlign: 'center' },
  emptySub: { fontSize: typography.size.sm, textAlign: 'center' },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // Modal filtros
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '80%' },
  filterSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  filterSheetTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  filterSheetActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clearText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  filterBody: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
  filterGroupLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, borderWidth: 1, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  filterChipText: { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  diffDot: { width: 8, height: 8, borderRadius: 4 },
  applyBtn: { margin: spacing.lg, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  applyBtnText: { fontSize: typography.size.md, fontWeight: typography.weight.bold },
})

