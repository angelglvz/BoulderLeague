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
  const [gymInputFocused, setGymInputFocused] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [favoriteGyms, setFavoriteGyms] = useState<Gym[]>([])
  const [achievementPoints, setAchievementPoints] = useState<number | null>(null)
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
  }, [user?.id])

  // ── Fetch favoritos ──
  const fetchFavorites = useCallback(async () => {
    if (!user?.id) return

    // 1. Obtener los IDs de gyms favoritos del usuario
    const { data: favData, error: favError } = await supabase
      .from('gym_favorites')
      .select('gym_id')
      .eq('user_id', user.id)

    if (favError) {
      console.warn('[fetchFavorites] error leyendo gym_favorites:', favError.message)
      return
    }

    const gymIds = (favData ?? []).map((r: any) => r.gym_id as string)

    // Actualizar el Set de IDs siempre, aunque esté vacío
    setFavorites(new Set(gymIds))

    if (gymIds.length === 0) {
      setFavoriteGyms([])
      return
    }

    // 2. Obtener los perfiles de esos gyms (query explícita, sin depender de FK join)
    const { data: gymData, error: gymError } = await supabase
      .from('profiles')
      .select('id, name, gym_location')
      .in('id', gymIds)

    if (gymError) {
      console.warn('[fetchFavorites] error leyendo profiles:', gymError.message)
      return
    }

    // 3. Contar bloques activos de cada gym
    const withBlocks = await Promise.all((gymData ?? []).map(async (g: Gym) => {
      const { count } = await supabase
        .from('blocks')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', g.id)
        .eq('is_active', true)
      return { ...g, activeBlocks: count ?? 0 }
    }))

    setFavoriteGyms(withBlocks)

    // 4. Cargar puntos de logros
    const { data: profileData } = await supabase
      .from('profiles')
      .select('achievement_points')
      .eq('id', user.id)
      .single()
    if (profileData) setAchievementPoints((profileData as any).achievement_points ?? 0)
  }, [user?.id])

  useFocusEffect(useCallback(() => {
    fetchLeagues()
    fetchFavorites()
  }, [fetchLeagues, fetchFavorites]))

  // Re-cargar datos cuando el usuario cambia (ej: después de login/logout).
  // useFocusEffect sólo se dispara en eventos de foco; este useEffect garantiza
  // que los datos se cargan aunque la pantalla ya estuviera en foco.
  useEffect(() => {
    fetchLeagues()
    fetchFavorites()
  }, [fetchLeagues, fetchFavorites])

  // ── Buscar rocódromos ──
  const searchGyms = useCallback(async (q: string) => {
    setGymSearchLoading(true)
    const isEmpty = !q.trim()
    let query = supabase
      .from('profiles')
      .select('id, name, gym_location')
      .eq('account_type', 'gym')
      .order('name')
    if (!isEmpty) query = query.or(`name.ilike.%${q}%,gym_location.ilike.%${q}%`)
    const { data } = await query.limit(isEmpty ? 3 : 20)
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
    if (!text.trim()) {
      // Sin texto pero con foco → cargar sugerencias (3 rocódromos)
      debounceRef.current = setTimeout(() => searchGyms(''), 100)
      return
    }
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
  // si hay búsqueda activa o el input está enfocado → resultados/sugerencias; si no → favoritos
  const showSearchResults = gymInputFocused || gymQuery.trim().length > 0
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
          {/* Icono de usuario con puntos (futuro: gestión de perfil) */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            disabled
          >
            <Icon name="person-outline" size={20} color={colors.textSecondary} />
            {achievementPoints !== null && (
              <Text style={[styles.pointsBadge, { color: colors.textMuted }]}>
                {achievementPoints.toLocaleString()} pts
              </Text>
            )}
          </TouchableOpacity>
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
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(app)/achievements' as any)}
            activeOpacity={0.8}
          >
            <Icon name="medal-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.quickBtnTextAlt, { color: colors.textSecondary }]}>Logros</Text>
          </TouchableOpacity>
        </View>

        {/* ── Sección: Rocódromos ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Rocódromos</Text>
            {showSearchResults && (
              <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                {gymQuery.trim() ? 'Resultados' : 'Sugerencias'}
              </Text>
            )}
          </View>

          {/* Buscador inline */}
          <View style={[styles.searchBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Icon name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Buscar por nombre o ciudad..."
              placeholderTextColor={colors.textMuted}
              value={gymQuery}
              onChangeText={handleGymSearch}
              onFocus={() => {
                setGymInputFocused(true)
                if (!gymQuery.trim()) searchGyms('')
              }}
              onBlur={() => {
                // Delay para permitir que el tap en una GymCard complete
                // antes de que la lista cambie de sugerencias a favoritos
                setTimeout(() => setGymInputFocused(false), 150)
              }}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {gymQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setGymQuery(''); searchGyms('') }}>
                <Icon name="close-circle-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Resultados / Favoritos */}
          {/* Sólo mostrar spinner cuando estamos en modo búsqueda/sugerencias,
              NUNCA ocultar los favoritos por una búsqueda en segundo plano */}
          {(gymSearchLoading && showSearchResults) ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : gymsToShow.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon name="business-outline" size={40} color={colors.textMuted} />
              {(() => {
                const hasText = gymQuery.trim().length > 0
                const emptyTitle = hasText
                  ? 'No se encontraron rocódromos'
                  : showSearchResults
                    ? 'Cargando sugerencias...'
                    : 'Aún no tienes rocódromos favoritos'
                const emptySub = hasText
                  ? 'Prueba con otro nombre o ciudad'
                  : showSearchResults
                    ? ''
                    : 'Busca un rocódromo y márcalo con ⭐'
                return (
                  <>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyTitle}</Text>
                    {emptySub ? <Text style={[styles.emptySub, { color: colors.textMuted }]}>{emptySub}</Text> : null}
                  </>
                )
              })()}
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
  iconBtn: { minWidth: 36, minHeight: 36, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 4 },
  pointsBadge: { fontSize: 8, fontWeight: typography.weight.semibold, lineHeight: 10 },
  signOutBtn: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  signOut: { fontSize: typography.size.sm },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  quickBtn: { flex: 1, borderRadius: radius.md, borderWidth: 1, padding: spacing.sm, alignItems: 'center', gap: 4 },
  quickBtnText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: '#fff', textAlign: 'center' },
  quickBtnTextAlt: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textAlign: 'center' },
  section: { marginBottom: spacing.xl, gap: spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHint: { fontSize: typography.size.xs },
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
