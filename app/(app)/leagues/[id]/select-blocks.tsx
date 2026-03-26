/**
 * select-blocks.tsx
 * Pantalla para que el GYM vincule bloques de su catálogo a una liguilla.
 * Ruta: /(app)/leagues/[id]/select-blocks
 */

import { useCallback, useMemo, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useSession } from '../../../../hooks'
import { supabase } from '../../../../lib/supabase'
import { useTheme } from '../../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../../constants'
import { Icon } from '../../../../components'
import type { Block } from '../../../../types'

// ── Constantes compartidas con gym/index.tsx ──────────────────────────────────

const DIFFICULTIES = [
  { value: 'principiante',  label: 'Principiante', color: '#AAAAAA' },
  { value: 'novato',        label: 'Novato',       color: '#4CAF50' },
  { value: 'medio',         label: 'Medio',        color: '#2196F3' },
  { value: 'avanzado',      label: 'Avanzado',     color: '#FFC107' },
  { value: 'experimentado', label: 'Experimentado',color: '#FF9800' },
  { value: 'elite',         label: 'Élite',        color: '#F44336' },
  { value: 'profesional',   label: 'Profesional',  color: '#9C27B0' },
]

const STYLES_OPTIONS = [
  'Vertical', 'Placa', 'Desplome', 'Regletas',
  'Romos', 'Talones', 'Empeines', 'Dinámicos',
]

// ── Pantalla ──────────────────────────────────────────────────────────────────

