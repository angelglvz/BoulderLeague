import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Alert, Clipboard, FlatList,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSession } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { colors, typography, spacing, radius } from '../../../constants'
import type { League, Block } from '../../../types'

export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useSession()
  const [league, setLeague] = useState<League | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    const [{ data: leagueData }, { data: blocksData }, { count }] = await Promise.all([
      supabase.from('leagues').select('*').eq('id', id).single(),
      supabase.from('blocks').select('*').eq('league_id', id).order('created_at'),
      supabase.from('league_participants').select('*', { count: 'exact', head: true }).eq('league_id', id),
    ])
    if (leagueData) setLeague(leagueData)
    if (blocksData) setBlocks(blocksData)
    if (count !== null) setParticipantCount(count)
    setLoading(false)
  }

  function handleShare() {
    if (!league?.access_code) return
    Clipboard.setString(league.access_code)
    Alert.alert('¡Copiado! 📋', `Código "${league.access_code}" copiado al portapapeles.`)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!league) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Liguilla no encontrada</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={blocks}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.backText}>← Volver</Text>
              </TouchableOpacity>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>{league.name}</Text>
                <TouchableOpacity
                  style={styles.rankingButton}
                  onPress={() => router.push(`/(app)/leagues/${league.id}/ranking`)}
                >
                  <Text style={styles.rankingButtonText}>🏆 Ranking</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Info */}
            <View style={styles.infoCard}>
              <InfoRow label="📅 Fechas" value={`${formatDate(league.start_date)} → ${formatDate(league.end_date)}`} />
              <InfoRow label="👥 Participantes" value={`${participantCount}${league.max_participants ? ` / ${league.max_participants}` : ''}`} />
              {league.reward && <InfoRow label="🏆 Recompensa" value={league.reward} />}
            </View>

            {/* Compartir */}
            {league.access_code && (
              <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
                <Text style={styles.shareCode}>{league.access_code}</Text>
                <Text style={styles.shareLabel}>Toca para copiar el código 📋</Text>
              </TouchableOpacity>
            )}

            {/* Bloques header */}
            <View style={styles.blocksHeader}>
              <Text style={styles.sectionTitle}>Bloques ({blocks.length})</Text>
              <TouchableOpacity
                style={styles.addBlockButton}
                onPress={() => router.push(`/(app)/leagues/${league.id}/add-block`)}
              >
                <Text style={styles.addBlockText}>+ Añadir</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.blockItem}
            onPress={() => router.push(`/(app)/blocks/${item.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.blockInfo}>
              <Text style={styles.blockName}>{item.identifier}</Text>
              {item.difficulty && (
                <Text style={styles.blockDifficulty}>{item.difficulty}</Text>
              )}
            </View>
            <Text style={styles.blockArrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBlocks}>
            <Text style={styles.emptyEmoji}>🧱</Text>
            <Text style={styles.emptyText}>Aún no hay bloques</Text>
            <Text style={styles.emptySubtext}>Añade el primer bloque de la liguilla</Text>
          </View>
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  )
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  label: { fontSize: typography.size.sm, color: colors.textSecondary, fontWeight: typography.weight.medium },
  value: { fontSize: typography.size.sm, color: colors.textPrimary, flex: 1, textAlign: 'right' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header: { paddingTop: spacing.xl, marginBottom: spacing.md },
  backText: { color: colors.textSecondary, fontSize: typography.size.md, marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title: { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, color: colors.textPrimary, flex: 1 },
  rankingButton: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  rankingButtonText: { fontSize: typography.size.sm, color: colors.textSecondary, fontWeight: typography.weight.semibold },
  infoCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm, marginBottom: spacing.md },
  shareButton: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  shareCode: { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, color: colors.primary, letterSpacing: 4 },
  shareLabel: { fontSize: typography.size.sm, color: colors.textMuted },
  blocksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  addBlockButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  addBlockText: { color: colors.textInverse, fontWeight: typography.weight.bold, fontSize: typography.size.sm },
  blockItem: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  blockInfo: { gap: 2 },
  blockName: { fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.textPrimary },
  blockDifficulty: { fontSize: typography.size.sm, color: colors.textMuted, textTransform: 'capitalize' },
  blockArrow: { fontSize: typography.size.xl, color: colors.textMuted },
  emptyBlocks: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: typography.size.md, color: colors.textSecondary, fontWeight: typography.weight.medium },
  emptySubtext: { fontSize: typography.size.sm, color: colors.textMuted },
  errorText: { color: colors.error, fontSize: typography.size.md },
})

