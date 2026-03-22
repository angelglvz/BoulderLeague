import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useSession } from '../../hooks'
import { colors, typography, spacing, radius } from '../../constants'

// Placeholder — se sustituirá en la Fase 3 por el Home real
export default function HomeScreen() {
  const { user, signOut } = useSession()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧗 BoulderLeague</Text>
      <Text style={styles.subtitle}>Hola, {user?.email}</Text>
      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.primary,
  },
  subtitle: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.error,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
})

