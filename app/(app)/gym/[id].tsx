import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useSession } from '../../../hooks'
import { useProfile } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../constants'
import { LeagueCardPublic, JoinLeagueModal, Icon } from '../../../components'

type Tab = 'info' | 'leagues' | 'ranking'
type RankingPeriod = 'global' | 'month' | 'week'

interface GymProfile {
  id: string
  name: string
  gym_location?: string | null
  gym_description?: string | null
  activeBlocks: number
}

interface League {
  id: string
  name: string
  is_private: boolean
  start_date?: string | null
  end_date?: string | null
  max_participants?: number | null
  reward?: string | null
  access_code?: string | null
  creator_id: string
  ranking_visible_during: boolean
}

interface RankingRow {
  user_id: string
  total_score: number
  blocks_completed: number
  profile?: { name: string }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function GymProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const { user } = useSession()
  const { isUser } = useProfile()

  const [tab, setTab] = useState<Tab>('info')
  const [gymProfile, setGymProfile] = useState<GymProfile | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [leagues, setLeagues] = useState<League[]>([])
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({})
  const [myLeagues, setMyLeagues] = useState<Set<string>>(new Set())
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [myRank, setMyRank] = useState<{ rank: number; score: number } | null>(null)
  const [rankPeriod, setRankPeriod] = useState<RankingPeriod>('global')
  const [loading, setLoading] = useState(true)
  const [codeModalLeagueId, setCodeModalLeagueId] = useState<string | null>(null)
  const [favLoading, setFavLoading] = useState(false)

