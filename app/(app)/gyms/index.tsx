import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSession } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../constants'
import { GymCard, Icon } from '../../../components'

interface Gym {
  id: string
  name: string
  gym_location?: string | null
  activeBlocks?: number
}

const ItemSeparator = () => <View style={{ height: spacing.sm }} />

export default function GymsScreen() {
  const router = useRouter()
  const { user } = useSession()
  const { colors } = useTheme()

  const [gyms, setGyms] = useState<Gym[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchGyms = useCallback(async (search = '') => {
    setLoading(true)
    let q = supabase
      .from('profiles')
      .select('id, name, gym_location')
      .eq('account_type', 'gym')
      .order('name')

    if (search.trim()) {
      q = q.or(`name.ilike.%${search}%,gym_location.ilike.%${search}%`)
    }

    const { data } = await q.limit(50)
    if (!data) { setLoading(false); return }

    // Contar bloques activos por gym
    const withBlocks = await Promise.all(data.map(async (g: Gym) => {
      const { count } = await supabase
        .from('blocks')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', g.id)
        .eq('is_active', true)
      return { ...g, activeBlocks: count ?? 0 }
    }))

    setGyms(withBlocks)
    setLoading(false)
  }, [])

  const fetchFavorites = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('gym_favorites').select('gym_id').eq('user_id', user.id)
    setFavorites(new Set((data ?? []).map((r: any) => r.gym_id)))
  }, [user])

  useEffect(() => { fetchGyms(); fetchFavorites() }, [])

  function handleSearch(text: string) {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchGyms(text), 300)
  }

  function renderContent() {
    if (loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />
    if (gyms.length === 0) {
      return (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>🏔️</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {query ? 'No se encontraron rocódromos' : 'No hay rocódromos registrados todavía'}
          </Text>
        </View>
      )
    }
    return (
      <FlatList
        data={gyms}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <GymCard
            gym={item}
            isFavorite={favorites.has(item.id)}
            onPress={() => router.push(`/(app)/gym/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={ItemSeparator}
      />
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Rocódromos</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Buscador */}
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Icon name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Buscar por nombre o ciudad..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={handleSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); fetchGyms('') }}>
            <Icon name="close-circle-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {renderContent()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: typography.size.md },
  loader: { marginTop: spacing['2xl'] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { fontSize: typography.size.md, textAlign: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
})

