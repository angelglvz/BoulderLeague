import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { typography, spacing, radius } from '../constants'
import { useTheme } from '../lib/ThemeContext'
import { supabase } from '../lib/supabase'

interface League {
  id: string
  name: string
  is_private: boolean
  start_date?: string | null
  end_date?: string | null
  max_participants?: number | null
  reward?: string | null
  access_code?: string | null
  creator_id?: string
}

interface Props {
  league: League
  participantCount?: number
  currentUserId?: string | null
  isParticipant?: boolean
  isGymAccount?: boolean
  onJoined?: () => void
  onOpenCodeModal?: (leagueId: string) => void
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function leagueStatus(league: League): 'pending' | 'active' | 'finished' {
  const now = new Date()
  if (!league.start_date) return 'pending'
  if (league.end_date && now > new Date(league.end_date)) return 'finished'
  if (now >= new Date(league.start_date)) return 'active'
  return 'pending'
}

export function LeagueCardPublic({
  league,
  participantCount = 0,
  currentUserId,
  isParticipant = false,
  isGymAccount = false,
  onJoined,
  onOpenCodeModal,
}: Props) {
  const { colors } = useTheme()
  const router = useRouter()
  const [joining, setJoining] = useState(false)

  const status = leagueStatus(league)

  const statusLabel = { pending: '⏳ Sin iniciar', active: '🟢 En curso', finished: '🏁 Finalizada' }[status]
  const statusColor = { pending: colors.textMuted, active: colors.success, finished: colors.textMuted }[status]

  async function handleJoinPublic() {
    if (!currentUserId) return
    setJoining(true)
    await supabase.from('league_participants').insert({ league_id: league.id, user_id: currentUserId })
    setJoining(false)
    onJoined?.()
  }

  function renderAction() {
    // Los rocódromos no pueden participar
    if (isGymAccount) return null

    if (isParticipant) {
      return (
        <View style={[styles.joinedBadge, { backgroundColor: colors.successLight }]}>
          <Text style={[styles.joinedText, { color: colors.success }]}>Ya apuntado ✓</Text>
        </View>
      )
    }
    if (status === 'finished') {
      return (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={() => router.push(`/(app)/leagues/${league.id}/ranking`)}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Ver ranking</Text>
        </TouchableOpacity>
      )
    }
    if (status === 'active') {
      if (league.is_private) {
        return (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            onPress={() => onOpenCodeModal?.(league.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>🔒 Unirse con código</Text>
          </TouchableOpacity>
        )
      } else {
        return (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleJoinPublic}
            disabled={joining}
            activeOpacity={0.8}
          >
            {joining
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={[styles.actionBtnText, { color: '#fff' }]}>Apuntarse</Text>
            }
          </TouchableOpacity>
        )
      }
    }
    return null
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{league.name}</Text>
        <View style={styles.badges}>
          <Text style={[styles.statusBadge, { color: statusColor }]}>{statusLabel}</Text>
          <Text style={[styles.visibilityBadge, { color: league.is_private ? colors.warning : colors.success }]}>
            {league.is_private ? '🔒 Privada' : '🔓 Pública'}
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        {league.start_date && (
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            📅 {formatDate(league.start_date)}{league.end_date ? ` → ${formatDate(league.end_date)}` : ''}
          </Text>
        )}
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          👥 {participantCount}{league.max_participants ? `/${league.max_participants}` : ''} participantes
        </Text>
        {league.reward ? (
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>🏆 {league.reward}</Text>
        ) : null}
      </View>

      {renderAction()}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    flex: 1,
  },
  badges: { gap: 2, alignItems: 'flex-end' },
  statusBadge: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  visibilityBadge: { fontSize: typography.size.xs },
  meta: { gap: 2 },
  metaText: { fontSize: typography.size.sm },
  joinedBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  joinedText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  actionBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
})

