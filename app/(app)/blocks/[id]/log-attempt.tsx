import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, ScrollView, TextInput,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../../lib/supabase'
import { calcScore, resultFromGoes, goesFromDB, type Goes } from '../../../../lib/scoring'
import { evaluateAchievements, type MedalDefinition } from '../../../../lib/achievements'
import { typography, spacing, radius } from '../../../../constants'
import { useTheme } from '../../../../lib/ThemeContext'
import { Icon, StarRating, AchievementToast } from '../../../../components'
import type { Block, Attempt } from '../../../../types'

// Fila 1: solo Flash | Fila 2: 2×, 3×, 4×, +5×
const GOES_ROW1: Goes[] = [1]
const GOES_ROW2: Goes[] = [2, 3, 4, 6]
const GOES_SHORT: Record<Goes, string> = { 1: 'Flash', 2: '2×', 3: '3×', 4: '4×', 5: '5×', 6: '+5×' }

type LeagueStatus = 'not_started' | 'in_progress' | 'finished' | null

export default function LogAttemptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()

  function goBack() { router.replace(`/(app)/blocks/${id}` as any) }

  const [block, setBlock] = useState<Block | null>(null)
  const [existingAttempt, setExistingAttempt] = useState<Attempt | null>(null)
  const [selectedGoes, setSelectedGoes] = useState<Goes | null>(null)
  const [myRating, setMyRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [leagueStatus, setLeagueStatus] = useState<LeagueStatus>(null)
  const [newAchievements, setNewAchievements] = useState<MedalDefinition[]>([])

  useEffect(() => { if (id) loadData() }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const uid = sessionData.session?.user?.id ?? null
      setUserId(uid)

      const { data: blockData } = await supabase.from('blocks').select('*').eq('id', id).single()

      if (blockData) {
        setBlock(blockData)
        if (blockData.league_id) {
          const { data: leagueData } = await supabase
            .from('leagues').select('start_date, end_date').eq('id', blockData.league_id).single()
          if (leagueData) {
            const now = new Date()
            if (!leagueData.start_date || now < new Date(leagueData.start_date)) setLeagueStatus('not_started')
            else if (leagueData.end_date && now > new Date(leagueData.end_date)) setLeagueStatus('finished')
            else setLeagueStatus('in_progress')
          } else {
            setLeagueStatus('not_started')
          }
        } else {
          setLeagueStatus('in_progress')
        }
      }

      if (uid) {
        const { data: attemptData } = await supabase
          .from('attempts').select('*').eq('block_id', id).eq('user_id', uid).maybeSingle()
        if (attemptData) {
          setExistingAttempt(attemptData)
          const g = goesFromDB(attemptData.number_of_goes)
          setSelectedGoes(g === 0 ? null : g)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!userId || !block) return
    if (existingAttempt) return
    if (selectedGoes === null) { goBack(); return }

    const result = resultFromGoes(selectedGoes)
    const score = calcScore(result, selectedGoes, block.difficulty)
    setSaving(true)
    setSaveError(null)

    try {
      const { error } = await supabase.from('attempts').insert({
        user_id: userId, block_id: block.id, result, number_of_goes: selectedGoes, score,
      })
      if (error) throw error

      // Guardar rating si lo rellenó
      if (myRating !== null) {
        await supabase.from('block_ratings').insert(
          { block_id: block.id, user_id: userId, stars: myRating }
        )
      }

      // Guardar comentario si hay texto
      const trimmed = comment.trim()
      if (trimmed.length > 0) {
        await supabase.from('block_comments').insert(
          { block_id: block.id, user_id: userId, content: trimmed }
        )
      }

      // Evaluar logros nuevos (solo bloques de gym)
      if (block.owner_type === 'gym') {
        const medals = await evaluateAchievements(userId)
        if (medals.length > 0) {
          setNewAchievements(medals)
          return   // la navegación ocurre cuando el toast se cierra
        }
      }

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

  function goesResultLabel(goes: number): string {
    if (goes === 1) return 'Flash'
    if (goes >= 6) return '+5 pegues'
    return `${goes} pegues`
  }

  // ── Formulario de registro ──
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Registrar resultado</Text>
          <Text style={[styles.blockName, { color: colors.textSecondary }]}>{block.identifier}</Text>
        </View>

        {existingAttempt ? (
          /* ── Ya registrado ── */
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
              onPress={goBack} activeOpacity={0.8}
            >
              <Text style={[styles.backFullButtonText, { color: colors.textSecondary }]}>Volver al bloque</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Selector de pegues: Flash solo + 4 botones ── */}
            <View>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Pegues</Text>
              <View style={styles.goesGrid}>
                {/* Fila 1: Flash — ancho completo */}
                {GOES_ROW1.map((g) => {
                  const isSelected = g === selectedGoes
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.goesBtnFull,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                        isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
                      ]}
                      onPress={() => { setSelectedGoes(g); setSaveError(null) }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.goesBtnLabel,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                        isSelected && { fontWeight: typography.weight.bold },
                      ]}>
                        {GOES_SHORT[g]}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
                {/* Fila 2: 2×, 3×, 4×, +5× */}
                <View style={styles.goesRow}>
                  {GOES_ROW2.map((g) => {
                    const isSelected = g === selectedGoes
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.goesBtn,
                          { borderColor: colors.border, backgroundColor: colors.surface },
                          isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
                        ]}
                        onPress={() => { setSelectedGoes(g); setSaveError(null) }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.goesBtnLabel,
                          { color: isSelected ? colors.primary : colors.textPrimary },
                          isSelected && { fontWeight: typography.weight.bold },
                        ]}>
                          {GOES_SHORT[g]}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            </View>

            {/* ── Valoración ── */}
            <View>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Valoración (opcional)</Text>
              <View style={styles.ratingRow}>
                <StarRating value={myRating} onChange={setMyRating} size={32} />
                {myRating !== null && (
                  <TouchableOpacity onPress={() => setMyRating(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="close-circle-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Comentario ── */}
            <View>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Comentario (opcional)</Text>
              <View style={[styles.commentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.commentInput, { color: colors.textPrimary }]}
                  placeholder="¿Qué te pareció el bloque?"
                  placeholderTextColor={colors.textMuted}
                  value={comment}
                  onChangeText={(t) => setComment(t.slice(0, 300))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={300}
                />
                <Text style={[styles.charCount, { color: comment.length >= 280 ? colors.warning : colors.textMuted }]}>
                  {comment.length}/300
                </Text>
              </View>
            </View>

            {saveError && (
              <View style={[styles.errorCard, { backgroundColor: colors.error + '18', borderColor: colors.error + '40' }]}>
                <Icon name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={[styles.errorCardText, { color: colors.error }]}>{saveError}</Text>
              </View>
            )}

            {/* ── Botón dinámico ── */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                selectedGoes !== null
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                saving && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={selectedGoes !== null ? colors.textInverse : colors.textSecondary} />
                : <Text style={[
                    styles.saveButtonText,
                    { color: selectedGoes !== null ? colors.textInverse : colors.textSecondary },
                  ]}>
                    {selectedGoes !== null ? 'Registrar' : 'Salir sin registrar'}
                  </Text>
              }
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Toast de logros — overlay sobre toda la pantalla */}
      {newAchievements.length > 0 && (
        <AchievementToast
          medals={newAchievements}
          onDismiss={() => {
            setNewAchievements([])
            router.replace(`/(app)/blocks/${block!.id}` as any)
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  centered:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  scroll:             { padding: spacing.lg, gap: spacing.lg },
  backButton:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText:           { fontSize: typography.size.md },
  header:             { gap: 2 },
  title:              { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold },
  blockName:          { fontSize: typography.size.md },
  // Grid pegues
  sectionLabel:       { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  goesGrid:           { gap: spacing.sm },
  goesBtnFull:        { width: '100%', paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  goesRow:            { flexDirection: 'row', gap: spacing.sm },
  goesBtn:            { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
  goesBtnLabel:       { fontSize: typography.size.lg, fontWeight: typography.weight.semibold },
  // Rating
  ratingRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // Comentario
  commentBox:         { borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  commentInput:       { fontSize: typography.size.sm, minHeight: 64, lineHeight: 20 },
  charCount:          { fontSize: typography.size.xs, textAlign: 'right', marginTop: spacing.xs },
  // Botón
  saveButton:         { borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText:     { fontSize: typography.size.md, fontWeight: typography.weight.bold },
  // Error
  errorText:          { fontSize: typography.size.md },
  errorCard:          { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  errorCardText:      { fontSize: typography.size.sm, flex: 1 },
  // Ya registrado
  lockedCard:         { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.md, borderWidth: 1 },
  lockedTitle:        { fontSize: typography.size.xl, fontWeight: typography.weight.bold, textAlign: 'center' },
  lockedText:         { fontSize: typography.size.sm, textAlign: 'center', lineHeight: 20 },
  lockedResult:       { borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignItems: 'center', gap: spacing.xs, width: '100%' },
  lockedResultLabel:  { fontSize: typography.size.xs, textTransform: 'uppercase', letterSpacing: 1 },
  lockedResultValue:  { fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  backFullButton:     { marginTop: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderRadius: radius.lg, borderWidth: 1 },
  backFullButtonText: { fontSize: typography.size.md },
  // Bloqueado (liguilla)
  blockedScreen:      { flex: 1, padding: spacing.lg },
  blockedCard:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  blockedTitle:       { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, textAlign: 'center' },
  blockedSubtitle:    { fontSize: typography.size.md, textAlign: 'center', lineHeight: 22 },
})
