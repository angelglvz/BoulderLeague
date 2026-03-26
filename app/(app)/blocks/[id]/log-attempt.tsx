import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../../lib/supabase'
import { calcScore, resultFromGoes, GOES_LABELS, goesFromDB, type Goes } from '../../../../lib/scoring'
import { typography, spacing, radius } from '../../../../constants'
import { useTheme } from '../../../../lib/ThemeContext'
import { Icon } from '../../../../components'
import type { Block, Attempt } from '../../../../types'

const GOES_OPTIONS: Goes[] = [0, 1, 2, 3, 4, 5, 6]

type LeagueStatus = 'not_started' | 'in_progress' | 'finished' | null

export default function LogAttemptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()

  function goBack() {
    router.replace(`/(app)/blocks/${id}` as any)
  }

  const [block, setBlock] = useState<Block | null>(null)
  const [existingAttempt, setExistingAttempt] = useState<Attempt | null>(null)
  const [selectedGoes, setSelectedGoes] = useState<Goes>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  // null = sin liguilla (siempre disponible) | string = estado de la liguilla
  const [leagueStatus, setLeagueStatus] = useState<LeagueStatus>(null)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const uid = sessionData.session?.user?.id ?? null
      setUserId(uid)

      const { data: blockData } = await supabase
        .from('blocks')
        .select('*')
        .eq('id', id)
        .single()

      if (blockData) {
        setBlock(blockData)

        if (blockData.league_id) {
          // Bloque de liguilla → cargar estado
          const { data: leagueData } = await supabase
            .from('leagues')
            .select('start_date, end_date')
            .eq('id', blockData.league_id)
            .single()

          if (leagueData) {
            const now = new Date()
            if (!leagueData.start_date || now < new Date(leagueData.start_date)) {
              setLeagueStatus('not_started')
            } else if (leagueData.end_date && now > new Date(leagueData.end_date)) {
              setLeagueStatus('finished')
            } else {
              setLeagueStatus('in_progress')
            }
          } else {
            // Liga no encontrada — tratar como no iniciada
            setLeagueStatus('not_started')
          }
        } else {
          // Bloque de gym sin liguilla → siempre disponible
          setLeagueStatus('in_progress')
        }
      }

      if (uid) {
        const { data: attemptData } = await supabase
          .from('attempts')
          .select('*')
          .eq('block_id', id)
          .eq('user_id', uid)
          .maybeSingle()

        if (attemptData) {
          setExistingAttempt(attemptData)
          setSelectedGoes(goesFromDB(attemptData.number_of_goes))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!userId || !block) return
    if (existingAttempt) return

    const result = resultFromGoes(selectedGoes)
    const score = calcScore(result, selectedGoes, block.difficulty)
    setSaving(true)
    setSaveError(null)

    try {
      const { error } = await supabase
        .from('attempts')
        .insert({
          user_id: userId,
          block_id: block.id,
          result,
          number_of_goes: selectedGoes,
          score,
        })

      if (error) throw error
      router.replace(`/(app)/blocks/${block.id}` as any)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar el resultado')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!block) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Icon name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>Bloque no encontrado</Text>
      </View>
    )
  }

  // ── Liguilla no iniciada ──
  if (leagueStatus === 'not_started') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.blockedScreen}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.blockedCard}>
            <Icon name="time-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.blockedTitle, { color: colors.textPrimary }]}>La liguilla aún no ha comenzado</Text>
            <Text style={[styles.blockedSubtitle, { color: colors.textMuted }]}>
              Podrás registrar tus resultados una vez que el creador inicie la liguilla.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── Liguilla finalizada ──
  if (leagueStatus === 'finished') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.blockedScreen}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.blockedCard}>
            <Icon name="flag-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.blockedTitle, { color: colors.textPrimary }]}>La liguilla ha finalizado</Text>
            <Text style={[styles.blockedSubtitle, { color: colors.textMuted }]}>
              El período de registro de resultados ha terminado.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── Formulario de registro ──
  function goesResultLabel(goes: number): string {
    if (goes === 0) return 'Sin encadenar'
    if (goes === 1) return 'Flash'
    if (goes >= 6) return '+5 pegues'
    return `${goes} pegues`
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Registrar resultado</Text>
        <Text style={[styles.blockName, { color: colors.textSecondary }]}>{block.identifier}</Text>

        {existingAttempt ? (
          <View style={[styles.lockedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="lock-closed-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>Resultado ya registrado</Text>
            <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
              Solo se puede registrar un resultado por bloque.{'\n'}Una vez guardado no se puede modificar.
            </Text>
            <View style={[styles.lockedResult, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.lockedResultLabel, { color: colors.textMuted }]}>Tu resultado</Text>
              <Text style={[styles.lockedResultValue, { color: colors.primary }]}>
                {goesResultLabel(existingAttempt.number_of_goes)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.backFullButton, { borderColor: colors.border }]}
              onPress={goBack}
              activeOpacity={0.8}
            >
              <Text style={[styles.backFullButtonText, { color: colors.textSecondary }]}>Volver al bloque</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>¿Cuántos pegues necesitaste?</Text>
            <View style={styles.optionsGrid}>
              {GOES_OPTIONS.map((g) => {
                const isSelected = g === selectedGoes
                return (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.option,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
                    ]}
                    onPress={() => { setSelectedGoes(g); setSaveError(null) }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: isSelected ? colors.primary : colors.textSecondary },
                      isSelected && { fontWeight: typography.weight.bold },
                    ]}>
                      {GOES_LABELS[g]}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {saveError && (
              <View style={[styles.errorCard, { backgroundColor: colors.error + '18', borderColor: colors.error + '40' }]}>
                <Icon name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={[styles.errorCardText, { color: colors.error }]}>{saveError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={colors.textInverse} />
                : <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>Guardar resultado</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  centered:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  scroll:             { padding: spacing.lg, gap: spacing.lg },
  backButton:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  backText:           { fontSize: typography.size.md },
  title:              { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  blockName:          { fontSize: typography.size.lg, marginTop: -spacing.sm },
  lockedCard:         { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.md, borderWidth: 1 },
  lockedTitle:        { fontSize: typography.size.xl, fontWeight: typography.weight.bold, textAlign: 'center' },
  lockedText:         { fontSize: typography.size.sm, textAlign: 'center', lineHeight: 20 },
  lockedResult:       { borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignItems: 'center', gap: spacing.xs, width: '100%' },
  lockedResultLabel:  { fontSize: typography.size.xs, textTransform: 'uppercase', letterSpacing: 1 },
  lockedResultValue:  { fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  backFullButton:     { marginTop: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderRadius: radius.lg, borderWidth: 1 },
  backFullButtonText: { fontSize: typography.size.md },
  sectionLabel:       { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  optionsGrid:        { gap: spacing.sm },
  option:             { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 2, alignItems: 'center' },
  optionText:         { fontSize: typography.size.md, fontWeight: typography.weight.medium },
  saveButton:         { borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText:     { fontSize: typography.size.md, fontWeight: typography.weight.bold },
  errorText:          { fontSize: typography.size.md },
  errorCard:          { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  errorCardText:      { fontSize: typography.size.sm, flex: 1 },
  blockedScreen:      { flex: 1, padding: spacing.lg },
  blockedCard:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  blockedTitle:       { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, textAlign: 'center' },
  blockedSubtitle:    { fontSize: typography.size.md, textAlign: 'center', lineHeight: 22, color: 'inherit' },
})
