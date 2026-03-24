import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { colors, typography, spacing, radius } from '../constants'
import type { Block, Attempt } from '../types'

interface Props {
  block: Block
  attempt?: Attempt | null
  onPress?: () => void
}

const DIFFICULTY_EMOJI: Record<string, string> = {
  principiante:  '⚪',
  novato:        '🟢',
  medio:         '🔵',
  avanzado:      '🟡',
  experimentado: '🟠',
  elite:         '🔴',
  profesional:   '🟣',
}

function goesLabel(numberOfGoes: number): string {
  if (numberOfGoes === 0) return 'Sin encadenar'
  if (numberOfGoes === 1) return '⚡ Flash'
  if (numberOfGoes >= 6)  return '+5 pegues'
  return `${numberOfGoes} pegues`
}

export function BlockCard({ block, attempt, onPress }: Props) {
  // null → sin registro   |  0 → intentado sin encadenar  |  ≥1 → completado
  const isCompleted  = attempt != null && attempt.number_of_goes >= 1
  const isTried      = attempt != null && attempt.number_of_goes === 0
  const hasResult    = attempt != null

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isCompleted && styles.cardCompleted,
        isTried     && styles.cardTried,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Franja lateral de estado */}
      <View style={[
        styles.statusStripe,
        isCompleted && styles.stripeCompleted,
        isTried     && styles.stripeTried,
        !hasResult  && styles.stripeEmpty,
      ]} />

      <Image source={{ uri: block.photo_url }} style={styles.photo} resizeMode="cover" />

      <View style={styles.info}>
        <Text style={styles.identifier} numberOfLines={1}>
          {block.identifier}
        </Text>
        {block.difficulty ? (
          <Text style={styles.difficulty}>
            {DIFFICULTY_EMOJI[block.difficulty]}{' '}
            {block.difficulty.charAt(0).toUpperCase() + block.difficulty.slice(1)}
          </Text>
        ) : (
          <Text style={styles.noDifficulty}>Sin dificultad</Text>
        )}
      </View>

      {/* Badge de resultado */}
      {hasResult && (
        <View style={[styles.badge, isCompleted ? styles.badgeCompleted : styles.badgeTried]}>
          <Text style={[styles.badgeText, isCompleted ? styles.badgeTextCompleted : styles.badgeTextTried]}>
            {goesLabel(attempt!.number_of_goes)}
          </Text>
        </View>
      )}

      {/* Checkmark si completado */}
      {isCompleted && (
        <Text style={styles.checkmark}>✓</Text>
      )}

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  cardCompleted: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  cardTried: {
    borderColor: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
  },
  statusStripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  stripeCompleted: {
    backgroundColor: colors.primary,
  },
  stripeTried: {
    backgroundColor: colors.textMuted,
  },
  stripeEmpty: {
    backgroundColor: 'transparent',
  },
  photo: {
    width: 68,
    height: 68,
  },
  info: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  identifier: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  difficulty: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  noDifficulty: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginRight: spacing.xs,
  },
  badgeCompleted: {
    backgroundColor: colors.primary + '20',
  },
  badgeTried: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  badgeTextCompleted: {
    color: colors.primary,
  },
  badgeTextTried: {
    color: colors.textMuted,
  },
  checkmark: {
    fontSize: typography.size.lg,
    color: colors.primary,
    fontWeight: typography.weight.bold,
    paddingRight: spacing.xs,
  },
  arrow: {
    fontSize: typography.size.xl,
    color: colors.textMuted,
    paddingRight: spacing.md,
  },
  // legacy — ya no usados pero se mantienen para no romper imports externos
  attemptBadge:  {},
  attemptDone:   {},
  attemptNone:   {},
  attemptEmoji:  {},
  attemptScore:  {},
})