  useEffect(() => { if (id) loadAll() }, [id, tab, rankPeriod])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadGym(), loadLeagues(), tab === 'ranking' ? loadRanking() : Promise.resolve()])
    setLoading(false)
  }

  async function loadGym() {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, gym_location, gym_description')
      .eq('id', id)
      .single()
    if (!data) return

    const { count } = await supabase
      .from('blocks')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', id)
      .eq('is_active', true)

    setGymProfile({ ...data, activeBlocks: count ?? 0 })

    if (user) {
      const { data: fav } = await supabase
        .from('gym_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('gym_id', id)
        .maybeSingle()
      setIsFavorite(!!fav)
    }
  }

  async function loadLeagues() {
    const { data } = await supabase
      .from('leagues')
      .select('*')
      .eq('creator_id', id)
      .order('created_at', { ascending: false })
    if (!data) return
    setLeagues(data)

    // Contar participantes y verificar si el usuario ya participa
    const ids = data.map(l => l.id)
    if (ids.length === 0) return

    const [countsRes, myRes] = await Promise.all([
      Promise.all(ids.map(lid =>
        supabase.from('league_participants').select('id', { count: 'exact', head: true }).eq('league_id', lid)
          .then(r => ({ lid, count: r.count ?? 0 }))
      )),
      user
        ? supabase.from('league_participants').select('league_id').eq('user_id', user.id).in('league_id', ids)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const counts: Record<string, number> = {}
    countsRes.forEach(({ lid, count }) => { counts[lid] = count })
    setParticipantCounts(counts)

    const mine = new Set<string>((myRes.data ?? []).map((r: any) => r.league_id))
    setMyLeagues(mine)
  }

  async function loadRanking() {
    let query

    if (rankPeriod === 'global') {
      query = supabase
        .from('gym_rankings')
        .select('user_id, total_score, blocks_completed')
        .eq('gym_id', id)
        .order('total_score', { ascending: false })
        .limit(10)
    } else if (rankPeriod === 'month') {
      const monthStart = new Date()
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
      const { data: attempts } = await supabase
        .from('attempts')
        .select('user_id, score, block_id')
        .gte('updated_at', monthStart.toISOString())
        .in('block_id',
          (await supabase.from('blocks').select('id').eq('gym_id', id)).data?.map(b => b.id) ?? []
        )
      const agg: Record<string, { total_score: number; blocks_completed: number }> = {}
      ;(attempts ?? []).forEach(a => {
        if (!agg[a.user_id]) agg[a.user_id] = { total_score: 0, blocks_completed: 0 }
        agg[a.user_id].total_score += a.score
        agg[a.user_id].blocks_completed++
      })
      const rows = Object.entries(agg)
        .map(([user_id, v]) => ({ user_id, ...v }))
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, 10)
      setRanking(rows)
      if (user) enrichRankingNames(rows)
      return
    } else {
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const { data: attempts } = await supabase
        .from('attempts')
        .select('user_id, score, block_id')
        .gte('updated_at', weekAgo)
        .in('block_id',
          (await supabase.from('blocks').select('id').eq('gym_id', id)).data?.map(b => b.id) ?? []
        )
      const agg: Record<string, { total_score: number; blocks_completed: number }> = {}
      ;(attempts ?? []).forEach(a => {
        if (!agg[a.user_id]) agg[a.user_id] = { total_score: 0, blocks_completed: 0 }
        agg[a.user_id].total_score += a.score
        agg[a.user_id].blocks_completed++
      })
      const rows = Object.entries(agg)
        .map(([user_id, v]) => ({ user_id, ...v }))
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, 10)
      setRanking(rows)
      if (user) enrichRankingNames(rows)
      return
    }

    const { data } = await query
    if (!data) return
    setRanking(data as any)
    enrichRankingNames(data as any)
  }

  async function enrichRankingNames(rows: RankingRow[]) {
    if (!rows.length) return
    const ids = rows.map(r => r.user_id)
    const { data } = await supabase.from('profiles').select('id, name').in('id', ids)
    const nameMap: Record<string, string> = {}
    ;(data ?? []).forEach((p: any) => { nameMap[p.id] = p.name })
    setRanking(rows.map(r => ({ ...r, profile: { name: nameMap[r.user_id] ?? 'Usuario' } })))

    if (user) {
      const idx = rows.findIndex(r => r.user_id === user.id)
      if (idx >= 0) setMyRank({ rank: idx + 1, score: rows[idx].total_score })
    }
  }

  async function toggleFavorite() {
    if (!user || !isUser || favLoading) return
    setFavLoading(true)
    if (isFavorite) {
      await supabase.from('gym_favorites').delete().eq('user_id', user.id).eq('gym_id', id)
      setIsFavorite(false)
    } else {
      await supabase.from('gym_favorites').insert({ user_id: user.id, gym_id: id })
      setIsFavorite(true)
    }
    setFavLoading(false)
  }

  const now = new Date()
  const activeLeagues = leagues.filter(l => l.start_date && new Date(l.start_date) <= now && (!l.end_date || new Date(l.end_date) > now))
  const finishedLeagues = leagues.filter(l => l.end_date && new Date(l.end_date) <= now)

  const medalEmoji = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {gymProfile?.name ?? '...'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {([['info', 'ℹ️ Info'], ['leagues', '🏆 Liguillas'], ['ranking', '📊 Ranking']] as [Tab, string][]).map(([t, label]) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.textMuted }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          {/* ── TAB INFO ── */}
          {tab === 'info' && gymProfile && (
            <View style={styles.tabContent}>
              <Text style={[styles.gymName, { color: colors.textPrimary }]}>{gymProfile.name}</Text>
              {gymProfile.gym_location && (
                <Text style={[styles.location, { color: colors.textMuted }]}>📍 {gymProfile.gym_location}</Text>
              )}
              {gymProfile.gym_description && (
                <Text style={[styles.description, { color: colors.textSecondary }]}>{gymProfile.gym_description}</Text>
              )}

              {/* Bloques activos */}
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.infoCardRow}>
                  <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>Bloques activos</Text>
                  <Text style={[styles.infoCardValue, { color: colors.primary }]}>
                    {gymProfile.activeBlocks}/100
                  </Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.barFill, { width: `${(gymProfile.activeBlocks / 100) * 100}%` as any, backgroundColor: gymProfile.activeBlocks >= 90 ? colors.warning : colors.primary }]} />
                </View>
              </View>

              {/* Botones */}
              {isUser && (
                <TouchableOpacity
                  style={[styles.favBtn, { backgroundColor: isFavorite ? colors.accentMuted : colors.surface, borderColor: isFavorite ? colors.accent : colors.border }]}
                  onPress={toggleFavorite}
                  disabled={favLoading}
                  activeOpacity={0.8}
                >
                  {favLoading
                    ? <ActivityIndicator size="small" color={colors.accent} />
                    : <Text style={[styles.favBtnText, { color: isFavorite ? colors.accentDark : colors.textSecondary }]}>
                        {isFavorite ? '⭐ En favoritos' : '☆ Añadir a favoritos'}
                      </Text>
                  }
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push(`/(app)/gyms/${id}/blocks`)}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreBtnText}>Explorar bloques →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── TAB LIGUILLAS ── */}
          {tab === 'leagues' && (
            <View style={styles.tabContent}>
              {activeLeagues.length > 0 && (
                <>
                  <Text style={[styles.subSection, { color: colors.textSecondary }]}>En curso</Text>
                  {activeLeagues.map(l => (
                    <LeagueCardPublic
                      key={l.id}
                      league={l}
                      participantCount={participantCounts[l.id] ?? 0}
                      currentUserId={user?.id ?? null}
                      isParticipant={myLeagues.has(l.id)}
                      onJoined={loadLeagues}
                      onOpenCodeModal={setCodeModalLeagueId}
                    />
                  ))}
                </>
              )}
              {finishedLeagues.length > 0 && (
                <>
                  <Text style={[styles.subSection, { color: colors.textSecondary }]}>Finalizadas</Text>
                  {finishedLeagues.map(l => (
                    <LeagueCardPublic
                      key={l.id}
                      league={l}
                      participantCount={participantCounts[l.id] ?? 0}
                      currentUserId={user?.id ?? null}
                      isParticipant={myLeagues.has(l.id)}
                      onJoined={loadLeagues}
                      onOpenCodeModal={setCodeModalLeagueId}
                    />
                  ))}
                </>
              )}
              {leagues.length === 0 && (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 32 }}>🏆</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay liguillas todavía</Text>
                </View>
              )}
            </View>
          )}

          {/* ── TAB RANKING ── */}
          {tab === 'ranking' && (
            <View style={styles.tabContent}>
              {/* Selector de período */}
              <View style={[styles.periodRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {([['global', 'Global'], ['month', 'Este mes'], ['week', 'Esta semana']] as [RankingPeriod, string][]).map(([p, label]) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodBtn, rankPeriod === p && { backgroundColor: colors.primaryMuted }]}
                    onPress={() => setRankPeriod(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.periodLabel, { color: rankPeriod === p ? colors.primary : colors.textMuted }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {ranking.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 32 }}>📊</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aún no hay datos de ranking</Text>
                </View>
              ) : (
                <View style={[styles.rankingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {ranking.map((row, i) => {
                    const isMe = user && row.user_id === user.id
                    return (
                      <View key={row.user_id} style={[styles.rankRow, isMe && { backgroundColor: colors.primaryMuted }]}>
                        <Text style={[styles.rankMedal, { color: colors.textPrimary }]}>{medalEmoji(i)}</Text>
                        <Text style={[styles.rankName, { color: isMe ? colors.primary : colors.textPrimary }]} numberOfLines={1}>
                          {row.profile?.name ?? 'Usuario'}{isMe ? ' (tú)' : ''}
                        </Text>
                        <Text style={[styles.rankScore, { color: colors.textSecondary }]}>
                          {row.total_score} pts · {row.blocks_completed} bloques
                        </Text>
                      </View>
                    )
                  })}
                  {myRank && myRank.rank > 10 && (
                    <>
                      <View style={[styles.rankDivider, { backgroundColor: colors.border }]} />
                      <View style={[styles.rankRow, { backgroundColor: colors.primaryMuted }]}>
                        <Text style={[styles.rankMedal, { color: colors.primary }]}>📍</Text>
                        <Text style={[styles.rankName, { color: colors.primary }]}>Tu posición: #{myRank.rank}</Text>
                        <Text style={[styles.rankScore, { color: colors.textSecondary }]}>{myRank.score} pts</Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}

      <JoinLeagueModal
        visible={!!codeModalLeagueId}
        leagueId={codeModalLeagueId}
        currentUserId={user?.id ?? null}
        onClose={() => setCodeModalLeagueId(null)}
        onJoined={loadLeagues}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, flex: 1, textAlign: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  tabLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  loader: { marginTop: spacing['2xl'] },
  scroll: { flex: 1 },
  tabContent: { padding: spacing.lg, gap: spacing.md },
  gymName: { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  location: { fontSize: typography.size.md },
  description: { fontSize: typography.size.md, lineHeight: 22 },
  infoCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  infoCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoCardLabel: { fontSize: typography.size.sm },
  infoCardValue: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  favBtn: { borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  favBtnText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  exploreBtn: { borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  exploreBtnText: { color: '#fff', fontSize: typography.size.md, fontWeight: typography.weight.bold },
  subSection: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  emptyText: { fontSize: typography.size.md, textAlign: 'center' },
  periodRow: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, padding: spacing.xs, gap: spacing.xs },
  periodBtn: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.xs, alignItems: 'center' },
  periodLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  rankingCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  rankMedal: { fontSize: 18, width: 28, textAlign: 'center' },
  rankName: { flex: 1, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  rankScore: { fontSize: typography.size.xs },
  rankDivider: { height: 1, marginVertical: 4 },
})

