/**
 * app/(app)/achievements/index.tsx
 * Pantalla de Logros — 3 tabs internos:
 *   1. Mis Logros   — puntos, últimas medallas, grid por categoría
 *   2. Ranking      — ranking global por achievement_points
 *   3. Muro         — feed público de logros recientes
 */

import { useCallback, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, FlatList, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useSession } from '../../../hooks'
import { useTheme } from '../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../constants'
import { Icon } from '../../../components'
import {
  generateMedalDefinitions,
  type AchievementCategory,
  type MedalDefinition,
} from '../../../lib/achievements'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

interface EarnedMedal {
  id: string
  medal_key: string
  category: AchievementCategory
  tier: number
  points: number
  earned_at: string
}

interface RankEntry {
  id: string
  name: string
  avatar_url: string | null
  achievement_points: number
  rank: number
}

interface FeedEntry {
  id: string
  user_id: string
  created_at: string
  achievement_id: string
  profiles: { name: string; avatar_url: string | null }
  achievements: { medal_key: string; category: string; tier: number; points: number }
}

type Tab = 'mine' | 'ranking' | 'feed'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const ALL_MEDALS = generateMedalDefinitions(30)

const CATEGORY_ORDER: AchievementCategory[] = [
  'volume',
  'difficulty_principiante', 'difficulty_novato', 'difficulty_medio',
  'difficulty_avanzado', 'difficulty_experimentado', 'difficulty_elite',
  'difficulty_profesional',
  'flash', 'consistency', 'explorer',
]

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  volume:                   'Volumen',
  difficulty_principiante:  'Principiante',
  difficulty_novato:        'Novato',
  difficulty_medio:         'Medio',
  difficulty_avanzado:      'Avanzado',
  difficulty_experimentado: 'Experimentado',
  difficulty_elite:         'Élite',
  difficulty_profesional:   'Profesional',
  flash:                    'Flash',
  consistency:              'Constancia',
  explorer:                 'Explorador',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function medalDefForKey(key: string): MedalDefinition | undefined {
  return ALL_MEDALS.find(m => m.key === key)
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function AchievementsScreen() {
  const { user } = useSession()
  const { colors } = useTheme()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('mine')

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Logros</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        {([
          { key: 'mine',    label: 'Mis Logros' },
          { key: 'ranking', label: 'Ranking' },
          { key: 'feed',    label: 'Muro' },
        ] as { key: Tab; label: string }[]).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.tab,
              activeTab === t.key && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === t.key ? colors.textInverse : colors.textSecondary },
            ]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenido */}
      {activeTab === 'mine'    && <MyAchievementsTab userId={user?.id ?? ''} />}
      {activeTab === 'ranking' && <RankingTab userId={user?.id ?? ''} />}
      {activeTab === 'feed'    && <FeedTab />}
    </SafeAreaView>
  )
}

// ─────────────────────────────────────────────
// TAB 1 — MIS LOGROS
// ─────────────────────────────────────────────

