import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { typography, spacing, radius, shadows } from '../../constants'
import { useTheme } from '../../lib/ThemeContext'

export default function WelcomeScreen() {
  const router = useRouter()
  const { colors } = useTheme()

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.emoji}>🧗</Text>
        <Text style={[styles.title, { color: colors.primary }]}>BoulderLeague</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Crea liguillas, escala bloques{'\n'}y compite con tus amigos
        </Text>
      </View>

      {/* Features */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <FeatureRow emoji="🏆" text="Crea o únete a liguillas privadas" colors={colors} />
        <FeatureRow emoji="📸" text="Registra bloques con foto y dificultad" colors={colors} />
        <FeatureRow emoji="📊" text="Ranking en tiempo real" colors={colors} />
        <FeatureRow emoji="🔥" text="Puntuación por flash y pegues" colors={colors} />
      </View>

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.buttonPrimary, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={[styles.buttonPrimaryText, { color: colors.textInverse }]}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonSecondary, { borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={[styles.buttonSecondaryText, { color: colors.textSecondary }]}>Ya tengo cuenta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function FeatureRow({ emoji, text, colors }: { emoji: string; text: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={[styles.featureText, { color: colors.textPrimary }]}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.size.md,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
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
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  actions: {
    gap: spacing.sm,
  },
  buttonPrimary: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.glow,
  },
  buttonPrimaryText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonSecondaryText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
  },
})
