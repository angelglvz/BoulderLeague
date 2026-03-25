import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { typography, spacing, radius } from '../constants'
import { useTheme } from '../lib/ThemeContext'
import type { League } from '../types'

interface LeagueCardProps {
  readonly league: League
}

/** Formatea fecha + hora: "12 mar · 18:30" */
function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  const fecha = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  const hora  = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${fecha} · ${hora}`
}

/** Cuenta atrás legible desde ahora hasta una fecha */
function countdownTo(target: Date): string {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return '0 min'

  const totalMin  = Math.floor(diff / 60000)
  const totalHrs  = Math.floor(diff / 3600000)
  const days      = Math.floor(diff / 86400000)
  const hrs       = totalHrs % 24
  const mins      = totalMin % 60

  if (days >= 1) return `${days}d ${hrs}h`
  if (totalHrs >= 1) return `${totalHrs}h ${mins}m`
  return `${totalMin}m`
}

export function LeagueCard({ league }: LeagueCardProps) {
  const router = useRouter()
  const { colors } = useTheme()
  const [now, setNow] = useState(() => new Date())

  // Actualizar "ahora" cada minuto para que la cuenta atrás sea reactiva
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const start = league.start_date ? new Date(league.start_date) : null
  const end   = league.end_date   ? new Date(league.end_date)   : null

  let status: 'pending' | 'upcoming' | 'active' | 'finished'
  if (!start || !end) status = 'pending'
  else if (now < start) status = 'upcoming'
  else if (now > end)   status = 'finished'
  else                  status = 'active'

  const statusLabel = {
    pending:  '⏳ Sin iniciar',
    upcoming: '🕐 Próximamente',
    active:   '🟢 Activa',
    finished: '🏁 Finalizada',
  }[status]

  const statusColor = {
    pending:  colors.textMuted,
    upcoming: colors.warning,
    active:   colors.success,
    finished: colors.textMuted,
  }[status]

  // Línea de info secundaria según estado
  let infoLine: string | null = null
  if (status === 'upcoming' && start) {
    infoLine = `📅 Comienza el ${formatDateTime(league.start_date!)}`
  } else if (status === 'active' && end) {
    const msLeft = end.getTime() - now.getTime()
    const THREE_DAYS = 3 * 24 * 3600 * 1000
    if (msLeft <= THREE_DAYS) {
      infoLine = `⏱ Termina en ${countdownTo(end)}`
    } else {
      infoLine = `En curso · fin el ${formatDateTime(league.end_date!)}`
    }
  } else if (status === 'finished' && end) {
    infoLine = `🏁 Finalizó el ${formatDateTime(league.end_date!)}`
  } else if (status === 'pending') {
    infoLine = '📅 Fechas pendientes de asignar'
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={() => router.push(`/(app)/leagues/${league.id}`)}
    >
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{league.name}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      <View style={styles.meta}>
        {infoLine ? <Text style={[styles.dates, { color: colors.textSecondary }]}>{infoLine}</Text> : null}
        {league.reward ? (
          <Text style={[styles.reward, { color: colors.textSecondary }]} numberOfLines={1}>🏆 {league.reward}</Text>
        ) : null}
      </View>

      {league.is_private && (
        <View style={[styles.privateBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.privateBadgeText, { color: colors.textMuted }]}>🔒 Privada</Text>
        </View>
      )}
    </TouchableOpacity>
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
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
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
  },
  reward: {
    fontSize: typography.size.sm,
  },
  privateBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
  },
  privateBadgeText: {
    fontSize: typography.size.xs,
  },
})
