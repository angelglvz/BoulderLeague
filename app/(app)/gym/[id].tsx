import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Modal, FlatList,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession, useProfile } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../constants'
import { LeagueCardPublic, JoinLeagueModal, Icon, BlockCard } from '../../../components'
import { DIFFICULTY_LABELS, type BlockDifficulty } from '../../../lib/scoring'
import { fetchBlockAvgRatings } from '../../../lib/ratings'

type Tab = 'info' | 'leagues' | 'ranking' | 'stats'
type RankingPeriod = 'global' | 'month' | 'week'
type PersonalFilter = 'all' | 'pending' | 'done' | 'unattempted'

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

  // ── Bloques del tab Info ──
  const [blocks, setBlocks] = useState<any[]>([])
  const [attempts, setAttempts] = useState<Record<string, any>>({})
  const [avgRatings, setAvgRatings] = useState<Record<string, number>>({})
  const [blocksLoading, setBlocksLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterDiffs, setFilterDiffs] = useState<Set<string>>(new Set())
  const [filterStyles, setFilterStyles] = useState<Set<string>>(new Set())
  const [filterSections, setFilterSections] = useState<Set<string>>(new Set())
  const [filterPersonal, setFilterPersonal] = useState<PersonalFilter>('all')

  // ── Stats del usuario en este gym ──
  const [gymStats, setGymStats] = useState<{
    totalBlocks: number
    totalFlashes: number
    totalScore: number
    myRank: number | null
    byDifficulty: Record<string, number>
    byGoes: Record<string, number>
  } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => { if (id) loadAll() }, [id, tab, rankPeriod])

  // Cargar estado de favorito de forma independiente al entrar/volver a la pantalla
  useFocusEffect(useCallback(() => {
    if (!id || !user) return
    supabase
      .from('gym_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('gym_id', id)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data))
  }, [id, user]))

  async function loadBlocks() {
    if (!id) return
    setBlocksLoading(true)
    const { data: blocksData } = await supabase
      .from('blocks').select('*')
      .eq('gym_id', id).eq('is_active', true)
      .order('created_at', { ascending: false })

    setBlocks(blocksData ?? [])

    if (user && blocksData && blocksData.length > 0) {
      const { data: attemptsData } = await supabase
        .from('attempts').select('*').eq('user_id', user.id)
        .in('block_id', blocksData.map((b: any) => b.id))
      const map: Record<string, any> = {}
      ;(attemptsData ?? []).forEach((a: any) => { map[a.block_id] = a })
      setAttempts(map)
    }

    if (blocksData && blocksData.length > 0) {
      const ratings = await fetchBlockAvgRatings(blocksData.map((b: any) => b.id))
      setAvgRatings(ratings)
    }
    setBlocksLoading(false)
  }

  useFocusEffect(useCallback(() => { loadBlocks() }, [id, user]))

  async function loadGymStats() {
    if (!id || !user) return
    setStatsLoading(true)
    try {
      // Bloques del gym
      const { data: gymBlocks } = await supabase
        .from('blocks').select('id, difficulty, color')
        .eq('gym_id', id)
      const blockIds = (gymBlocks ?? []).map((b: any) => b.id)
      if (blockIds.length === 0) {
        setGymStats({ totalBlocks: 0, totalFlashes: 0, totalScore: 0, myRank: null, byDifficulty: {}, byGoes: {} })
        setStatsLoading(false)
        return
      }

      // Intentos del usuario en este gym
      const { data: attemptsData } = await supabase
        .from('attempts')
        .select('block_id, result, number_of_goes, score')
        .eq('user_id', user.id)
        .in('block_id', blockIds)

      const solved = (attemptsData ?? []).filter((a: any) => a.result !== 'not_completed')
      const byDifficulty: Record<string, number> = {}
      const byGoes: Record<string, number> = {}
      let totalFlashes = 0
      let totalScore = 0

      const blockMap: Record<string, any> = {}
      ;(gymBlocks ?? []).forEach((b: any) => { blockMap[b.id] = b })

      for (const a of solved) {
        totalScore += a.score
        const diff = blockMap[a.block_id]?.difficulty
        if (diff) byDifficulty[diff] = (byDifficulty[diff] ?? 0) + 1
        const gk = a.number_of_goes === 1 ? 'flash' : a.number_of_goes >= 6 ? '+5' : String(a.number_of_goes)
        byGoes[gk] = (byGoes[gk] ?? 0) + 1
        if (a.result === 'flash') totalFlashes++
      }

      // Posición en el ranking global del gym
      const { data: rankData } = await supabase
        .from('gym_rankings')
        .select('user_id, total_score')
        .eq('gym_id', id)
        .order('total_score', { ascending: false })

      let myRank: number | null = null
      if (rankData) {
        const idx = rankData.findIndex((r: any) => r.user_id === user.id)
        if (idx >= 0) myRank = idx + 1
      }

      setGymStats({ totalBlocks: solved.length, totalFlashes, totalScore, myRank, byDifficulty, byGoes })
    } finally {
      setStatsLoading(false)
    }
  }

  useFocusEffect(useCallback(() => {
    if (tab === 'stats') loadGymStats()
  }, [id, user, tab]))

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
    const newState = !isFavorite
    setIsFavorite(newState) // optimista
    if (!newState) {
      const { error } = await supabase.from('gym_favorites').delete().eq('user_id', user.id).eq('gym_id', id)
      if (error) setIsFavorite(true) // revertir si falla
    } else {
      const { error } = await supabase.from('gym_favorites')
        .upsert({ user_id: user.id, gym_id: id }, { onConflict: 'user_id,gym_id', ignoreDuplicates: true })
      if (error) setIsFavorite(false) // revertir si falla
    }
    setFavLoading(false)
  }

  // ── Lógica de filtros ──
  const availableSections = useMemo(() => {
    const set = new Set<string>()
    blocks.forEach(b => { if (b.sector) set.add(b.sector) })
    return Array.from(set).sort()
  }, [blocks])

  const filteredBlocks = useMemo(() => blocks.filter(b => {
    if (filterDiffs.size > 0 && !filterDiffs.has(b.difficulty)) return false
    if (filterStyles.size > 0) {
      const bs = (b.color ?? '').split(', ')
      if (!bs.some((s: string) => filterStyles.has(s))) return false
    }
    if (filterSections.size > 0 && !filterSections.has(b.sector ?? '')) return false
    if (filterPersonal !== 'all') {
      const a = attempts[b.id]
      if (filterPersonal === 'unattempted') return a == null
      if (filterPersonal === 'done') return a != null && a.number_of_goes >= 1
      if (filterPersonal === 'pending') return a != null && a.number_of_goes === 0
    }
    return true
  }), [blocks, attempts, filterDiffs, filterStyles, filterSections, filterPersonal])

  const activeFilters = filterDiffs.size + filterStyles.size + filterSections.size + (filterPersonal !== 'all' ? 1 : 0)

  function toggleSet(set: Set<string>, value: string): Set<string> {
    const next = new Set(set)
    next.has(value) ? next.delete(value) : next.add(value)
    return next
  }

  function clearFilters() {
    setFilterDiffs(new Set())
    setFilterStyles(new Set())
    setFilterSections(new Set())
    setFilterPersonal('all')
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
        {/* Estrella de favorito — solo usuarios */}
        {isUser ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={toggleFavorite}
            disabled={favLoading}
            activeOpacity={0.7}
          >
            {favLoading
              ? <ActivityIndicator size="small" color={colors.textMuted} />
              : <Icon
                  name={isFavorite ? 'star' : 'star-outline'}
                  size={22}
                  color={isFavorite ? '#F5C518' : colors.textMuted}
                />
            }
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(([
          ['info', 'Info'],
          ['leagues', 'Liguillas'],
          ['ranking', 'Ranking'],
          ...(isUser ? [['stats', 'Mis stats']] : []),
        ] as [Tab, string][]).map(([t, label]) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.textMuted }]}>{label}</Text>
          </TouchableOpacity>
        )))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          {/* ── TAB INFO ── */}
          {tab === 'info' && gymProfile && (
            <View style={styles.tabContent}>
              {gymProfile.gym_location && (
                <Text style={[styles.location, { color: colors.textMuted }]}>📍 {gymProfile.gym_location}</Text>
              )}
              {gymProfile.gym_description && (
                <Text style={[styles.description, { color: colors.textSecondary }]}>{gymProfile.gym_description}</Text>
              )}

              {/* Barra de bloques + favorito */}
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.infoCardRow}>
                  <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>Bloques activos</Text>
                  <Text style={[styles.infoCardValue, { color: colors.primary }]}>{gymProfile.activeBlocks}/100</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.barFill, { width: `${(gymProfile.activeBlocks / 100) * 100}%` as any, backgroundColor: gymProfile.activeBlocks >= 90 ? colors.warning : colors.primary }]} />
                </View>
              </View>


              {/* ── Bloques con filtro ── */}
              <View style={styles.blocksHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Bloques</Text>
                <TouchableOpacity
                  style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: activeFilters > 0 ? colors.primary : colors.border }]}
                  onPress={() => setShowFilters(true)} activeOpacity={0.8}
                >
                  <Icon name="options-outline" size={16} color={activeFilters > 0 ? colors.primary : colors.textSecondary} />
                  {activeFilters > 0 && (
                    <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.filterBadgeText}>{activeFilters}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {blocksLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : filteredBlocks.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Icon name="grid-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {blocks.length === 0 ? 'Sin bloques activos' : 'Sin resultados'}
                  </Text>
                  <Text style={[{ fontSize: typography.size.sm, color: colors.textMuted, textAlign: 'center' }]}>
                    {activeFilters > 0 ? 'Prueba a cambiar los filtros' : ''}
                  </Text>
                </View>
              ) : (
                <View style={styles.blockList}>
                  {filteredBlocks.map(block => (
                    <BlockCard
                      key={block.id}
                      block={block}
                      attempt={attempts[block.id] ?? null}
                      avgRating={avgRatings[block.id] ?? null}
                      onPress={() => router.push(`/(app)/blocks/${block.id}`)}
                    />
                  ))}
                </View>
              )}
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

          {/* ── TAB MIS STATS ── */}
          {tab === 'stats' && isUser && (
            <View style={styles.tabContent}>
              {statsLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : !gymStats ? null : (
                <>
                  {/* Resumen */}
                  <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.statValue, { color: colors.primary }]}>{gymStats.totalBlocks}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Resueltos</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.statValue, { color: colors.primary }]}>{gymStats.totalFlashes}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Flash</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.statValue, { color: colors.primary }]}>{gymStats.totalScore}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Puntos</Text>
                    </View>
                  </View>

                  {gymStats.myRank !== null && (
                    <View style={[styles.rankBadge, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
                      <Icon name="trophy-outline" size={16} color={colors.primary} />
                      <Text style={[styles.rankBadgeText, { color: colors.primary }]}>
                        Tu posición en este gym: #{gymStats.myRank}
                      </Text>
                    </View>
                  )}

                  {/* Por dificultad */}
                  {Object.keys(gymStats.byDifficulty).length > 0 && (
                    <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.statsCardTitle, { color: colors.textSecondary }]}>POR DIFICULTAD</Text>
                      {(['principiante', 'novato', 'medio', 'avanzado', 'experimentado', 'elite', 'profesional'] as BlockDifficulty[]).map(d => {
                        const val = gymStats.byDifficulty[d] ?? 0
                        const maxV = Math.max(1, ...Object.values(gymStats.byDifficulty))
                        return (
                          <View key={d} style={styles.barRow}>
                            <Text style={[styles.barLabel, { color: colors.textMuted }]} numberOfLines={1}>
                              {DIFFICULTY_LABELS[d]}
                            </Text>
                            <View style={styles.barTrackWrap}>
                              <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                                <View style={[styles.barFill, { width: `${(val / maxV) * 100}%` as any, backgroundColor: colors.primary }]} />
                              </View>
                            </View>
                            <Text style={[styles.barValue, { color: colors.textMuted }]}>{val}</Text>
                          </View>
                        )
                      })}
                    </View>
                  )}

                  {/* Por pegues */}
                  {Object.keys(gymStats.byGoes).length > 0 && (
                    <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.statsCardTitle, { color: colors.textSecondary }]}>POR PEGUES</Text>
                      {[
                        { key: 'flash', label: 'Flash' },
                        { key: '2', label: '2 pegues' },
                        { key: '3', label: '3 pegues' },
                        { key: '4', label: '4 pegues' },
                        { key: '5', label: '5 pegues' },
                        { key: '+5', label: '+5 pegues' },
                      ].map(g => {
                        const val = gymStats.byGoes[g.key] ?? 0
                        const maxV = Math.max(1, ...Object.values(gymStats.byGoes))
                        return (
                          <View key={g.key} style={styles.barRow}>
                            <Text style={[styles.barLabel, { color: colors.textMuted }]}>{g.label}</Text>
                            <View style={styles.barTrackWrap}>
                              <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                                <View style={[styles.barFill, { width: `${(val / maxV) * 100}%` as any, backgroundColor: colors.primary }]} />
                              </View>
                            </View>
                            <Text style={[styles.barValue, { color: colors.textMuted }]}>{val}</Text>
                          </View>
                        )
                      })}
                    </View>
                  )}

                  {gymStats.totalBlocks === 0 && (
                    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Icon name="bar-chart-outline" size={40} color={colors.textMuted} />
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin datos todavía</Text>
                      <Text style={[{ fontSize: typography.size.sm, color: colors.textMuted, textAlign: 'center' }]}>
                        Registra resultados en bloques de este rocódromo
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
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
              {/* Estado personal */}
              <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Estado</Text>
              <View style={styles.filterChips}>
                {([
                  { value: 'all',         label: 'Todos' },
                  { value: 'unattempted', label: 'Sin encadenar' },
                  { value: 'done',        label: 'Encadenados' },
                  { value: 'pending',     label: 'Intentados' },
                ] as { value: PersonalFilter; label: string }[]).map(p => {
                  const sel = filterPersonal === p.value
                  return (
                    <TouchableOpacity key={p.value}
                      style={[styles.filterChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, sel && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
                      onPress={() => setFilterPersonal(p.value)} activeOpacity={0.8}>
                      <Text style={[styles.filterChipText, { color: sel ? colors.primary : colors.textSecondary }]}>{p.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Dificultad */}
              <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Dificultad</Text>
              <View style={styles.filterChips}>
                {DIFFICULTIES.map(d => {
                  const sel = filterDiffs.has(d.value)
                  return (
                    <TouchableOpacity key={d.value}
                      style={[styles.filterChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, sel && { backgroundColor: d.color + '22', borderColor: d.color }]}
                      onPress={() => setFilterDiffs(prev => toggleSet(prev, d.value))} activeOpacity={0.8}>
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
                    <TouchableOpacity key={s}
                      style={[styles.filterChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, sel && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
                      onPress={() => setFilterStyles(prev => toggleSet(prev, s))} activeOpacity={0.8}>
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
                        <TouchableOpacity key={s}
                          style={[styles.filterChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, sel && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
                          onPress={() => setFilterSections(prev => toggleSet(prev, s))} activeOpacity={0.8}>
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
  // Bloques inline
  blocksHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterBtn: { position: 'relative', width: 32, height: 32, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  blockList: { gap: spacing.sm },
  // Modal filtros
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '85%' },
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
  // Stats tab
  statsRow:       { flexDirection: 'row', gap: spacing.sm },
  statCard:       { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  statValue:      { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  statLabel:      { fontSize: typography.size.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  rankBadge:      { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rankBadgeText:  { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  statsCard:      { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  statsCardTitle: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  barRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel:       { width: 90, fontSize: typography.size.sm },
  barTrackWrap:   { flex: 1 },
  barValue:       { width: 24, fontSize: typography.size.sm, textAlign: 'right', fontWeight: typography.weight.semibold },
})

