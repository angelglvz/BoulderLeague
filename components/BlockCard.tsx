import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { typography, spacing, radius } from '../constants'
import { useTheme } from '../lib/ThemeContext'
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
  const { colors } = useTheme()

  const isCompleted  = attempt != null && attempt.number_of_goes >= 1
  const isTried      = attempt != null && attempt.number_of_goes === 0
  const hasResult    = attempt != null

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isCompleted && { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
        isTried     && { borderColor: colors.textMuted, backgroundColor: colors.surfaceAlt },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Franja lateral de estado */}
      <View style={[
        styles.statusStripe,
        isCompleted && { backgroundColor: colors.primary },
        isTried     && { backgroundColor: colors.textMuted },
        !hasResult  && { backgroundColor: 'transparent' },
      ]} />

      <Image source={{ uri: block.photo_url }} style={styles.photo} resizeMode="cover" />

      <View style={styles.info}>
        <Text style={[styles.identifier, { color: colors.textPrimary }]} numberOfLines={1}>
          {block.identifier}
        </Text>
        {block.difficulty ? (
          <Text style={[styles.difficulty, { color: colors.textMuted }]}>
            {DIFFICULTY_EMOJI[block.difficulty]}{' '}
            {block.difficulty.charAt(0).toUpperCase() + block.difficulty.slice(1)}
          </Text>
        ) : (
          <Text style={[styles.noDifficulty, { color: colors.textMuted }]}>Sin dificultad</Text>
        )}
      </View>

      {hasResult && (
        <View style={[
          styles.badge,
          isCompleted
            ? { backgroundColor: colors.primary + '20' }
            : { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
        ]}>
          <Text style={[
            styles.badgeText,
            { color: isCompleted ? colors.primary : colors.textMuted },
          ]}>
            {goesLabel(attempt!.number_of_goes)}
          </Text>
        </View>
      )}

      {isCompleted && (
        <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
      )}

      <Text style={[styles.arrow, { color: colors.textMuted }]}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  statusStripe: {
    width: 4,
    alignSelf: 'stretch',
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
  },
  difficulty: {
    fontSize: typography.size.sm,
    textTransform: 'capitalize',
  },
  noDifficulty: {
    fontSize: typography.size.sm,
    fontStyle: 'italic',
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginRight: spacing.xs,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  checkmark: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    paddingRight: spacing.xs,
  },
  arrow: {
    fontSize: typography.size.xl,
    paddingRight: spacing.md,
  },
})
