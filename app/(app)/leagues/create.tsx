import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSession, useProfile } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { typography, spacing, radius } from '../../../constants'
import { useTheme } from '../../../lib/ThemeContext'
import { Icon } from '../../../components'

export default function CreateLeagueScreen() {
  const router = useRouter()
  const { user } = useSession()
  const { isGym } = useProfile()
  const { colors } = useTheme()

  const [name, setName]                       = useState('')
  const [reward, setReward]                   = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [isPrivate, setIsPrivate]             = useState(true)
  const [accessCode, setAccessCode]           = useState('')
  const [rankingVisibleDuring, setRankingVisibleDuring] = useState(true)
  const [loading, setLoading]                 = useState(false)
  const [errors, setErrors]                   = useState<Record<string, string>>({})
  const [generalError, setGeneralError]       = useState<string | null>(null)

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'El nombre es obligatorio'
    if (isPrivate && accessCode.trim().length < 4)
      e.accessCode = 'El código debe tener al menos 4 caracteres'
    if (maxParticipants && Number.isNaN(Number(maxParticipants)))
      e.maxParticipants = 'Debe ser un número'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const isDisabled = loading
    || !name.trim()
    || (isPrivate && accessCode.trim().length < 4)

  async function handleCreate() {
    if (!validate()) return
    setLoading(true)
    setGeneralError(null)

    const { data: league, error } = await supabase
      .from('leagues')
      .insert({
        name:                   name.trim(),
        creator_id:             user!.id,
        start_date:             null,
        end_date:               null,
        reward:                 reward.trim() || null,
        is_private:             isPrivate,
        access_code:            isPrivate ? accessCode.trim().toUpperCase() : null,
        max_participants:       maxParticipants ? Number(maxParticipants) : null,
        ranking_visible_during: rankingVisibleDuring,
      })
      .select()
      .single()

    if (error || !league) {
      setLoading(false)
      setGeneralError(`No se pudo crear la liguilla. ${error?.message ?? ''}`)
      return
    }

    // Solo los USER se auto-unen como participantes
    // Los GYM crean la liguilla pero no participan
    if (!isGym) {
      await supabase
        .from('league_participants')
        .insert({ league_id: league.id, user_id: user!.id })
    }

    setLoading(false)
    router.replace(`/(app)/leagues/${league.id}` as any)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.textSecondary} />
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Nueva liguilla</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {isGym
              ? 'Gestiona los bloques y participantes desde el detalle'
              : 'Añade los bloques y después inicia la liguilla desde el detalle'}
          </Text>
        </View>

        <View style={styles.form}>
          <Field label="Nombre" error={errors.name} colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.name ? colors.error : colors.border }]}
              placeholder="Nombre de la liguilla"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: undefined })) }}
            />
          </Field>

          <Field label="Recompensa" hint="Opcional" colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Ej: Cena en el bar del rocódromo"
              placeholderTextColor={colors.textMuted}
              value={reward}
              onChangeText={setReward}
            />
          </Field>

          <Field label="Máx. participantes" hint="Vacío = ilimitado" error={errors.maxParticipants} colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.maxParticipants ? colors.error : colors.border }]}
              placeholder="Ej: 20"
              placeholderTextColor={colors.textMuted}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="numeric"
            />
          </Field>

          <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Liguilla privada</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>Acceso solo por código</Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={colors.textInverse}
            />
          </View>

          {isPrivate && (
            <Field
              label="Código de acceso"
              hint={accessCode.trim().length < 4 ? `Mín. 4 caracteres (${accessCode.trim().length}/4)` : undefined}
              error={errors.accessCode}
              colors={colors}
            >
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.accessCode ? colors.error : colors.border }]}
                placeholder="Ej: ESCALA24"
                placeholderTextColor={colors.textMuted}
                value={accessCode}
                onChangeText={t => { setAccessCode(t.toUpperCase()); setErrors(e => ({ ...e, accessCode: undefined })) }}
                autoCapitalize="characters"
                maxLength={20}
              />
            </Field>
          )}

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
              value={rankingVisibleDuring}
              onValueChange={setRankingVisibleDuring}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={colors.textInverse}
            />
          </View>
        </View>

        {generalError && (
          <View style={[styles.errorCard, { backgroundColor: colors.error + '18', borderColor: colors.error + '40' }]}>
            <Icon name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={[styles.errorCardText, { color: colors.error }]}>{generalError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.buttonPrimary, { backgroundColor: colors.primary }, isDisabled && styles.buttonDisabled]}
          onPress={handleCreate}
          activeOpacity={isDisabled ? 1 : 0.8}
          disabled={isDisabled}
        >
          {loading
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={[styles.buttonPrimaryText, { color: colors.textInverse }]}>Crear liguilla</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function Field({ label, error, hint, children, colors }: Readonly<{
  label: string; error?: string; hint?: string; children: React.ReactNode; colors: any
}>) {
  return (
    <View style={fieldStyles.group}>
      <View style={fieldStyles.labelRow}>
        <Text style={[fieldStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        {hint && <Text style={[fieldStyles.hint, { color: colors.textMuted }]}>{hint}</Text>}
      </View>
      {children}
      {error ? <Text style={[fieldStyles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  )
}

const fieldStyles = StyleSheet.create({
  group:    { gap: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:    { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint:     { fontSize: typography.size.xs },
  error:    { fontSize: typography.size.sm },
})

const styles = StyleSheet.create({
  container:         { flex: 1 },
  scroll:            { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  header:            { marginBottom: spacing.xl },
  backButton:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.lg },
  backText:          { fontSize: typography.size.md },
  title:             { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  subtitle:          { fontSize: typography.size.sm, marginTop: spacing.xs },
  form:              { gap: spacing.md, marginBottom: spacing.xl },
  input:             { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.size.md, borderWidth: 1 },
  label:             { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint:              { fontSize: typography.size.xs },
  switchRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  buttonPrimary:     { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.xl },
  buttonDisabled:    { opacity: 0.6 },
  buttonPrimaryText: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  errorCard:         { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, marginBottom: spacing.md },
  errorCardText:     { fontSize: typography.size.sm, flex: 1 },
})
