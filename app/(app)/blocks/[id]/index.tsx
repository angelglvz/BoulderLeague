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
import { typography, spacing, radius } from '../../../../constants'
import { useTheme } from '../../../../lib/ThemeContext'
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

type LeagueStatus = 'not_started' | 'in_progress' | 'finished'

export default function BlockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const [block, setBlock] = useState<Block | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [leagueStatus, setLeagueStatus] = useState<LeagueStatus>('not_started')

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

      // Estado de la liga
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
    setLoading(false)
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: block.photo_url }}
          style={styles.photo}
          resizeMode="cover"
        />

        <View style={styles.content}>
          <TouchableOpacity
            onPress={() => router.replace(`/(app)/leagues/${block.league_id}`)}
            style={styles.backButton}
          >
            <Text style={[styles.backText, { color: colors.textSecondary }]}>← Volver</Text>
          </TouchableOpacity>

          <Text style={[styles.identifier, { color: colors.textPrimary }]}>{block.identifier}</Text>

          {block.difficulty && (
            <View style={[styles.difficultyBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.difficultyText, { color: colors.textSecondary }]}>
                {DIFFICULTY_LABEL[block.difficulty]}
              </Text>
            </View>
          )}

          <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
            Añadido el{' '}
            {new Date(block.created_at).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>

          {attempt && attempt.number_of_goes > 0 && (
            <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Tu resultado</Text>
              <View style={styles.resultRow}>
                <Text style={[styles.resultEmoji, { color: colors.primary }]}>{resultEmoji(attempt.number_of_goes)}</Text>
                <Text style={[styles.resultGoesLabel, { color: colors.textPrimary }]}>
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
            <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.resultPendingText, { color: colors.textMuted }]}>⏳ Intentado — aún sin encadenar</Text>
            </View>
          )}
          {attempt == null && (
            <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.resultPendingText, { color: colors.textMuted }]}>Sin resultado registrado</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.logButton,
              { backgroundColor: colors.primary },
              (attempt != null || leagueStatus !== 'in_progress') && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => {
              if (attempt != null || leagueStatus !== 'in_progress') return
              router.push(`/(app)/blocks/${block.id}/log-attempt`)
            }}
            activeOpacity={(attempt != null || leagueStatus !== 'in_progress') ? 1 : 0.8}
          >
            <Text style={[
              styles.logButtonText,
              { color: colors.textInverse },
              (attempt != null || leagueStatus !== 'in_progress') && { color: colors.textSecondary },
            ]}>
              {attempt != null
                ? '🔒 Resultado ya registrado'
                : leagueStatus === 'not_started'
                ? '⏳ La liguilla aún no ha comenzado'
                : leagueStatus === 'finished'
                ? '🏁 La liguilla ha finalizado'
                : '✍️ Registrar resultado'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  centered:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photo:              { width: '100%', height: 300 },
  content:            { padding: spacing.lg, gap: spacing.md },
  backButton:         { marginBottom: spacing.xs },
  backText:           { fontSize: typography.size.md },
  identifier:         { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  difficultyBadge:    { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1 },
  difficultyText:     { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  dateLabel:          { fontSize: typography.size.sm },
  logButton:          { borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  logButtonText:      { fontSize: typography.size.md, fontWeight: typography.weight.bold },
  resultCard:         { borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, gap: spacing.xs },
  resultLabel:        { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  resultRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultEmoji:        { fontSize: typography.size['2xl'], fontWeight: typography.weight.bold },
  resultGoesLabel:    { fontSize: typography.size.lg, fontWeight: typography.weight.semibold },
  resultPendingText:  { fontSize: typography.size.sm, fontStyle: 'italic' },
  errorText:          { fontSize: typography.size.md },
})

