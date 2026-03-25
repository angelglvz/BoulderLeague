import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Switch, Animated, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSession } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { typography, spacing, radius, shadows } from '../../../constants'
import { useTheme } from '../../../lib/ThemeContext'
import { Icon } from '../../../components'

const nativeDriver = Platform.OS !== 'web'

// ── Toast simple ────────────────────────────────────────────────────────────
function useToast() {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const opacity = useState(new Animated.Value(0))[0]

  function show(msg: string) {
    setMessage(msg)
    setVisible(true)
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: nativeDriver }),
      Animated.delay(2000),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: nativeDriver }),
    ]).start(() => setVisible(false))
  }

  return { visible, message, opacity, show }
}

// ── Pantalla ─────────────────────────────────────────────────────────────────
export default function CreateLeagueScreen() {
  const router = useRouter()
  const { user } = useSession()
  const { colors } = useTheme()
  const toast = useToast()

  const [name, setName] = useState('')
  const [reward, setReward] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [accessCode, setAccessCode] = useState('')
  const [rankingVisibleDuring, setRankingVisibleDuring] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'El nombre es obligatorio'
    if (isPrivate && !accessCode.trim()) e.accessCode = 'El código de acceso es obligatorio'
    if (maxParticipants && Number.isNaN(Number(maxParticipants))) e.maxParticipants = 'Debe ser un número'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCreate() {
    if (!validate()) return
    setLoading(true)
    setGeneralError(null)

    const { data: league, error } = await supabase
      .from('leagues')
      .insert({
        name: name.trim(),
        creator_id: user!.id,
        start_date: null,
        end_date: null,
        reward: reward.trim() || null,
        is_private: isPrivate,
        access_code: isPrivate ? accessCode.trim().toUpperCase() : null,
        max_participants: maxParticipants ? Number(maxParticipants) : null,
        ranking_visible_during: rankingVisibleDuring,
      })
      .select()
      .single()

    if (error) {
      setLoading(false)
      setGeneralError(`No se pudo crear la liguilla. ${error.message ?? ''}`)
      return
    }

    await supabase
      .from('league_participants')
      .insert({ league_id: league.id, user_id: user!.id })

    setLoading(false)
    toast.show('🏆 ¡Liguilla creada correctamente!')

    setTimeout(() => {
      router.replace(`/(app)/leagues/${league.id}`)
    }, 1800)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(app)')} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.textSecondary} />
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Nueva liguilla</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Añade los bloques y después inicia la liguilla desde el detalle</Text>
        </View>

        <View style={styles.form}>
          <Field label="Nombre" error={errors.name} colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.name ? colors.error : colors.border }]}
              placeholder="Nombre de la liguilla"
              placeholderTextColor={colors.textMuted}
              value={name} onChangeText={setName}
            />
          </Field>

          <Field label="Recompensa" hint="Opcional" colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Ej: Cena en el bar del rocódromo"
              placeholderTextColor={colors.textMuted}
              value={reward} onChangeText={setReward}
            />
          </Field>

          <Field label="Máx. participantes" hint="Vacío = ilimitado" error={errors.maxParticipants} colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.maxParticipants ? colors.error : colors.border }]}
              placeholder="Ej: 20"
              placeholderTextColor={colors.textMuted}
              value={maxParticipants} onChangeText={setMaxParticipants}
              keyboardType="numeric"
            />
          </Field>

          <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Liguilla privada</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>Acceso solo por código</Text>
            </View>
            <Switch
              value={isPrivate} onValueChange={setIsPrivate}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={colors.textInverse}
            />
          </View>

          <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Ranking visible durante la liguilla</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                {rankingVisibleDuring
                  ? 'Todos los participantes verán el ranking en tiempo real'
                  : 'El ranking se revelará solo al terminar la liguilla'}
              </Text>
            </View>
            <Switch
              value={rankingVisibleDuring} onValueChange={setRankingVisibleDuring}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={colors.textInverse}
            />
          </View>

          {isPrivate && (
            <Field label="Código de acceso" error={errors.accessCode} colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.accessCode ? colors.error : colors.border }]}
                placeholder="Ej: ESCALA24"
                placeholderTextColor={colors.textMuted}
                value={accessCode}
                onChangeText={t => setAccessCode(t.toUpperCase())}
                autoCapitalize="characters"
              />
            </Field>
          )}
        </View>

        {/* Error general */}
        {generalError && (
          <View style={[styles.errorCard, { backgroundColor: colors.error + '18', borderColor: colors.error + '40' }]}>
            <Text style={[styles.errorCardText, { color: colors.error }]}>⚠️ {generalError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.buttonPrimary, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleCreate} activeOpacity={0.8} disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={[styles.buttonPrimaryText, { color: colors.textInverse }]}>Crear liguilla</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Toast */}
      {toast.visible && (
        <Animated.View style={[styles.toast, { opacity: toast.opacity, backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <Text style={[styles.toastText, { color: colors.textPrimary }]}>{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  )
}

function Field({ label, error, hint, children, colors }: {
  label: string; error?: string; hint?: string; children: React.ReactNode; colors: any
}) {
  return (
    <View style={fieldStyles.group}>
      <View style={fieldStyles.labelRow}>
        <Text style={[fieldStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        {hint && <Text style={[fieldStyles.hint, { color: colors.textMuted }]}>{hint}</Text>}
      </View>
      {children}
      {error && <Text style={[fieldStyles.error, { color: colors.error }]}>{error}</Text>}
    </View>
  )
}

const fieldStyles = StyleSheet.create({
  group: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { fontSize: typography.size.xs },
  error: { fontSize: typography.size.sm },
})

const styles = StyleSheet.create({
  container:          { flex: 1 },
  scroll:             { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  header:             { marginBottom: spacing.xl },
  backButton:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.lg },
  backText:           { fontSize: typography.size.md },
  title:              { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  subtitle:           { fontSize: typography.size.sm, marginTop: spacing.xs },
  form:               { gap: spacing.md, marginBottom: spacing.xl },
  input:              { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.size.md, borderWidth: 1 },
  label:              { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint:               { fontSize: typography.size.xs },
  switchRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  buttonPrimary:      { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.xl },
  buttonDisabled:     { opacity: 0.6 },
  buttonPrimaryText:  { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  errorCard:          { borderRadius: radius.md, padding: spacing.md, borderWidth: 1, marginBottom: spacing.md },
  errorCardText:      { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  toast:              { position: 'absolute', bottom: spacing.xl, left: spacing.lg, right: spacing.lg, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', borderWidth: 1, ...shadows.glow },
  toastText:          { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
})
