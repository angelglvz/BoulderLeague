import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, Image, ScrollView,
  TextInput,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession, useProfile } from '../../hooks'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/ThemeContext'
import { typography, spacing, radius } from '../../constants'
import { LeagueCard, GymCard, Icon } from '../../components'

// ─── Tipos locales ───────────────────────────────────────────
interface League {
  id: string
  name: string
  is_private: boolean
  start_date?: string | null
  end_date?: string | null
  reward?: string | null
  creator_id: string
  ranking_visible_during: boolean
}

interface Gym {
  id: string
  name: string
  gym_location?: string | null
  activeBlocks?: number
}

// ─── HomeScreen ───────────────────────────────────────────────
export default function HomeScreen() {
  const { user, signOut } = useSession()
  const { isGym, loading: profileLoading } = useProfile()
  const router = useRouter()
  const { colors, toggleTheme, isDark } = useTheme()

  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  // ── Rocódromos ──
  const [gymQuery, setGymQuery] = useState('')
  const [gymResults, setGymResults] = useState<Gym[]>([])
  const [gymSearchLoading, setGymSearchLoading] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [favoriteGyms, setFavoriteGyms] = useState<Gym[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Si es GYM redirigir a su home (esperar a que el perfil haya cargado)
  useEffect(() => {
    if (!profileLoading && isGym) router.replace('/(app)/gym')
  }, [isGym, profileLoading])

  // ── Fetch liguillas ──
  const fetchLeagues = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const { data } = await supabase
      .from('league_participants')
      .select('leagues(*)')
      .eq('user_id', user.id)
    if (data) {
      const all = data.map((r: any) => r.leagues).filter(Boolean) as League[]
      setLeagues(all.filter(l => !l.end_date || new Date(l.end_date) >= new Date(sevenDaysAgo)))
    }
    setLoading(false)
  }, [user])

  // ── Fetch favoritos ──
  const fetchFavorites = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('gym_favorites')
      .select('gym_id, profiles(id, name, gym_location)')
      .eq('user_id', user.id)
    if (data) {
      const ids = new Set<string>()
      const gyms: Gym[] = []
      for (const row of data as any[]) {
        if (row.profiles) {
          ids.add(row.gym_id)
          // contar bloques activos
          const { count } = await supabase
            .from('blocks')
            .select('id', { count: 'exact', head: true })
            .eq('gym_id', row.gym_id)
            .eq('is_active', true)
          gyms.push({ ...row.profiles, activeBlocks: count ?? 0 })
        }
      }
      setFavorites(ids)
      setFavoriteGyms(gyms)
    }
  }, [user])

  useFocusEffect(useCallback(() => {
    fetchLeagues()
    fetchFavorites()
  }, [fetchLeagues, fetchFavorites]))

  // ── Buscar rocódromos ──
  const searchGyms = useCallback(async (q: string) => {
    setGymSearchLoading(true)
    let query = supabase
      .from('profiles')
      .select('id, name, gym_location')
      .eq('account_type', 'gym')
      .order('name')
    if (q.trim()) query = query.or(`name.ilike.%${q}%,gym_location.ilike.%${q}%`)
    const { data } = await query.limit(20)
    if (data) {
      const withBlocks = await Promise.all((data as Gym[]).map(async g => {
        const { count } = await supabase
          .from('blocks').select('id', { count: 'exact', head: true })
          .eq('gym_id', g.id).eq('is_active', true)
        return { ...g, activeBlocks: count ?? 0 }
      }))
      setGymResults(withBlocks)
    }
    setGymSearchLoading(false)
  }, [])

  function handleGymSearch(text: string) {
    setGymQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text.trim()) { setGymResults([]); return }
    debounceRef.current = setTimeout(() => searchGyms(text), 300)
  }

  async function toggleFavorite(gym: Gym) {
    if (!user) return
    if (favorites.has(gym.id)) {
      // Quitar de favoritos
      const { error } = await supabase.from('gym_favorites').delete()
        .eq('user_id', user.id).eq('gym_id', gym.id)
      if (!error) {
        setFavorites(prev => { const s = new Set(prev); s.delete(gym.id); return s })
        setFavoriteGyms(prev => prev.filter(g => g.id !== gym.id))
      }
    } else {
      // Añadir a favoritos — upsert para evitar 409 si ya existe
      const { error } = await supabase.from('gym_favorites')
        .upsert({ user_id: user.id, gym_id: gym.id }, { onConflict: 'user_id,gym_id', ignoreDuplicates: true })
      if (!error) {
        setFavorites(prev => new Set(prev).add(gym.id))
        // Añadir a la lista de favoritos si no está ya
        setFavoriteGyms(prev => prev.find(g => g.id === gym.id) ? prev : [...prev, gym])
      }
    }
  }

  // ── Render liguillas ──
  function renderLeagues() {
    if (loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />
    if (leagues.length === 0) {
      return (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="trophy-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aún no participas en ninguna liguilla</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>Crea una nueva o únete con un código</Text>
        </View>
      )
    }
    return <View style={styles.leagueList}>{leagues.map(item => <LeagueCard key={item.id} league={item} />)}</View>
  }

  if (profileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  // Lista a mostrar en la sección rocódromos:
  // si hay búsqueda activa → resultados de búsqueda; si no → favoritos
  const showSearchResults = gymQuery.trim().length > 0
  const gymsToShow = showSearchResults ? gymResults : favoriteGyms

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={isDark ? require('../../assets/logo-climbify.png') : require('../../assets/logo-climbify-light.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowSettings(true)}
            activeOpacity={0.8}
          >
            <Icon name="settings-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={[styles.signOutBtn, { borderColor: colors.border }]}>
            <Text style={[styles.signOut, { color: colors.textMuted }]}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Accesos rápidos (igual que gym) ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(app)/leagues/create')}
            activeOpacity={0.8}
          >
            <Icon name="trophy-outline" size={22} color="#fff" />
            <Text style={styles.quickBtnText}>Nueva liguilla</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(app)/leagues/join')}
            activeOpacity={0.8}
          >
            <Icon name="enter-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.quickBtnTextAlt, { color: colors.textSecondary }]}>Unirse con código</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(app)/stats')}
            activeOpacity={0.8}
          >
            <Icon name="bar-chart-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.quickBtnTextAlt, { color: colors.textSecondary }]}>Mis stats</Text>
          </TouchableOpacity>
        </View>

        {/* ── Sección: Rocódromos ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Rocódromos</Text>

          {/* Buscador inline */}
          <View style={[styles.searchBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Icon name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Buscar por nombre o ciudad..."
              placeholderTextColor={colors.textMuted}
              value={gymQuery}
              onChangeText={handleGymSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {gymQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setGymQuery(''); setGymResults([]) }}>
                <Icon name="close-circle-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Resultados / Favoritos */}
          {gymSearchLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : gymsToShow.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon name="business-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {showSearchResults ? 'No se encontraron rocódromos' : 'Aún no tienes rocódromos favoritos'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {showSearchResults ? 'Prueba con otro nombre o ciudad' : 'Busca un rocódromo y márcalo con ⭐'}
              </Text>
            </View>
          ) : (
            <View style={styles.gymList}>
              {gymsToShow.map(gym => (
                <GymCard
                  key={gym.id}
                  gym={gym}
                  isFavorite={showSearchResults ? favorites.has(gym.id) : true}
                  onToggleFavorite={() => toggleFavorite(gym)}
                  onPress={() => router.push(`/(app)/gym/${gym.id}` as any)}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Sección: Mis liguillas ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mis liguillas</Text>
          {renderLeagues()}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Modal ajustes ── */}
      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <View
            style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.settingsHeader}>
              <Icon name="settings-outline" size={20} color={colors.primary} />
              <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>Ajustes</Text>
            </View>
            <Text style={[styles.settingsLabel, { color: colors.textSecondary }]}>Apariencia</Text>
            <View style={[styles.themeRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              {[
                { label: 'Oscuro', emoji: '🌙', active: isDark },
                { label: 'Claro', emoji: '☀️', active: !isDark },
              ].map(({ label, emoji, active }) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.themeOption,
                    active
                      ? { backgroundColor: colors.primaryMuted, borderColor: colors.primary }
                      : { borderColor: 'transparent' },
                  ]}
                  onPress={() => { if (!active) toggleTheme() }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.themeEmoji}>{emoji}</Text>
                  <Text style={[styles.themeLabel, { color: active ? colors.primary : colors.textSecondary }]}>{label}</Text>
                  {active && (
                    <View style={[styles.themeCheck, { backgroundColor: colors.primary }]}>
                      <Icon name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={() => setShowSettings(false)}
            >
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  logo: { height: 52, width: 213 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  signOutBtn: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  signOut: { fontSize: typography.size.sm },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  quickBtn: { flex: 1, borderRadius: radius.md, borderWidth: 1, padding: spacing.sm, alignItems: 'center', gap: 4 },
  quickBtnText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: '#fff', textAlign: 'center' },
  quickBtnTextAlt: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textAlign: 'center' },
  section: { marginBottom: spacing.xl, gap: spacing.sm },
  sectionTitle: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: typography.size.sm },
  gymList: { gap: spacing.sm },
  emptyCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  emptyText: { fontSize: typography.size.md, fontWeight: typography.weight.medium, textAlign: 'center' },
  emptySub: { fontSize: typography.size.sm, textAlign: 'center' },
  loader: { marginTop: spacing.md },
  leagueList: { gap: spacing.sm },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  settingsCard: { width: '100%', maxWidth: 360, borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settingsTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  settingsLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  themeRow: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, padding: spacing.xs, gap: spacing.xs },
  themeOption: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, gap: 4, position: 'relative' },
  themeEmoji: { fontSize: 22 },
  themeLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  themeCheck: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  closeBtnText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
})
