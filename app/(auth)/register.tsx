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
  Modal,
  FlatList,
} from 'react-native'
import { useRouter } from 'expo-router'
import { typography, spacing, radius } from '../../constants'
import { useTheme } from '../../lib/ThemeContext'
import { supabase } from '../../lib/supabase'

type AccountType = 'user' | 'gym'

// Lista de países con código y nombre
const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CH', name: 'Suiza' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'PL', name: 'Polonia' },
  { code: 'CZ', name: 'República Checa' },
  { code: 'SK', name: 'Eslovaquia' },
  { code: 'SI', name: 'Eslovenia' },
  { code: 'HR', name: 'Croacia' },
  { code: 'GR', name: 'Grecia' },
  { code: 'RO', name: 'Rumanía' },
  { code: 'HU', name: 'Hungría' },
  { code: 'NO', name: 'Noruega' },
  { code: 'SE', name: 'Suecia' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japón' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'ZA', name: 'Sudáfrica' },
  { code: 'CA', name: 'Canadá' },
]

export default function RegisterScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()

  const [accountType, setAccountType] = useState<AccountType>('user')
  const isGym = accountType === 'gym'

  // Campos comunes
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // Campos usuario
  const [nick, setNick] = useState('')

  // Campos gimnasio
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [countryModalVisible, setCountryModalVisible] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = isGym ? 'El nombre del rocódromo es obligatorio' : 'El nombre es obligatorio'
    if (!isGym && !nick.trim()) e.nick = 'El alias es obligatorio'
    if (isGym && !country) e.country = 'El país es obligatorio'
    if (isGym && !city.trim()) e.city = 'La ciudad es obligatoria'
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
          ...(!isGym && { nick }),
          ...(isGym && { gym_location: `${city}, ${country}` }),
          ...(isGym && { gym_country: country }),
          ...(isGym && { gym_city: city }),
        },
      },
    })
    setLoading(false)
    if (error) {
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>Crear cuenta</Text>
          </View>

          {/* Tabs de tipo de cuenta */}
          <View style={[styles.tabContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                accountType === 'user' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setAccountType('user')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.tabText,
                { color: accountType === 'user' ? colors.textInverse : colors.textSecondary },
              ]}>
                Escalador
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                accountType === 'gym' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setAccountType('gym')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.tabText,
                { color: accountType === 'gym' ? colors.textInverse : colors.textSecondary },
              ]}>
                Rocódromo
              </Text>
            </TouchableOpacity>
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
                placeholder={isGym ? 'Ej: Boulder Park Madrid' : 'Tu nombre completo'}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {errors.name ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text> : null}
            </View>

            {/* Alias/Nick — solo usuarios */}
            {!isGym && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Alias</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.nick ? colors.error : colors.border }]}
                  placeholder="Ej: bloc_king, vertical_v"
                  placeholderTextColor={colors.textMuted}
                  value={nick}
                  onChangeText={setNick}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {errors.nick ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.nick}</Text> : null}
              </View>
            )}

            {/* País — solo gimnasio */}
            {isGym && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>País</Text>
                <TouchableOpacity
                  style={[styles.input, styles.selector, { backgroundColor: colors.surfaceAlt, borderColor: errors.country ? colors.error : colors.border }]}
                  onPress={() => setCountryModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: country ? colors.textPrimary : colors.textMuted, fontSize: typography.size.md }}>
                    {country ? COUNTRIES.find(c => c.code === country)?.name : 'Selecciona un país'}
                  </Text>
                  <Text style={{ color: colors.textMuted }}>▾</Text>
                </TouchableOpacity>
                {errors.country ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.country}</Text> : null}
              </View>
            )}

            {/* Ciudad — solo gimnasio */}
            {isGym && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Ciudad</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.city ? colors.error : colors.border }]}
                  placeholder="Ej: Madrid, Barcelona"
                  placeholderTextColor={colors.textMuted}
                  value={city}
                  onChangeText={setCity}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                {errors.city ? <Text style={[styles.errorText, { color: colors.error }]}>{errors.city}</Text> : null}
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

      {/* Modal selector de país */}
      <Modal
        visible={countryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Selecciona un país</Text>
              <TouchableOpacity onPress={() => setCountryModalVisible(false)}>
                <Text style={[styles.modalClose, { color: colors.primary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalSearch, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Buscar país..."
              placeholderTextColor={colors.textMuted}
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoCorrect={false}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, { borderBottomColor: colors.border }, country === item.code && { backgroundColor: colors.primaryMuted }]}
                  onPress={() => {
                    setCountry(item.code)
                    setCountryModalVisible(false)
                    setCountrySearch('')
                  }}
                >
                  <Text style={[styles.countryName, { color: colors.textPrimary }]}>{item.name}</Text>
                  {country === item.code && <Text style={{ color: colors.primary }}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  tabContainer: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
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
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '75%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  modalClose: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  modalSearch: {
    margin: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.md,
    borderWidth: 1,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryName: {
    fontSize: typography.size.md,
  },
})
