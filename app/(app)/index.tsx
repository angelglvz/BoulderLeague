import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, Image, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
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

interface FavoriteGym {
  gym_id: string
  profiles: {
    id: string
    name: string
    gym_location?: string | null
  } | null
  activeBlocks?: number
}

// ─── HomeScreen ───────────────────────────────────────────────
export default function HomeScreen() {
  const { user, signOut } = useSession()
  const { isGym } = useProfile()
  const router = useRouter()
  const { colors, toggleTheme, isDark } = useTheme()

  const [leagues, setLeagues] = useState<League[]>([])
  const [favorites, setFavorites] = useState<FavoriteGym[]>([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  // Si es GYM redirigir a su home
  useEffect(() => {
    if (isGym) router.replace('/(app)/gym')
  }, [isGym])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

    const [leaguesRes, favRes] = await Promise.all([
      // Liguillas activas o finalizadas en los últimos 7 días
      supabase
        .from('league_participants')
        .select('leagues(*)')
        .eq('user_id', user.id),
      // Gyms favoritos
      supabase
        .from('gym_favorites')
        .select('gym_id, profiles(id, name, gym_location)')
        .eq('user_id', user.id),
    ])

    if (leaguesRes.data) {
      const all = leaguesRes.data
        .map((r: any) => r.leagues)
        .filter(Boolean) as League[]
      // Filtrar solo activas o finalizadas en los últimos 7 días
      const filtered = all.filter(l => {
        if (!l.end_date) return true
        return new Date(l.end_date) >= new Date(sevenDaysAgo)
      })
      setLeagues(filtered)
    }

    if (favRes.data) {
      setFavorites(favRes.data as any)
    }

    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  function renderGymsSection() {
    if (loading) return <ActivityIndicator color={colors.primary} />
    if (favorites.length === 0) {
      return (
        <TouchableOpacity
          style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/(app)/gyms')}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyEmoji}>🏢</Text>
          <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
            Busca y añade rocódromos favoritos
          </Text>
          <Text style={[styles.emptyCardLink, { color: colors.primary }]}>Explorar rocódromos →</Text>
        </TouchableOpacity>
      )
    }
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gymScroll}>
        {favorites.map(fav => fav.profiles ? (
          <View key={fav.gym_id} style={styles.gymCardWrap}>
            <GymCard
              gym={{
                id: fav.profiles.id,
                name: fav.profiles.name,
                gym_location: fav.profiles.gym_location,
                activeBlocks: fav.activeBlocks ?? 0,
              }}
              isFavorite
            />
          </View>
        ) : null)}
        <TouchableOpacity
          style={[styles.addGymCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/(app)/gyms')}
          activeOpacity={0.8}
        >
          <Icon name="add-circle-outline" size={28} color={colors.primary} />
          <Text style={[styles.addGymText, { color: colors.primary }]}>Añadir</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  function renderLeaguesSection() {
    if (loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />
    if (leagues.length === 0) {
      return (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.emptyEmoji}>🏔️</Text>
          <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
            Aún no participas en ninguna liguilla
          </Text>
          <Text style={[styles.emptyCardSub, { color: colors.textMuted }]}>
            Crea una nueva o únete con un código
          </Text>
        </View>
      )
    }
    return (
      <View style={styles.leagueList}>
        {leagues.map(item => <LeagueCard key={item.id} league={item} />)}
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={isDark
            ? require('../../assets/logo-climbify.png')
            : require('../../assets/logo-climbify-light.png')
          }
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Acciones */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.buttonPrimary, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(app)/leagues/create')}
            activeOpacity={0.8}
          >
            <Icon name="add-circle-outline" size={16} color={colors.textInverse} style={{ marginRight: 4 }} />
            <Text style={[styles.buttonPrimaryText, { color: colors.textInverse }]}>Nueva liguilla</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.buttonSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(app)/leagues/join')}
            activeOpacity={0.8}
          >
            <Icon name="enter-outline" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.buttonSecondaryText, { color: colors.textSecondary }]}>Unirse con código</Text>
          </TouchableOpacity>
        </View>

        {/* ── Sección: Mis gyms favoritos ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mis rocódromos</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/gyms')}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>Ver todos →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : renderGymsSection()}
        </View>

        {/* ── Sección: Mis liguillas ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mis liguillas</Text>
          {renderLeaguesSection()}
        </View>

        {/* ── Sección: Descubrir ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Descubrir</Text>
          <TouchableOpacity
            style={[styles.discoverBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(app)/gyms')}
            activeOpacity={0.8}
          >
            <Text style={styles.discoverEmoji}>🔍</Text>
            <View>
              <Text style={[styles.discoverTitle, { color: colors.textPrimary }]}>Explorar rocódromos</Text>
              <Text style={[styles.discoverSub, { color: colors.textMuted }]}>
                Encuentra tu rocódromo y únete a sus liguillas
              </Text>
            </View>
            <Icon name="chevron-forward-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Modal de ajustes ── */}
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
                    active ? [styles.themeOptionActive, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }] : { borderColor: 'transparent' },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: { height: 52, width: 213 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  signOutBtn: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  signOut: { fontSize: typography.size.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  buttonPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', borderRadius: radius.md, paddingVertical: spacing.sm,
  },
  buttonPrimaryText: { fontWeight: typography.weight.bold, fontSize: typography.size.md },
  buttonSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', borderRadius: radius.md, paddingVertical: spacing.sm, borderWidth: 1,
  },
  buttonSecondaryText: { fontWeight: typography.weight.medium, fontSize: typography.size.md },
  section: { marginBottom: spacing.xl, gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {
    fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sectionLink: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  gymScroll: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  gymCardWrap: { width: 240, marginRight: spacing.sm },
  addGymCard: {
    width: 100, borderRadius: radius.lg, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: spacing.lg, marginRight: spacing.lg,
  },
  addGymText: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  emptyCard: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.lg, alignItems: 'center', gap: spacing.xs,
  },
  emptyEmoji: { fontSize: 32 },
  emptyCardText: { fontSize: typography.size.md, fontWeight: typography.weight.medium, textAlign: 'center' },
  emptyCardSub: { fontSize: typography.size.sm, textAlign: 'center' },
  emptyCardLink: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  loader: { marginTop: spacing.md },
  leagueList: { gap: spacing.sm },
  discoverBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, gap: spacing.md,
  },
  discoverEmoji: { fontSize: 28 },
  discoverTitle: { fontSize: typography.size.md, fontWeight: typography.weight.bold },
  discoverSub: { fontSize: typography.size.sm },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  settingsCard: {
    width: '100%', maxWidth: 360, borderRadius: radius.xl,
    borderWidth: 1, padding: spacing.lg, gap: spacing.md,
  },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settingsTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  settingsLabel: {
    fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  themeRow: {
    flexDirection: 'row', borderRadius: radius.lg,
    borderWidth: 1, padding: spacing.xs, gap: spacing.xs,
  },
  themeOption: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1.5, gap: 4, position: 'relative',
  },
  themeOptionActive: {},
  themeEmoji: { fontSize: 22 },
  themeLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  themeCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: { borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  closeBtnText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
})
