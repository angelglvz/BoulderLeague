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
import { useState } from 'react'
import { typography, spacing, radius, shadows } from '../../constants'
import { useTheme } from '../../lib/ThemeContext'

type AccountType = 'user' | 'gym'

export default function WelcomeScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const [selectedType, setSelectedType] = useState<AccountType | null>(null)

  const handleCreateAccount = () => {
    if (!selectedType) return
    router.push({ pathname: '/(auth)/register', params: { account_type: selectedType } })
  }

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

      {/* Selección de tipo de cuenta */}
      <View style={styles.typeSection}>
        <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
          ¿Cómo quieres usar Climbify?
        </Text>
        <View style={styles.typeButtons}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              selectedType === 'user' && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
            ]}
            activeOpacity={0.8}
            onPress={() => setSelectedType('user')}
          >
            <Text style={styles.typeEmoji}>🧗</Text>
            <Text style={[styles.typeButtonTitle, { color: colors.textPrimary }]}>Soy escalador</Text>
            <Text style={[styles.typeButtonDesc, { color: colors.textSecondary }]}>
              Registra intentos,{'\n'}únete a liguillas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              selectedType === 'gym' && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
            ]}
            activeOpacity={0.8}
            onPress={() => setSelectedType('gym')}
          >
            <Text style={styles.typeEmoji}>🏢</Text>
            <Text style={[styles.typeButtonTitle, { color: colors.textPrimary }]}>Soy un rocódromo</Text>
            <Text style={[styles.typeButtonDesc, { color: colors.textSecondary }]}>
              Gestiona bloques{'\n'}y liguillas oficiales
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.buttonPrimary,
            { backgroundColor: colors.primary },
            !selectedType && { opacity: 0.4 },
          ]}
          activeOpacity={0.8}
          onPress={handleCreateAccount}
          disabled={!selectedType}
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
    marginBottom: spacing.xl,
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
  typeSection: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  typeLabel: {
    fontSize: typography.size.sm,
    textAlign: 'center',
    fontWeight: typography.weight.medium,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeButton: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  typeEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  typeButtonTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  typeButtonDesc: {
    fontSize: typography.size.xs,
    textAlign: 'center',
    lineHeight: typography.size.xs * typography.lineHeight.relaxed,
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
