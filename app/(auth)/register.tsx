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
import { useRouter } from 'expo-router'
import { typography, spacing, radius } from '../../constants'
import { useTheme } from '../../lib/ThemeContext'
import { supabase } from '../../lib/supabase'

export default function RegisterScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
    passwordConfirm?: string
  }>({})

  function validate() {
    const e: typeof errors = {}
    if (!name.trim()) e.name = 'El nombre es obligatorio'
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
      options: { data: { name } },
    })
    setLoading(false)
    if (error) {
      Alert.alert('Error al registrarse', error.message)
    } else {
      Alert.alert(
        '¡Cuenta creada! 🧗',
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>Crear cuenta</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Únete a Climbify</Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            {([
              { key: 'name', label: 'Nombre', value: name, setter: setName, placeholder: 'Tu nombre', opts: { autoCapitalize: 'words' as const } },
              { key: 'email', label: 'Email', value: email, setter: setEmail, placeholder: 'tu@email.com', opts: { keyboardType: 'email-address' as const, autoCapitalize: 'none' as const } },
              { key: 'password', label: 'Contraseña', value: password, setter: setPassword, placeholder: 'Mínimo 6 caracteres', opts: { secureTextEntry: true } },
              { key: 'passwordConfirm', label: 'Confirmar contraseña', value: passwordConfirm, setter: setPasswordConfirm, placeholder: 'Repite tu contraseña', opts: { secureTextEntry: true } },
            ] as const).map(({ key, label, value, setter, placeholder, opts }) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors[key] ? colors.error : colors.border }]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={value}
                  onChangeText={setter}
                  autoCorrect={false}
                  {...opts}
                />
                {errors[key] ? <Text style={[styles.errorText, { color: colors.error }]}>{errors[key]}</Text> : null}
              </View>
            ))}
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
                <Text style={[styles.buttonPrimaryText, { color: colors.textInverse }]}>Crear cuenta</Text>
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
})
