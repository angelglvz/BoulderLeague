import { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, ScrollView,
} from 'react-native'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { supabase } from '../../../../lib/supabase'
import { useSession } from '../../../../hooks'
import { useTheme } from '../../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../../constants'
import { Icon, BlockCard } from '../../../../components'

type DifficultyFilter = 'all' | 'novato' | 'medio' | 'avanzado' | 'experimentado' | 'profesional'
type PersonalFilter = 'all' | 'pending' | 'done'

const DIFF_CHIPS: { value: DifficultyFilter; label: string }[] = [
  { value: 'all',           label: 'Todos' },
  { value: 'novato',        label: 'Novato' },
  { value: 'medio',         label: 'Medio' },
  { value: 'avanzado',      label: 'Avanzado' },
  { value: 'experimentado', label: 'Experim.' },
  { value: 'profesional',   label: 'Pro' },
]

const PERSONAL_CHIPS: { value: PersonalFilter; label: string }[] = [
  { value: 'all',     label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'done',    label: 'Realizados' },
]

interface Block {
  id: string; identifier: string; difficulty: string
  photo_url: string; color?: string | null; sector?: string | null
  is_active: boolean; created_at?: string | null
}
interface Attempt {
  id: string; block_id: string; user_id: string
  number_of_goes: number; score: number
}

export default function GymBlocksUserScreen() {
  const { id: gymId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useSession()
  const { colors } = useTheme()

  const [blocks, setBlocks] = useState<Block[]>([])
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({})
  const [loading, setLoading] = useState(true)
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>('all')
  const [personalFilter, setPersonalFilter] = useState<PersonalFilter>('all')

  const fetchData = useCallback(async () => {
    if (!gymId) return
    setLoading(true)
    let q = supabase.from('blocks').select('*')
      .eq('gym_id', gymId).eq('is_active', true)
      .order('created_at', { ascending: false })
    if (diffFilter !== 'all') q = q.eq('difficulty', diffFilter)
    const { data: blocksData } = await q

    let attemptsMap: Record<string, Attempt> = {}
    if (user && blocksData && blocksData.length > 0) {
      const { data: attemptsData } = await supabase
        .from('attempts').select('*').eq('user_id', user.id)
        .in('block_id', blocksData.map((b: Block) => b.id))
      if (attemptsData) {
        for (const a of attemptsData as Attempt[]) attemptsMap[a.block_id] = a
      }
    }
    setBlocks(blocksData ?? [])
    setAttempts(attemptsMap)
    setLoading(false)
  }, [gymId, user, diffFilter])

  useFocusEffect(useCallback(() => { fetchData() }, [fetchData]))

  const filtered = blocks.filter(b => {
    if (personalFilter === 'all') return true
    const a = attempts[b.id]
    if (personalFilter === 'done') return a != null && a.number_of_goes >= 1
    return a == null || a.number_of_goes === 0
  })

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Bloques</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {DIFF_CHIPS.map(d => (
          <TouchableOpacity key={d.value}
            style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }, diffFilter === d.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setDiffFilter(d.value)} activeOpacity={0.8}>
            <Text style={[styles.chipText, { color: diffFilter === d.value ? colors.textInverse : colors.textSecondary }]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[styles.chipScroll, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
        contentContainerStyle={styles.chipRow}>
        {PERSONAL_CHIPS.map(p => (
          <TouchableOpacity key={p.value}
            style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }, personalFilter === p.value && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
            onPress={() => setPersonalFilter(p.value)} activeOpacity={0.8}>
            <Text style={[styles.chipText, { color: personalFilter === p.value ? colors.primary : colors.textSecondary }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} />
        : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="grid-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin bloques</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {diffFilter !== 'all' || personalFilter !== 'all' ? 'Prueba con otros filtros' : 'Este rocódromo aún no tiene bloques activos'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered} keyExtractor={item => item.id}
            contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <BlockCard block={item as any} attempt={attempts[item.id] as any ?? null}
                onPress={() => router.push(`/(app)/blocks/${item.id}`)} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  chipScroll: { maxHeight: 48 },
  chipRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm, flexDirection: 'row' },
  chip: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 4 },
  chipText: { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  loader: { marginTop: spacing['2xl'] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold, textAlign: 'center' },
  emptySub: { fontSize: typography.size.sm, textAlign: 'center' },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
})

