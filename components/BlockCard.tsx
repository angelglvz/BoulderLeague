import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { colors, typography, spacing, radius } from '../constants'
import type { Block } from '../types'

interface Props {
  block: Block
  onPress?: () => void
}

const DIFFICULTY_EMOJI: Record<string, string> = {
  novato:        '🟢',
  medio:         '🔵',
  avanzado:      '🟡',
  experimentado: '🟠',
  profesional:   '🔴',
}

export function BlockCard({ block, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image
        source={{ uri: block.photo_url }}
        style={styles.photo}
        resizeMode="cover"
      />
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
  photo: {
    width: 72,
    height: 72,
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
  arrow: {
    fontSize: typography.size.xl,
    color: colors.textMuted,
    paddingRight: spacing.md,
  },
})

