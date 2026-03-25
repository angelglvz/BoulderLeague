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
import { calcScore, GOES_LABELS, goesFromDB, type Goes } from '../../../../lib/scoring'
import { typography, spacing, radius } from '../../../../constants'
import { useTheme } from '../../../../lib/ThemeContext'
import type { Block, Attempt } from '../../../../types'

const GOES_OPTIONS: Goes[] = [0, 1, 2, 3, 4, 5, 6]

// Estado de la liga respecto al registro de resultados
type LeagueStatus = 'not_started' | 'in_progress' | 'finished'

export default function LogAttemptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()

  const [block, setBlock] = useState<Block | null>(null)
  const [existingAttempt, setExistingAttempt] = useState<Attempt | null>(null)
  const [selectedGoes, setSelectedGoes] = useState<Goes>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [leagueStatus, setLeagueStatus] = useState<LeagueStatus>('not_started')

  useEffect(() => {
    if (id) loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      // Sesión actual
      const { data: sessionData } = await supabase.auth.getSession()
      const uid = sessionData.session?.user?.id ?? null
      setUserId(uid)

      // Datos del bloque
      const { data: blockData } = await supabase
        .from('blocks')
        .select('*')
        .eq('id', id)
        .single()

      if (blockData) {
        setBlock(blockData)

        // Estado de la liga del bloque
        const { data: leagueData } = await supabase
          .from('leagues')
          .select('start_date, end_date')
          .eq('id', blockData.league_id)
          .single()

        if (leagueData) {
          const now = new Date()
          if (!leagueData.start_date) {
            setLeagueStatus('not_started')
          } else if (now < new Date(leagueData.start_date)) {
            setLeagueStatus('not_started')
          } else if (leagueData.end_date && now > new Date(leagueData.end_date)) {
            setLeagueStatus('finished')
          } else {
            setLeagueStatus('in_progress')
          }
        }
      }

      // Intento existente del usuario
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
    if (existingAttempt) return // seguridad extra: no permitir modificar

    const score = calcScore(selectedGoes, block.difficulty)
    setSaving(true)

    try {
      const { error } = await supabase
        .from('attempts')
        .insert({
          user_id: userId,
          block_id: block.id,
          number_of_goes: selectedGoes,
          score,
        })

      if (error) throw error
      router.replace(`/(app)/blocks/${block.id}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      alert('❌ ' + msg)
    } finally {
      setSaving(false)
    }
  }

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
        <Text style={[styles.errorText, { color: colors.error }]}>Bloque no encontrado</Text>
      </View>
    )
  }

  if (leagueStatus === 'not_started') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.blockedScreen}>
          <TouchableOpacity onPress={() => router.replace(`/(app)/blocks/${id}`)} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>← Volver</Text>
          </TouchableOpacity>
          <View style={styles.blockedCard}>
            <Text style={styles.blockedEmoji}>⏳</Text>
            <Text style={[styles.blockedTitle, { color: colors.textPrimary }]}>La liguilla aún no ha comenzado</Text>
            <Text style={[styles.blockedSubtitle, { color: colors.textMuted }]}>
              Podrás registrar tus resultados una vez que el creador inicie la liguilla.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (leagueStatus === 'finished') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.blockedScreen}>
          <TouchableOpacity onPress={() => router.replace(`/(app)/blocks/${id}`)} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>← Volver</Text>
          </TouchableOpacity>
          <View style={styles.blockedCard}>
            <Text style={styles.blockedEmoji}>🏁</Text>
            <Text style={[styles.blockedTitle, { color: colors.textPrimary }]}>La liguilla ha finalizado</Text>
            <Text style={[styles.blockedSubtitle, { color: colors.textMuted }]}>
              El período de registro de resultados ha terminado.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.replace(`/(app)/blocks/${id}`)} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Volver</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.textPrimary }]}>✍️ Registrar resultado</Text>
        <Text style={[styles.blockName, { color: colors.textSecondary }]}>{block.identifier}</Text>

        {existingAttempt ? (
          <View style={[styles.lockedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.lockedIcon}>🔒</Text>
            <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>Resultado ya registrado</Text>
            <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
              Solo se puede registrar un resultado por bloque.{'\n'}
              Una vez guardado no se puede modificar.
            </Text>
            <View style={[styles.lockedResult, { backgroundColor: colors.background }]}>
              <Text style={[styles.lockedResultLabel, { color: colors.textMuted }]}>Tu resultado:</Text>
              <Text style={[styles.lockedResultValue, { color: colors.primary }]}>
                {existingAttempt.number_of_goes === 0
                  ? 'Sin encadenar'
                  : existingAttempt.number_of_goes === 1
                  ? '⚡ Flash'
                  : existingAttempt.number_of_goes >= 6
                  ? '+5 pegues'
                  : `${existingAttempt.number_of_goes} pegues`}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.backFullButton, { borderColor: colors.border }]}
              onPress={() => router.replace(`/(app)/blocks/${id}`)}
              activeOpacity={0.8}
            >
              <Text style={[styles.backFullButtonText, { color: colors.textSecondary }]}>← Volver al bloque</Text>
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
                    onPress={() => setSelectedGoes(g)}
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

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>💾 Guardar resultado</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  centered:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:             { padding: spacing.lg, gap: spacing.lg },
  backButton:         { marginBottom: spacing.xs },
  backText:           { fontSize: typography.size.md },
  title:              { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  blockName:          { fontSize: typography.size.lg, marginTop: -spacing.sm },
  lockedCard:         { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.md, borderWidth: 1 },
  lockedIcon:         { fontSize: 40 },
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
  blockedScreen:      { flex: 1, padding: spacing.lg },
  blockedCard:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  blockedEmoji:       { fontSize: 64 },
  blockedTitle:       { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, textAlign: 'center' },
  blockedSubtitle:    { fontSize: typography.size.md, textAlign: 'center', lineHeight: 22 },
})
