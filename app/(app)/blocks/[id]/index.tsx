import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Image, ScrollView, Modal,
} from 'react-native'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { supabase } from '../../../../lib/supabase'
import { typography, spacing, radius } from '../../../../constants'
import { useTheme } from '../../../../lib/ThemeContext'
import { useSession, useProfile } from '../../../../hooks'
import { Icon, StarRating } from '../../../../components'
import type { Block, Attempt } from '../../../../types'

const DIFFICULTY_LABEL: Record<string, string> = {
  principiante:  'Principiante',
  novato:        'Novato',
  medio:         'Medio',
  avanzado:      'Avanzado',
  experimentado: 'Experimentado',
  elite:         'Élite',
  profesional:   'Profesional',
}

function goesLabel(goes: number): string {
  if (goes === 1) return 'Flash'
  if (goes >= 6) return '+5 pegues'
  return `${goes} pegues`
}

export default function BlockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const { user } = useSession()
  const { isUser } = useProfile()

  const [block, setBlock] = useState<Block | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [leagueStatus, setLeagueStatus] = useState<'not_started' | 'in_progress' | 'finished' | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [photoVisible, setPhotoVisible] = useState(false)

  // Rating y comentario (solo lectura — se rellenan desde log-attempt)
  const [myRating, setMyRating] = useState<number | null>(null)
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [myComment, setMyComment] = useState<string | null>(null)

  useEffect(() => { if (id) fetchBlock() }, [id])
  // fetchAttempt en foco para actualizar el resultado sin remontar la pantalla
  useFocusEffect(useCallback(() => {
    if (id && !loading) {
      fetchAttempt()
      fetchRatingAndComment()
    }
  }, [id, loading]))

  async function fetchAttempt() {
    if (!user || !id) return
    const { data } = await supabase
      .from('attempts').select('*')
      .eq('block_id', id).eq('user_id', user.id).maybeSingle()
    setAttempt(data ?? null)
  }

  async function fetchRatingAndComment() {
    if (!user || !id) return
    // Media de valoraciones del bloque
    const { data: ratingsData } = await supabase
      .from('block_ratings')
      .select('stars')
      .eq('block_id', id)
    if (ratingsData && ratingsData.length > 0) {
      const avg = ratingsData.reduce((sum, r) => sum + r.stars, 0) / ratingsData.length
      setAvgRating(Math.round(avg * 10) / 10)
    } else {
      setAvgRating(null)
    }
    // Valoración propia
    const { data: myRatingData } = await supabase
      .from('block_ratings')
      .select('stars')
      .eq('block_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    setMyRating(myRatingData?.stars ?? null)
    // Comentario propio
    const { data: commentData } = await supabase
      .from('block_comments')
      .select('content')
      .eq('block_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    setMyComment(commentData?.content ?? null)
  }


  async function fetchBlock() {
    setLoading(true)
    setLoadError(null)
    const { data: blockData, error } = await supabase
      .from('blocks').select('*').eq('id', id).single()

    if (error || !blockData) {
      setLoadError('Bloque no encontrado')
      setLoading(false)
      return
    }
    setBlock(blockData)

    if (user) {
      const isBlockOwner =
        (blockData.owner_type === 'gym' && blockData.gym_id === user.id) ||
        (blockData.owner_type === 'user' && blockData.user_id === user.id)
      setIsOwner(isBlockOwner)
    }

    if (blockData.league_id) {
      const { data: leagueData } = await supabase
        .from('leagues').select('start_date, end_date, creator_id')
        .eq('id', blockData.league_id).single()
      if (leagueData) {
        const now = new Date()
        if (!leagueData.start_date || now < new Date(leagueData.start_date)) {
          setLeagueStatus('not_started')
        } else if (leagueData.end_date && now > new Date(leagueData.end_date)) {
          setLeagueStatus('finished')
        } else {
          setLeagueStatus('in_progress')
        }
        if (user) setIsOwner(prev => prev || user.id === leagueData.creator_id)
      }
    }

    await fetchAttempt()
    await fetchRatingAndComment()
    setLoading(false)
  }

  // Bloques de gym (sin league_id): siempre disponibles para usuarios
  // Bloques de liguilla: solo si la liga está en curso
  const hasLeague = block?.league_id != null && block?.league_id !== undefined && block?.league_id !== ''
  const canLogAttempt = isUser && (!hasLeague ? true : leagueStatus === 'in_progress')
  const alreadyLogged = attempt != null && attempt.number_of_goes >= 1
  const inactiveLeague = hasLeague && leagueStatus !== 'in_progress'

  if (loading) return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  )

  if (!block) return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <Icon name="alert-circle-outline" size={48} color={colors.error} />
      <Text style={[styles.errorText, { color: colors.error, marginTop: spacing.md }]}>
        {loadError ?? 'Bloque no encontrado'}
      </Text>
      <TouchableOpacity
        style={[styles.retryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => fetchBlock()} activeOpacity={0.8}
      >
        <Text style={{ color: colors.primary, fontWeight: typography.weight.semibold }}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  )

  function logBtnLabel(): string {
    if (alreadyLogged) return 'Resultado registrado'
    if (inactiveLeague) return leagueStatus === 'not_started' ? 'La liguilla aún no ha comenzado' : 'La liguilla ha finalizado'
    if (attempt?.number_of_goes === 0) return 'Actualizar resultado'
    return 'Registrar'
  }

  const logBtnDisabled = alreadyLogged || inactiveLeague || !canLogAttempt

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Modal foto a pantalla completa ── */}
      <Modal visible={photoVisible} transparent animationType="fade" onRequestClose={() => setPhotoVisible(false)}>
        <View style={styles.photoModalBg}>
          <Image source={{ uri: block.photo_url }} style={styles.photoModalImg} resizeMode="contain" />
          <TouchableOpacity style={styles.photoModalClose} onPress={() => setPhotoVisible(false)} activeOpacity={0.8}>
            <Icon name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isUser ? 90 : spacing.xl }}>
        {/* Foto — toca para ampliar */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => setPhotoVisible(true)}>
          <Image source={{ uri: block.photo_url }} style={styles.photo} resizeMode="cover" />
          <View style={styles.photoHint}>
            <Icon name="expand-outline" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Volver */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-back-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
          </TouchableOpacity>

          {/* Identificador */}
          <Text style={[styles.identifier, { color: colors.textPrimary }]}>{block.identifier}</Text>

          {/* Badges */}
          <View style={styles.metaRow}>
            {block.difficulty ? (
              <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                  {DIFFICULTY_LABEL[block.difficulty] ?? block.difficulty}
                </Text>
              </View>
            ) : null}
            {block.color ? (
              <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{block.color}</Text>
              </View>
            ) : null}
            {block.sector ? (
              <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{block.sector}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
            Añadido el {new Date(block.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>

          {/* Resultado propio */}
          {attempt && attempt.number_of_goes >= 1 && (
            <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
              <Text style={[styles.resultValue, { color: colors.primary }]}>{goesLabel(attempt.number_of_goes)}</Text>
            </View>
          )}
          {attempt?.number_of_goes === 0 && (
            <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.resultPending, { color: colors.textMuted }]}>Intentado — sin encadenar</Text>
            </View>
          )}

          {/* Editar — solo owner */}
          {isOwner && block.is_active && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/(app)/blocks/${block.id}/edit`)}
              activeOpacity={0.8}
            >
              <Icon name="create-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Editar</Text>
            </TouchableOpacity>
          )}

          {/* ── Valoración y comentario — solo si el usuario ya registró (lectura) ── */}
          {isUser && (myRating !== null || myComment !== null) && (
            <View style={[styles.ratingSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {myRating !== null && (
                <View style={styles.ratingRow}>
                  <StarRating value={myRating} size={20} />
                  {avgRating !== null && (
                    <Text style={[styles.avgRating, { color: colors.textMuted }]}>
                      · Media {avgRating.toFixed(1)}
                    </Text>
                  )}
                </View>
              )}
              {myComment !== null && (
                <Text style={[styles.commentOwnText, { color: colors.textSecondary }]}>"{myComment}"</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Botón Resolver fijado al fondo ── */}
      {isUser && (
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.primaryBtn, { backgroundColor: colors.primary },
              logBtnDisabled && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => { if (!logBtnDisabled) router.push(`/(app)/blocks/${block.id}/log-attempt`) }}
            activeOpacity={logBtnDisabled ? 1 : 0.8}
          >
            <Text style={[
              styles.primaryBtnText, { color: colors.textInverse },
              logBtnDisabled && { color: colors.textSecondary },
            ]}>
              {logBtnLabel()}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  photo: { width: '100%', height: 300 },
  photoHint: {
    position: 'absolute', bottom: spacing.sm, right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: radius.full,
    padding: 5,
  },
  photoModalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoModalImg: { width: '100%', height: '85%' },
  photoModalClose: {
    position: 'absolute', top: 52, right: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.full, padding: 8,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: typography.size.md },
  identifier: { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1 },
  badgeText: { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  dateLabel: { fontSize: typography.size.sm },
  resultCard: { borderRadius: radius.lg, padding: spacing.md, borderWidth: 1 },
  resultValue: { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  resultPending: { fontSize: typography.size.sm, fontStyle: 'italic' },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.lg, paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: { borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center' },
  primaryBtnText: { fontSize: typography.size.md, fontWeight: typography.weight.bold },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.lg, paddingVertical: spacing.sm, borderWidth: 1 },
  secondaryBtnText: { fontSize: typography.size.md, fontWeight: typography.weight.medium },
  errorText: { fontSize: typography.size.md, textAlign: 'center' },
  retryBtn: { marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderRadius: radius.lg, borderWidth: 1 },
  // Rating y comentario (lectura)
  ratingSection:    { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  ratingRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avgRating:        { fontSize: typography.size.xs },
  commentOwnText:   { fontSize: typography.size.sm, lineHeight: 20, fontStyle: 'italic' },
})