export default function SelectBlocksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()   // league ID
  const router = useRouter()
  const { user } = useSession()
  const { colors } = useTheme()

  const [blocks, setBlocks]         = useState<Block[]>([])
  const [linkedIds, setLinkedIds]   = useState<Set<string>>(new Set())
  const [loading, setLoading]       = useState(true)
  const [addingId, setAddingId]     = useState<string | null>(null)

  // Filtros
  const [query, setQuery]               = useState('')
  const [filterDiffs, setFilterDiffs]   = useState<Set<string>>(new Set())
  const [filterStyles, setFilterStyles] = useState<Set<string>>(new Set())
  const [filterSectors, setFilterSectors] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters]   = useState(false)

  // ── Carga ──────────────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => { load() }, [id, user?.id]))

  async function load() {
    if (!user?.id || !id) return
    setLoading(true)

    const [{ data: blocksData }, { data: lbData }] = await Promise.all([
      supabase
        .from('blocks')
        .select('*')
        .eq('gym_id', user.id)
        .eq('owner_type', 'gym')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('league_blocks')
        .select('block_id')
        .eq('league_id', id),
    ])

    setBlocks((blocksData as Block[]) ?? [])
    setLinkedIds(new Set((lbData ?? []).map((lb: { block_id: string }) => lb.block_id)))
    setLoading(false)
  }

  // ── Añadir bloque a la liguilla ────────────────────────────────────────────
  async function handleAdd(block: Block) {
    setAddingId(block.id)
    const { error } = await supabase
      .from('league_blocks')
      .insert({ league_id: id, block_id: block.id })

    if (!error) {
      setLinkedIds(prev => new Set(prev).add(block.id))
    }
    setAddingId(null)
  }

  // ── Filtrado en cliente ────────────────────────────────────────────────────
  const availableSectors = useMemo(() => {
    const s = new Set<string>()
    blocks.forEach(b => { if (b.sector) s.add(b.sector) })
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [blocks])

  const filtered = useMemo(() => {
    return blocks.filter(b => {
      if (query.trim() && !b.identifier.toLowerCase().includes(query.trim().toLowerCase())) return false
      if (filterDiffs.size > 0 && !filterDiffs.has(b.difficulty)) return false
      if (filterStyles.size > 0) {
        const styles = (b.color ?? '').split(', ')
        if (!styles.some(s => filterStyles.has(s))) return false
      }
      if (filterSectors.size > 0 && !filterSectors.has(b.sector ?? '')) return false
      return true
    })
  }, [blocks, query, filterDiffs, filterStyles, filterSectors])

  const activeFilters = filterDiffs.size + filterStyles.size + filterSectors.size

  function toggleDiff(v: string) {
    setFilterDiffs(prev => { const s = new Set(prev); s.has(v) ? s.delete(v) : s.add(v); return s })
  }
  function toggleStyle(v: string) {
    setFilterStyles(prev => { const s = new Set(prev); s.has(v) ? s.delete(v) : s.add(v); return s })
  }
  function toggleSector(v: string) {
    setFilterSectors(prev => { const s = new Set(prev); s.has(v) ? s.delete(v) : s.add(v); return s })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const diffMeta = (diff: string) =>
    DIFFICULTIES.find(d => d.value === diff) ?? { label: diff, color: colors.textMuted }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Añadir del catálogo</Text>
        <TouchableOpacity
          style={[styles.filterToggle, { backgroundColor: colors.surface, borderColor: activeFilters > 0 ? colors.primary : colors.border }]}
          onPress={() => setShowFilters(v => !v)}
          activeOpacity={0.8}
        >
          <Icon name="options-outline" size={18} color={activeFilters > 0 ? colors.primary : colors.textSecondary} />
          {activeFilters > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilters}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Icon name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Buscar por identificador..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Icon name="close-circle-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Panel de filtros (colapsable) */}
      {showFilters && (
        <View style={[styles.filterPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Dificultad */}
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Dificultad</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {DIFFICULTIES.map(d => {
              const active = filterDiffs.has(d.value)
              return (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.chip, { borderColor: active ? d.color : colors.border, backgroundColor: active ? d.color + '22' : colors.surfaceAlt }]}
                  onPress={() => toggleDiff(d.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.chipDot, { backgroundColor: d.color }]} />
                  <Text style={[styles.chipText, { color: active ? d.color : colors.textSecondary }]}>{d.label}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Estilo */}
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Estilo</Text>
          <View style={styles.chipWrap}>
            {STYLES_OPTIONS.map(s => {
              const active = filterStyles.has(s)
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryMuted : colors.surfaceAlt }]}
                  onPress={() => toggleStyle(s)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}>{s}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Sector */}
          {availableSectors.length > 0 && (
            <>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Sector</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {availableSectors.map(s => {
                  const active = filterSectors.has(s)
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, { borderColor: active ? colors.secondary : colors.border, backgroundColor: active ? colors.secondaryMuted : colors.surfaceAlt }]}
                      onPress={() => toggleSector(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: active ? colors.secondary : colors.textSecondary }]}>{s}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </>
          )}

          {activeFilters > 0 && (
            <TouchableOpacity
              onPress={() => { setFilterDiffs(new Set()); setFilterStyles(new Set()); setFilterSectors(new Set()) }}
              style={styles.clearFilters}
            >
              <Text style={[styles.clearFiltersText, { color: colors.error }]}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contador */}
      <Text style={[styles.countLabel, { color: colors.textMuted }]}>
        {filtered.length} bloque{filtered.length !== 1 ? 's' : ''} · {linkedIds.size} añadido{linkedIds.size !== 1 ? 's' : ''}
      </Text>

      {/* Lista */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="grid-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {blocks.length === 0 ? 'No tienes bloques activos en el catálogo' : 'Sin resultados'}
          </Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            {blocks.length === 0 ? 'Añade bloques desde tu home antes de crear liguillas' : 'Prueba con otros filtros'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isLinked  = linkedIds.has(item.id)
            const isAdding  = addingId === item.id
            const diff      = diffMeta(item.difficulty)

            return (
              <View style={[styles.row, { backgroundColor: colors.surface, borderColor: isLinked ? colors.primary + '55' : colors.border }]}>
                {/* Punto de dificultad */}
                <View style={[styles.diffDot, { backgroundColor: diff.color }]} />

                {/* Info */}
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowId, { color: colors.textPrimary }]}>{item.identifier}</Text>
                  <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
                    {diff.label}{item.sector ? ` · ${item.sector}` : ''}
                  </Text>
                </View>

                {/* Botón */}
                <TouchableOpacity
                  style={[
                    styles.addBtn,
                    isLinked
                      ? { backgroundColor: colors.success + '22', borderColor: colors.success }
                      : { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => !isLinked && handleAdd(item)}
                  disabled={isLinked || isAdding}
                  activeOpacity={0.8}
                >
                  {isAdding ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : isLinked ? (
                    <>
                      <Icon name="checkmark-outline" size={14} color={colors.success} />
                      <Text style={[styles.addBtnText, { color: colors.success }]}>Añadido</Text>
                    </>
                  ) : (
                    <>
                      <Icon name="add-outline" size={14} color={colors.textInverse} />
                      <Text style={[styles.addBtnText, { color: colors.textInverse }]}>Añadir</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  backBtn:          { padding: 4 },
  title:            { flex: 1, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  filterToggle:     { borderRadius: radius.md, borderWidth: 1, padding: 8, position: 'relative' },
  filterBadge:      { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText:  { fontSize: 9, fontWeight: typography.weight.bold, color: '#fff' },
  searchBar:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput:      { flex: 1, fontSize: typography.size.sm },
  filterPanel:      { marginHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  filterLabel:      { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow:          { gap: spacing.xs, paddingBottom: 2 },
  chipWrap:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip:             { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  chipDot:          { width: 8, height: 8, borderRadius: 4 },
  chipText:         { fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  clearFilters:     { alignSelf: 'flex-end', paddingTop: spacing.xs },
  clearFiltersText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  countLabel:       { fontSize: typography.size.xs, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  centered:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  emptyText:        { fontSize: typography.size.md, fontWeight: typography.weight.medium, textAlign: 'center' },
  emptySub:         { fontSize: typography.size.sm, textAlign: 'center' },
  list:             { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  row:              { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  diffDot:          { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  rowInfo:          { flex: 1, gap: 2 },
  rowId:            { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  rowMeta:          { fontSize: typography.size.xs },
  addBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 6, minWidth: 80, justifyContent: 'center' },
  addBtnText:       { fontSize: typography.size.xs, fontWeight: typography.weight.bold },
})

