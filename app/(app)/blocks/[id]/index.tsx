import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { supabase } from '../../../../lib/supabase'
import { colors, typography, spacing, radius } from '../../../../constants'
import { resultEmoji } from '../../../../lib/scoring'
import type { Block, Attempt } from '../../../../types'

const DIFFICULTY_LABEL: Record<string, string> = {
  principiante:  '⚪ Principiante',
  novato:        '🟢 Novato',
  medio:         '🔵 Medio',
  avanzado:      '🟡 Avanzado',
  experimentado: '🟠 Experimentado',
  elite:         '🔴 Élite',
  profesional:   '🟣 Profesional',
}

export default function BlockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [block, setBlock] = useState<Block | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchBlock()
  }, [id])

  useFocusEffect(
    useCallback(() => {
      if (id) fetchAttempt()
    }, [id])
  )

  async function fetchAttempt() {
    const { data: sessionData } = await supabase.auth.getSession()
    const uid = sessionData.session?.user?.id
    if (!uid || !id) return
    const { data: attemptData } = await supabase
      .from('attempts')
      .select('*')
      .eq('block_id', id)
      .eq('user_id', uid)
      .maybeSingle()
    setAttempt(attemptData ?? null)
  }

  async function fetchBlock() {
    setLoading(true)
    const { data: blockData } = await supabase
      .from('blocks')
      .select('*')
      .eq('id', id)
      .single()

    if (blockData) {
      setBlock(blockData)
      await fetchAttempt()
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!block) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Bloque no encontrado</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: block.photo_url }}
          style={styles.photo}
          resizeMode="cover"
        />

        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>

          <Text style={styles.identifier}>{block.identifier}</Text>

          {block.difficulty && (
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>
                {DIFFICULTY_LABEL[block.difficulty]}
              </Text>
            </View>
          )}

          <Text style={styles.dateLabel}>
            Añadido el{' '}
            {new Date(block.created_at).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>

          {attempt && attempt.number_of_goes > 0 && (
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Tu resultado</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultEmoji}>{resultEmoji(attempt.number_of_goes)}</Text>
                <Text style={styles.resultGoesLabel}>
                  {attempt.number_of_goes === 1
                    ? 'Flash'
                    : attempt.number_of_goes >= 6
                    ? '+5 pegues'
                    : `${attempt.number_of_goes} pegues`}
                </Text>
              </View>
            </View>
          )}
          {attempt != null && attempt.number_of_goes === 0 && (
            <View style={[styles.resultCard, styles.resultPending]}>
              <Text style={styles.resultPendingText}>⏳ Intentado — aún sin encadenar</Text>
            </View>
          )}
          {attempt == null && (
            <View style={[styles.resultCard, styles.resultPending]}>
              <Text style={styles.resultPendingText}>Sin resultado registrado</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.logButton, attempt != null && styles.logButtonDisabled]}
            onPress={() => {
              if (attempt != null) return
              router.push(`/(app)/blocks/${block.id}/log-attempt`)
            }}
            activeOpacity={attempt != null ? 1 : 0.8}
          >
            <Text style={[styles.logButtonText, attempt != null && styles.logButtonTextDisabled]}>
              {attempt != null ? '🔒 Resultado ya registrado' : '✍️ Registrar resultado'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.background },
  centered:           { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  photo:              { width: '100%', height: 300 },
  content:            { padding: spacing.lg, gap: spacing.md },
  backButton:         { marginBottom: spacing.xs },
  backText:           { color: colors.textSecondary, fontSize: typography.size.md },
  identifier:         { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, color: colors.textPrimary },
  difficultyBadge:    { alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border },
  difficultyText:     { fontSize: typography.size.sm, color: colors.textSecondary, fontWeight: typography.weight.medium },
  dateLabel:          { fontSize: typography.size.sm, color: colors.textMuted },
  logButton:              { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  logButtonDisabled:      { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  logButtonText:          { color: colors.textInverse, fontSize: typography.size.md, fontWeight: typography.weight.bold },
  logButtonTextDisabled:  { color: colors.textSecondary },
  resultCard:         { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '40', gap: spacing.xs },
  resultLabel:        { fontSize: typography.size.sm, color: colors.textSecondary, fontWeight: typography.weight.medium },
  resultRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultEmoji:        { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold, color: colors.primary },
  resultGoesLabel:    { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.textPrimary },
  resultScore:        { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, color: colors.primary },
  resultPending:      { borderColor: colors.border },
  resultPendingText:  { fontSize: typography.size.sm, color: colors.textMuted, fontStyle: 'italic' },
  errorText:          { color: colors.error, fontSize: typography.size.md },
})

