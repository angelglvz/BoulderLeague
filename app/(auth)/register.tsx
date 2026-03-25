import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { typography, spacing, radius } from '../../constants'
import { useTheme } from '../../lib/ThemeContext'
import { supabase } from '../../lib/supabase'

type AccountType = 'user' | 'gym'

export default function RegisterScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const params = useLocalSearchParams<{ account_type?: string }>()
  const accountType: AccountType = params.account_type === 'gym' ? 'gym' : 'user'

  const isGym = accountType === 'gym'

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    location?: string
    email?: string
    password?: string
    passwordConfirm?: string
  }>({})

  function validate() {
    const e: typeof errors = {}
    if (!name.trim()) e.name = isGym ? 'El nombre del rocódromo es obligatorio' : 'El nombre es obligatorio'
    if (isGym && !location.trim()) e.location = 'La ubicación es obligatoria'
    if (!email.trim()) e.email = 'El email es obligatorio'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email no válido'
    if (!password) e.password = 'La contraseña es obligatoria'
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres'
    if (!passwordConfirm) e.passwordConfirm = 'Confirma tu contraseña'
    else if (password !== passwordConfirm) e.passwordConfirm = 'Las contraseñas no coinciden'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleRegister() {
    if (!validate()) return
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          account_type: accountType,
          ...(isGym && { gym_location: location }),
        },
      },
    })
    setLoading(false)
    if (error) {
      // Traducir los mensajes más comunes de Supabase
      const msg = error.message.toLowerCase()
      let friendly = error.message
      if (msg.includes('already registered') || msg.includes('user already exists')) {
        friendly = 'Este email ya está registrado. Prueba a iniciar sesión.'
      } else if (msg.includes('password') && msg.includes('characters')) {
        friendly = 'La contraseña debe tener al menos 8 caracteres (requisito del servidor).'
      } else if (msg.includes('invalid email')) {
        friendly = 'El formato del email no es válido.'
      } else if (msg.includes('email rate limit')) {
        friendly = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
      }
      Alert.alert('Error al registrarse', friendly)
    } else {
      Alert.alert(
        isGym ? '¡Rocódromo registrado! 🏢' : '¡Cuenta creada! 🧗',
        'Ya puedes iniciar sesión con tu email y contraseña.',
        [{ text: 'Entrar', onPress: () => router.replace('/(auth)/login') }],
      )
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={[styles.backText, { color: colors.textSecondary }]}>← Volver</Text>
            </TouchableOpacity>
            <Image
              source={isDark
                ? require('../../assets/logo-climbify.png')
                : require('../../assets/logo-climbify-light.png')
              }
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {isGym ? 'Registrar rocódromo' : 'Crear cuenta'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isGym ? 'Gestiona tus bloques y liguillas 🏢' : 'Únete a Climbify 🧗'}
            </Text>
          </View>

          {/* Badge de tipo de cuenta */}
          <View style={[styles.typeBadge, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
            <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
              {isGym ? '🏢 Cuenta de rocódromo' : '🧗 Cuenta de escalador'}
            </Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            {/* Nombre */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {isGym ? 'Nombre del rocódromo' : 'Nombre'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.name ? colors.error : colors.border }]}
                placeholder={isGym ? 'Ej: Boulder Park Madrid' : 'Tu nombre'}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {errors.name ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text> : null}
            </View>

            {/* Ubicación (solo GYM) */}
            {isGym && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Ubicación</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.location ? colors.error : colors.border }]}
                  placeholder="Ciudad, País"
                  placeholderTextColor={colors.textMuted}
                  value={location}
                  onChangeText={setLocation}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                {errors.location ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.location}</Text> : null}
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.email ? colors.error : colors.border }]}
                placeholder="tu@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCorrect={false}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {errors.email ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text> : null}
            </View>

            {/* Contraseña */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Contraseña</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.password ? colors.error : colors.border }]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                autoCorrect={false}
                secureTextEntry
              />
              {errors.password ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.password}</Text> : null}
            </View>

            {/* Confirmar contraseña */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Confirmar contraseña</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.passwordConfirm ? colors.error : colors.border }]}
                placeholder="Repite tu contraseña"
                placeholderTextColor={colors.textMuted}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                autoCorrect={false}
                secureTextEntry
              />
              {errors.passwordConfirm ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.passwordConfirm}</Text> : null}
            </View>
          </View>

          {/* Botones */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.buttonPrimary, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={[styles.buttonPrimaryText, { color: colors.textInverse }]}>
                  {isGym ? 'Registrar rocódromo' : 'Crear cuenta'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                ¿Ya tienes cuenta?{' '}
                <Text style={[styles.linkTextBold, { color: colors.primary }]}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  logo: {
    width: 240,
    height: 66,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  backButton: {
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: typography.size.md,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.md,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.md,
    borderWidth: 1,
  },
  errorText: {
    fontSize: typography.size.sm,
  },
  actions: {
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  buttonPrimary: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPrimaryText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  linkText: {
    fontSize: typography.size.md,
  },
  linkTextBold: {
    fontWeight: typography.weight.bold,
  },
  typeBadge: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
})