function MyAchievementsTab({ userId }: Readonly<{ userId: string }>) {
  const { colors } = useTheme()
  const [earned, setEarned] = useState<EarnedMedal[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<AchievementCategory>>(new Set())

  useFocusEffect(useCallback(() => { load() }, [userId]))

  async function load() {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('achievements')
      .select('id, medal_key, category, tier, points, earned_at')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    const { data: profile } = await supabase
      .from('profiles')
      .select('achievement_points')
      .eq('id', userId)
      .single()

    setEarned((data as EarnedMedal[]) ?? [])
    setTotalPoints((profile as any)?.achievement_points ?? 0)
    setLoading(false)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#7B61FF" />
      </View>
    )
  }

  const earnedKeys = new Set(earned.map(e => e.medal_key))
  const last5 = earned.slice(0, 5)

  function toggleExpand(cat: AchievementCategory) {
    setExpanded(prev => {
      const s = new Set(prev)
      s.has(cat) ? s.delete(cat) : s.add(cat)
      return s
    })
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

      {/* Banner de puntos */}
      <View style={[styles.pointsBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.pointsNumber, { color: colors.primary }]}>{totalPoints.toLocaleString()}</Text>
        <Text style={[styles.pointsLabel, { color: colors.textMuted }]}>pts acumulados</Text>
      </View>

      {/* Últimas medallas */}
      {last5.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Últimas medallas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {last5.map(e => {
              const def = medalDefForKey(e.medal_key)
              if (!def) return null
              return (
                <View key={e.id} style={[styles.recentCard, { backgroundColor: colors.surface, borderColor: def.tierColor }]}>
                  <Icon name="medal-outline" size={24} color={def.tierColor} />
                  <Text style={[styles.recentLabel, { color: colors.textPrimary }]} numberOfLines={2}>{def.label}</Text>
                  <Text style={[styles.recentPoints, { color: '#22C55E' }]}>+{def.points}</Text>
                  <Text style={[styles.recentDate, { color: colors.textMuted }]}>{relativeTime(e.earned_at)}</Text>
                </View>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Grid por categoría */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Todas las categorías</Text>
        {CATEGORY_ORDER.map(cat => {
          const catMedals = ALL_MEDALS.filter(m => m.category === cat)
          const earnedInCat = catMedals.filter(m => earnedKeys.has(m.key))
          const nextPending = catMedals.find(m => !earnedKeys.has(m.key))
          const isExpanded = expanded.has(cat)

          // Mostrar: obtenidas + siguiente pendiente (+ todas si expandido)
          const visibleMedals = isExpanded
            ? catMedals.filter(m => earnedKeys.has(m.key) || m.key === nextPending?.key)
            : [...earnedInCat.slice(-2), ...(nextPending ? [nextPending] : [])]

          return (
            <View key={cat} style={[styles.catSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.catHeader}>
                <Text style={[styles.catTitle, { color: colors.textPrimary }]}>{CATEGORY_LABELS[cat]}</Text>
                <Text style={[styles.catCount, { color: colors.textMuted }]}>
                  {earnedInCat.length} obtenida{earnedInCat.length === 1 ? '' : 's'}
                </Text>
              </View>

              {visibleMedals.map(medal => {
                const isEarned = earnedKeys.has(medal.key)
                return (
                  <View key={medal.key} style={[
                    styles.medalRow,
                    { borderColor: isEarned ? medal.tierColor + '55' : colors.border },
                    isEarned && { backgroundColor: medal.tierColor + '0D' },
                  ]}>
                    <View style={[styles.medalIcon, { backgroundColor: isEarned ? medal.tierColor + '22' : colors.surfaceAlt }]}>
                      <Icon
                        name="medal-outline"
                        size={20}
                        color={isEarned ? medal.tierColor : colors.textMuted}
                      />
                    </View>
                    <View style={styles.medalInfo}>
                      <View style={styles.medalTopRow}>
                        <Text style={[styles.medalLabel, { color: isEarned ? colors.textPrimary : colors.textMuted }]}>
                          {medal.label}
                        </Text>
                        <View style={[styles.tierPill, { backgroundColor: isEarned ? medal.tierColor + '33' : colors.surfaceAlt }]}>
                          <Text style={[styles.tierPillText, { color: isEarned ? medal.tierColor : colors.textMuted }]}>
                            {medal.tierName}
                          </Text>
                        </View>
                      </View>
                      {isEarned
                        ? <Text style={[styles.medalPoints, { color: '#22C55E' }]}>+{medal.points} pts</Text>
                        : <Text style={[styles.medalThreshold, { color: colors.textMuted }]}>
                            Umbral: {medal.threshold}
                          </Text>
                      }
                    </View>
                  </View>
                )
              })}

              {earnedInCat.length > 2 && (
                <TouchableOpacity onPress={() => toggleExpand(cat)} style={styles.expandBtn}>
                  <Text style={[styles.expandText, { color: colors.primary }]}>
                    {isExpanded ? 'Ver menos' : `Ver todas (${earnedInCat.length})`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

// ─────────────────────────────────────────────
// TAB 2 — RANKING GLOBAL
// ─────────────────────────────────────────────

function RankingTab({ userId }: Readonly<{ userId: string }>) {
  const { colors } = useTheme()
  const [entries, setEntries] = useState<RankEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(useCallback(() => { load() }, [userId]))

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, achievement_points')
      .eq('account_type', 'user')
      .order('achievement_points', { ascending: false })
      .limit(100)

    if (data) {
      const ranked = (data as Omit<RankEntry, 'rank'>[]).map((p, i) => ({ ...p, rank: i + 1 }))
      setEntries(ranked)
    }

    if (isRefresh) setRefreshing(false)
    else setLoading(false)
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#7B61FF" /></View>
  }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  const myEntry = entries.find(e => e.id === userId)

  const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#7B61FF" />}
    >
      {/* Podio top 3 */}
      {top3.length > 0 && (
        <View style={[styles.podium, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Top 3</Text>
          <View style={styles.podiumRow}>
            {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, i) => {
              const podiumPos = entry.rank
              const col = PODIUM_COLORS[podiumPos - 1]
              const isTall = podiumPos === 1
              return (
                <View key={entry.id} style={[styles.podiumItem, isTall && styles.podiumItemTall]}>
                  <Text style={[styles.podiumRank, { color: col }]}>#{podiumPos}</Text>
                  <View style={[styles.podiumAvatar, { backgroundColor: col + '33', borderColor: col }]}>
                    <Icon name="person-outline" size={isTall ? 28 : 22} color={col} />
                  </View>
                  <Text style={[styles.podiumName, { color: colors.textPrimary }]} numberOfLines={1}>{entry.name}</Text>
                  <Text style={[styles.podiumPoints, { color: colors.textSecondary }]}>{entry.achievement_points.toLocaleString()} pts</Text>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* Mi posición si no está en top 3 */}
      {myEntry && myEntry.rank > 3 && (
        <View style={[styles.myPositionCard, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
          <Text style={[styles.myPositionLabel, { color: colors.primary }]}>Tu posición</Text>
          <View style={styles.rankRow}>
            <Text style={[styles.rankNum, { color: colors.primary }]}>#{myEntry.rank}</Text>
            <Text style={[styles.rankName, { color: colors.textPrimary }]}>{myEntry.name}</Text>
            <Text style={[styles.rankPoints, { color: colors.textSecondary }]}>{myEntry.achievement_points.toLocaleString()} pts</Text>
          </View>
        </View>
      )}

      {/* Lista completa */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Clasificación</Text>
        {rest.map(entry => {
          const isMe = entry.id === userId
          return (
            <View key={entry.id} style={[
              styles.rankRow,
              styles.rankRowCard,
              { backgroundColor: isMe ? colors.primary + '18' : colors.surface, borderColor: isMe ? colors.primary : colors.border },
            ]}>
              <Text style={[styles.rankNum, { color: isMe ? colors.primary : colors.textMuted, width: 36 }]}>
                #{entry.rank}
              </Text>
              <View style={[styles.rankAvatar, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name="person-outline" size={14} color={colors.textMuted} />
              </View>
              <Text style={[styles.rankName, { color: isMe ? colors.primary : colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                {entry.name}
              </Text>
              <Text style={[styles.rankPoints, { color: colors.textSecondary }]}>
                {entry.achievement_points.toLocaleString()} pts
              </Text>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

// ─────────────────────────────────────────────
// TAB 3 — MURO DE ACTIVIDAD
// ─────────────────────────────────────────────

function FeedTab() {
  const { colors } = useTheme()
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useFocusEffect(useCallback(() => {
    load()
    subscribeRealtime()
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, []))

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const { data } = await supabase
      .from('activity_feed')
      .select(`
        id, user_id, created_at, achievement_id,
        profiles ( name, avatar_url ),
        achievements ( medal_key, category, tier, points )
      `)
      .eq('event_type', 'achievement_earned')
      .order('created_at', { ascending: false })
      .limit(50)

    setFeed((data as unknown as FeedEntry[]) ?? [])
    if (isRefresh) setRefreshing(false)
    else setLoading(false)
  }

  function subscribeRealtime() {
    const channel = supabase
      .channel('achievement_feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
        filter: "event_type=eq.achievement_earned",
      }, () => { load() })
      .subscribe()
    channelRef.current = channel
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#7B61FF" /></View>
  }

  if (feed.length === 0) {
    return (
      <View style={styles.centered}>
        <Icon name="trophy-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aún no hay logros</Text>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>Sé el primero en conseguir una medalla</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={feed}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#7B61FF" />}
      renderItem={({ item }) => {
        const def = medalDefForKey(item.achievements?.medal_key ?? '')
        const tierColor = def?.tierColor ?? '#7B61FF'
        const isHighTier = (def?.tier ?? 0) >= 4

        return (
          <View style={[
            styles.feedCard,
            { backgroundColor: colors.surface, borderColor: isHighTier ? tierColor : colors.border },
            isHighTier && { borderWidth: 1.5 },
          ]}>
            {/* Avatar */}
            <View style={[styles.feedAvatar, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name="person-outline" size={18} color={colors.textMuted} />
            </View>

            {/* Contenido */}
            <View style={styles.feedContent}>
              <Text style={[styles.feedText, { color: colors.textPrimary }]}>
                <Text style={{ fontWeight: typography.weight.bold }}>{item.profiles?.name ?? '—'}</Text>
                {' ha conseguido '}
                <Text style={{ fontWeight: typography.weight.bold }}>{def?.label ?? item.achievements?.medal_key}</Text>
              </Text>

              <View style={styles.feedMeta}>
                {def && (
                  <View style={[styles.tierPill, { backgroundColor: tierColor + '33' }]}>
                    <Text style={[styles.tierPillText, { color: tierColor }]}>{def.tierName}</Text>
                  </View>
                )}
                <Text style={[styles.feedPoints, { color: '#22C55E' }]}>
                  +{item.achievements?.points ?? 0} pts
                </Text>
                <Text style={[styles.feedTime, { color: colors.textMuted }]}>
                  {relativeTime(item.created_at)}
                </Text>
              </View>
            </View>
          </View>
        )
      }}
    />
  )
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  backBtn:          { padding: 4 },
  headerTitle:      { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  tabs:             { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: radius.lg, borderWidth: 1, padding: 4, gap: 4 },
  tab:              { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  tabText:          { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  centered:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  scrollContent:    { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  // Points banner
  pointsBanner:     { borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  pointsNumber:     { fontSize: 52, fontWeight: '900', lineHeight: 60 },
  pointsLabel:      { fontSize: typography.size.sm, textTransform: 'uppercase', letterSpacing: 1 },
  // Sections
  section:          { gap: spacing.sm },
  sectionTitle:     { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  // Recent medals
  recentRow:        { gap: spacing.sm, paddingRight: spacing.lg },
  recentCard:       { width: 110, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1.5, alignItems: 'center', gap: 4 },
  recentLabel:      { fontSize: typography.size.xs, textAlign: 'center', fontWeight: typography.weight.semibold },
  recentPoints:     { fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  recentDate:       { fontSize: typography.size.xs - 1 },
  // Category sections
  catSection:       { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  catHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catTitle:         { fontSize: typography.size.md, fontWeight: typography.weight.bold },
  catCount:         { fontSize: typography.size.xs },
  medalRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, padding: spacing.sm },
  medalIcon:        { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  medalInfo:        { flex: 1, gap: 2 },
  medalTopRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  medalLabel:       { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, flex: 1 },
  medalPoints:      { fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  medalThreshold:   { fontSize: typography.size.xs },
  tierPill:         { borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  tierPillText:     { fontSize: typography.size.xs - 1, fontWeight: typography.weight.bold, letterSpacing: 0.5 },
  expandBtn:        { alignItems: 'center', paddingTop: spacing.xs },
  expandText:       { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  // Podium
  podium:           { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  podiumRow:        { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.md },
  podiumItem:       { alignItems: 'center', gap: 4, flex: 1 },
  podiumItemTall:   { marginBottom: -8 },
  podiumRank:       { fontSize: typography.size.xl, fontWeight: '900' },
  podiumAvatar:     { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  podiumName:       { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textAlign: 'center' },
  podiumPoints:     { fontSize: typography.size.xs, textAlign: 'center' },
  // My position
  myPositionCard:   { borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md, gap: spacing.xs },
  myPositionLabel:  { fontSize: typography.size.xs, fontWeight: typography.weight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Rank rows
  rankRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rankRowCard:      { borderRadius: radius.md, borderWidth: 1, padding: spacing.sm },
  rankNum:          { fontSize: typography.size.sm, fontWeight: typography.weight.bold, minWidth: 36 },
  rankAvatar:       { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankName:         { flex: 1, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  rankPoints:       { fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  // Feed
  feedCard:         { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  feedAvatar:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  feedContent:      { flex: 1, gap: spacing.xs },
  feedText:         { fontSize: typography.size.sm, lineHeight: 20 },
  feedMeta:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  feedPoints:       { fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  feedTime:         { fontSize: typography.size.xs },
  // Empty
  emptyText:        { fontSize: typography.size.md, fontWeight: typography.weight.medium, textAlign: 'center' },
  emptySub:         { fontSize: typography.size.sm, textAlign: 'center' },
})






