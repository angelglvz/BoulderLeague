import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, ScrollView, ActivityIndicator, Switch, Animated, Platform,
} from 'react-native'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import { useRouter } from 'expo-router'
import { useSession } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { colors, typography, spacing, radius, shadows } from '../../../constants'

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

// ── Formateadores ────────────────────────────────────────────────────────────
function toDisplay(date: Date | null) {
  if (!date) return ''
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function toISO(date: Date | null) {
  if (!date) return ''
  return date.toISOString().split('T')[0] // YYYY-MM-DD para Supabase
}

// ── Pantalla ─────────────────────────────────────────────────────────────────
export default function CreateLeagueScreen() {
  const router = useRouter()
  const { user } = useSession()
  const toast = useToast()

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [reward, setReward] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Control del picker
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null)

  function openPicker(target: 'start' | 'end') { setPickerTarget(target) }
  function closePicker() { setPickerTarget(null) }
  function handlePickerConfirm(date: Date) {
    if (pickerTarget === 'start') setStartDate(date)
    else setEndDate(date)
    closePicker()
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'El nombre es obligatorio'
    if (!startDate) e.startDate = 'La fecha de inicio es obligatoria'
    if (!endDate) e.endDate = 'La fecha de fin es obligatoria'
    else if (startDate && endDate <= startDate) e.endDate = 'La fecha de fin debe ser posterior al inicio'
    if (isPrivate && !accessCode.trim()) e.accessCode = 'El código de acceso es obligatorio'
    if (maxParticipants && Number.isNaN(Number(maxParticipants))) e.maxParticipants = 'Debe ser un número'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCreate() {
    if (!validate()) return
    setLoading(true)

    const { data: league, error } = await supabase
      .from('leagues')
      .insert({
        name: name.trim(),
        creator_id: user!.id,
        start_date: toISO(startDate),
        end_date: toISO(endDate),
        reward: reward.trim() || null,
        is_private: isPrivate,
        access_code: isPrivate ? accessCode.trim().toUpperCase() : null,
        max_participants: maxParticipants ? Number(maxParticipants) : null,
      })
      .select()
      .single()

    if (error) {
      setLoading(false)
      toast.show('❌ Error al crear la liguilla')
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
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(app)')}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nueva liguilla</Text>
        </View>

        <View style={styles.form}>
          <Field label="Nombre" error={errors.name}>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Nombre de la liguilla"
              placeholderTextColor={colors.textMuted}
              value={name} onChangeText={setName}
            />
          </Field>

          {/* Date pickers */}
          <Field label="Fecha de inicio" error={errors.startDate}>
            <DateField
              value={startDate}
              onChange={setStartDate}
              placeholder="DD / MM / AAAA"
              onPress={() => openPicker('start')}
            />
          </Field>

          <Field label="Fecha de fin" error={errors.endDate}>
            <DateField
              value={endDate}
              onChange={setEndDate}
              placeholder="DD / MM / AAAA"
              onPress={() => openPicker('end')}
              minDate={startDate ?? undefined}
            />
          </Field>

          <Field label="Recompensa" hint="Opcional">
            <TextInput
              style={styles.input}
              placeholder="Ej: Cena en el bar del rocódromo"
              placeholderTextColor={colors.textMuted}
              value={reward} onChangeText={setReward}
            />
          </Field>

          <Field label="Máx. participantes" hint="Vacío = ilimitado" error={errors.maxParticipants}>
            <TextInput
              style={[styles.input, errors.maxParticipants && styles.inputError]}
              placeholder="Ej: 20"
              placeholderTextColor={colors.textMuted}
              value={maxParticipants} onChangeText={setMaxParticipants}
              keyboardType="numeric"
            />
          </Field>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Liguilla privada</Text>
              <Text style={styles.hint}>Acceso solo por código</Text>
            </View>
            <Switch
              value={isPrivate} onValueChange={setIsPrivate}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={colors.textInverse}
            />
          </View>

          {isPrivate && (
            <Field label="Código de acceso" error={errors.accessCode}>
              <TextInput
                style={[styles.input, errors.accessCode && styles.inputError]}
                placeholder="Ej: ESCALA24"
                placeholderTextColor={colors.textMuted}
                value={accessCode}
                onChangeText={t => setAccessCode(t.toUpperCase())}
                autoCapitalize="characters"
              />
            </Field>
          )}
        </View>

        <TouchableOpacity
          style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
          onPress={handleCreate} activeOpacity={0.8} disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={styles.buttonPrimaryText}>Crear liguilla</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Date picker modal — solo móvil */}
      {Platform.OS !== 'web' && (
        <DateTimePickerModal
          isVisible={pickerTarget !== null}
          mode="date"
          minimumDate={pickerTarget === 'end' && startDate ? startDate : new Date()}
          date={
            pickerTarget === 'end' && endDate ? endDate :
            pickerTarget === 'start' && startDate ? startDate :
            new Date()
          }
          onConfirm={handlePickerConfirm}
          onCancel={closePicker}
          locale="es_ES"
        />
      )}

      {/* Toast */}
      {toast.visible && (
        <Animated.View style={[styles.toast, { opacity: toast.opacity }]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  )
}

// ── DateField multiplataforma ────────────────────────────────────────────────
function DateField({ value, onChange, placeholder, onPress, minDate }: {
  value: Date | null
  onChange: (d: Date) => void
  placeholder: string
  onPress: () => void
  minDate?: Date
}) {
  if (Platform.OS === 'web') {
    // En web usamos el input nativo HTML type="date"
    const minISO = minDate ? toISO(minDate) : toISO(new Date())
    return (
      <View style={styles.dateButton}>
        <Text style={styles.calendarIcon}>📅</Text>
        {/* @ts-ignore — input HTML nativo en web */}
        <input
          type="date"
          value={value ? toISO(value) : ''}
          min={minISO}
          onChange={(e: any) => {
            if (e.target.value) onChange(new Date(e.target.value + 'T12:00:00'))
          }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: value ? colors.textPrimary : colors.textMuted,
            fontSize: typography.size.md,
            fontWeight: value ? '500' : '400',
            cursor: 'pointer',
            width: '100%',
          }}
        />
      </View>
    )
  }

  // En móvil usamos el botón que abre el modal
  return (
    <TouchableOpacity style={styles.dateButton} onPress={onPress} activeOpacity={0.8}>
      <Text style={value ? styles.dateText : styles.datePlaceholder}>
        {value ? toDisplay(value) : placeholder}
      </Text>
      <Text style={styles.calendarIcon}>📅</Text>
    </TouchableOpacity>
  )
}

function Field({ label, error, hint, children }: {
  label: string; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <View style={fieldStyles.group}>
      <View style={fieldStyles.labelRow}>
        <Text style={fieldStyles.label}>{label}</Text>
        {hint && <Text style={fieldStyles.hint}>{hint}</Text>}
      </View>
      {children}
      {error && <Text style={fieldStyles.error}>{error}</Text>}
    </View>
  )
}

const fieldStyles = StyleSheet.create({
  group: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { fontSize: typography.size.xs, color: colors.textMuted },
  error: { fontSize: typography.size.sm, color: colors.error },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  header: { marginBottom: spacing.xl },
  backText: { color: colors.textSecondary, fontSize: typography.size.md, marginBottom: spacing.md },
  title: { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, color: colors.textPrimary },
  form: { gap: spacing.md, marginBottom: spacing.xl },
  input: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.size.md, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  inputError: { borderColor: colors.error },
  dateButton: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: typography.size.md, color: colors.textPrimary, fontWeight: typography.weight.medium },
  datePlaceholder: { fontSize: typography.size.md, color: colors.textMuted },
  calendarIcon: { fontSize: 18 },
  label: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { fontSize: typography.size.xs, color: colors.textMuted },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  buttonPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.xl },
  buttonDisabled: { opacity: 0.6 },
  buttonPrimaryText: { color: colors.textInverse, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  toast: { position: 'absolute', bottom: spacing.xl, left: spacing.lg, right: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.primary, ...shadows.glow },
  toastText: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
})
