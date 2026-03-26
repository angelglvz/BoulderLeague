import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Icon } from './Icon'
import { useTheme } from '../lib/ThemeContext'
import { spacing } from '../constants'

interface StarRatingProps {
  /** Valoración actual (1-5). null = sin valorar */
  value: number | null
  /** Modo escritura. Si false, solo lectura */
  onChange?: (rating: number) => void
  /** Tamaño de las estrellas */
  size?: number
}

export function StarRating({ value, onChange, size = 24 }: StarRatingProps) {
  const { colors } = useTheme()
  const readonly = !onChange

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value !== null && star <= value
        if (readonly) {
          return (
            <Icon
              key={star}
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? '#F5C518' : colors.textMuted}
            />
          )
        }
        return (
          <TouchableOpacity
            key={star}
            onPress={() => onChange(star)}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Icon
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? '#F5C518' : colors.textMuted}
            />
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
})

