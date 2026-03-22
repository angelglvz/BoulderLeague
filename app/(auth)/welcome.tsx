import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { colors, typography, spacing, radius, shadows } from '../../constants'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.emoji}>🧗</Text>
        <Text style={styles.title}>BoulderLeague</Text>
        <Text style={styles.subtitle}>
          Crea liguillas, escala bloques{'\n'}y compite con tus amigos
        </Text>
      </View>

      {/* Features */}
      <View style={styles.card}>
        <FeatureRow emoji="🏆" text="Crea o únete a liguillas privadas" />
        <FeatureRow emoji="📸" text="Registra bloques con foto y dificultad" />
        <FeatureRow emoji="📊" text="Ranking en tiempo real" />
        <FeatureRow emoji="🔥" text="Puntuación por flash y pegues" />
      </View>

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          activeOpacity={0.8}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.buttonPrimaryText}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonSecondary}
          activeOpacity={0.8}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.buttonSecondaryText}>Ya tengo cuenta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function FeatureRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emoji: {
    fontSize: 72,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.primary,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureEmoji: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    fontSize: typography.size.md,
    color: colors.textPrimary,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  actions: {
    gap: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.glow,
  },
  buttonPrimaryText: {
    color: colors.textInverse,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSecondaryText: {
    color: colors.textSecondary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
  },
})

