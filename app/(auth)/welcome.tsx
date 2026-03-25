import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { typography, spacing, radius, shadows } from '../../constants'
import { useTheme } from '../../lib/ThemeContext'

export default function WelcomeScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Hero */}
      <View style={styles.hero}>
        <Image
          source={isDark
            ? require('../../assets/logo-climbify.png')
            : require('../../assets/logo-climbify-light.png')
          }
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Crea liguillas, escala bloques{'\n'}y compite con tus amigos
        </Text>
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


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  logo: {
    width: 320,
    height: 88,
  },
  subtitle: {
    fontSize: typography.size.md,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
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
