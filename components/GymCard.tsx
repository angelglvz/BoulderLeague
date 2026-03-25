import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { typography, spacing, radius } from '../constants'
import { useTheme } from '../lib/ThemeContext'

interface Props {
  gym: {
    id: string
    name: string
    gym_location?: string | null
    activeBlocks?: number
  }
  isFavorite?: boolean
  onPress?: () => void
}

export function GymCard({ gym, isFavorite = false, onPress }: Props) {
  const router = useRouter()
  const { colors } = useTheme()

  const blockCount = gym.activeBlocks ?? 0
  const blockPct   = Math.min(blockCount / 100, 1)

  function handlePress() {
    if (onPress) { onPress(); return }
    router.push(`/(app)/gym/${gym.id}`)
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={handlePress}
    >
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {gym.name}
          </Text>
          {gym.gym_location ? (
            <Text style={[styles.location, { color: colors.textMuted }]} numberOfLines={1}>
              📍 {gym.gym_location}
            </Text>
          ) : null}
        </View>
        {isFavorite && (
          <Text style={styles.star}>⭐</Text>
        )}
      </View>

      {/* Barra de bloques activos */}
      <View style={styles.blocksRow}>
        <Text style={[styles.blocksLabel, { color: colors.textSecondary }]}>
          {blockCount}/100 bloques activos
        </Text>
        <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${blockPct * 100}%` as any,
                backgroundColor: blockPct >= 0.9 ? colors.warning : colors.primary,
              },
            ]}
          />
        </View>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  info: { flex: 1, gap: 2 },
  name: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  location: {
    fontSize: typography.size.sm,
  },
  star: { fontSize: 18 },
  blocksRow: { gap: 4 },
  blocksLabel: { fontSize: typography.size.xs },
  barTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
})

