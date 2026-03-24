import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { colors, typography, spacing, radius } from '../constants'
import type { League } from '../types'

interface LeagueCardProps {
  readonly league: League
}

export function LeagueCard({ league }: LeagueCardProps) {
  const router = useRouter()

  const now = new Date()
  const start = league.start_date ? new Date(league.start_date) : null
  const end = league.end_date ? new Date(league.end_date) : null

  let status: 'pending' | 'upcoming' | 'active' | 'finished'
  if (!start || !end) status = 'pending'
  else if (now < start) status = 'upcoming'
  else if (now > end) status = 'finished'
  else status = 'active'

  const statusLabel = {
    pending: '⏳ Sin iniciar',
    upcoming: '🕐 Próximamente',
    active: '🟢 Activa',
    finished: '🏁 Finalizada',
  }[status]

  const statusColor = {
    pending: colors.textMuted,
    upcoming: colors.warning,
    active: colors.success,
    finished: colors.textMuted,
  }[status]

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/(app)/leagues/${league.id}`)}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{league.name}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.dates}>
          {start && end
            ? `📅 ${formatDate(league.start_date!)} → ${formatDate(league.end_date!)}`
            : '📅 Fechas pendientes de asignar'}
        </Text>
        {league.reward ? (
          <Text style={styles.reward} numberOfLines={1}>🏆 {league.reward}</Text>
        ) : null}
      </View>

      {league.is_private && (
        <View style={styles.privateBadge}>
          <Text style={styles.privateBadgeText}>🔒 Privada</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  status: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  meta: {
    gap: spacing.xs,
  },
  dates: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  reward: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  privateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privateBadgeText: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
})

