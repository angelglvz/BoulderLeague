import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Platform, ScrollView, Clipboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import { useSession } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { typography, spacing, radius } from '../../../constants'
import { useTheme } from '../../../lib/ThemeContext'
import { BlockCard, Icon } from '../../../components'
import type { League, Block, Attempt } from '../../../types'

// ── Helpers de fecha ─────────────────────────────────────────────────────────

function toISO(d: Date) { return d.toISOString() }

function toDisplay(s: string | null) {
  if (!s) return null
  const d = new Date(s)
  const fecha = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const hora  = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${fecha} a las ${hora}`
}

function snapToQuarter(d: Date): Date {
  const result = new Date(d)
  const mins = d.getMinutes()
  const snapped = Math.round(mins / 15) * 15
  result.setMinutes(snapped === 60 ? 0 : snapped, 0, 0)
  if (snapped === 60) result.setHours(result.getHours() + 1)
  return result
}

function pad2(n: number) { return String(n).padStart(2, '0') }

const HOUR_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (const m of [0, 15, 30, 45]) {
    HOUR_OPTIONS.push(`${pad2(h)}:${pad2(m)}`)
  }
}

// ── Componente DateField multiplataforma ─────────────────────────────────────
function DateField({ value, onChange, placeholder, onPress, minDate, colors }: {
  value: Date | null
  onChange: (d: Date) => void
  placeholder: string
  onPress: () => void
  minDate?: Date
  colors: ReturnType<typeof useTheme>['colors']
}) {
  if (Platform.OS === 'web') {
    const dateStr = value
      ? `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
      : ''
    const snapped = value ? snapToQuarter(value) : null
    const timeStr = snapped ? `${pad2(snapped.getHours())}:${pad2(snapped.getMinutes())}` : '08:00'
    const minDateStr = minDate
      ? `${minDate.getFullYear()}-${pad2(minDate.getMonth() + 1)}-${pad2(minDate.getDate())}`
      : undefined

    function applyDate(newDateStr: string, currentTime: string) {
      if (!newDateStr) return
      const [y, mo, d] = newDateStr.split('-').map(Number)
      const [h, mi]    = currentTime.split(':').map(Number)
      onChange(new Date(y, mo - 1, d, h, mi, 0, 0))
    }
    function applyTime(newTime: string, currentDateStr: string) {
      const [h, mi] = newTime.split(':').map(Number)
      if (currentDateStr) {
        const [y, mo, d] = currentDateStr.split('-').map(Number)
        onChange(new Date(y, mo - 1, d, h, mi, 0, 0))
      } else {
        const base = new Date()
        onChange(new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, mi, 0, 0))
      }
    }

    return (
      <View style={[dateFieldStyles.button, { backgroundColor: colors.surface, borderColor: colors.border, gap: 8 }]}>
        {/* @ts-ignore */}
        <input
          type="date"
          value={dateStr}
          min={minDateStr}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => applyDate(e.target.value, timeStr)}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', colorScheme: 'dark', fontSize: typography.size.md, cursor: 'pointer' }}
        />
        <Icon name="time-outline" size={18} color={colors.textSecondary} />
        {/* @ts-ignore */}
        <select
          value={timeStr}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => applyTime(e.target.value, dateStr)}
          style={{ background: colors.surfaceAlt, border: `1px solid ${colors.border}`, outline: 'none', color: '#FFFFFF', colorScheme: 'dark', fontSize: typography.size.md, cursor: 'pointer', borderRadius: 6, padding: '4px 8px' }}
        >
          {HOUR_OPTIONS.map(t => (
            // @ts-ignore
            <option key={t} value={t} style={{ background: colors.surfaceAlt, color: '#FFFFFF' }}>{t}</option>
          ))}
        </select>
      </View>
    )
  }

  const displayVal = value
    ? `${pad2(value.getDate())}/${pad2(value.getMonth() + 1)}/${value.getFullYear()} ` +
      `${pad2(snapToQuarter(value).getHours())}:${pad2(snapToQuarter(value).getMinutes())}`
    : ''
  return (
    <TouchableOpacity style={[dateFieldStyles.button, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[dateFieldStyles.text, { color: value ? colors.textPrimary : colors.textMuted }]}>
        {displayVal || placeholder}
      </Text>
      <Text style={dateFieldStyles.icon}>📅</Text>
    </TouchableOpacity>
  )
}

const dateFieldStyles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  text:   { fontSize: typography.size.md, flex: 1 },
  icon:   { fontSize: 18 },
})

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useSession()
  const { colors } = useTheme()

  const [league, setLeague] = useState<League | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [userAttempts, setUserAttempts] = useState<Record<string, Attempt>>({})
  const [loading, setLoading] = useState(true)
  const blockIdsRef = useRef<string[]>([])

  const [showStartModal, setShowStartModal] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [dateErrors, setDateErrors] = useState<{ start?: string; end?: string }>({})
  const [savingDates, setSavingDates] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null)

  useEffect(() => { if (id) fetchData() }, [id])

  useFocusEffect(
    useCallback(() => {
      if (id) fetchData()
    }, [id])
  )

  async function fetchUserAttempts(blockIds?: string[]) {
    const { data: sessionData } = await supabase.auth.getSession()
    const uid = sessionData.session?.user?.id
    if (!uid) return
    const ids = blockIds ?? blockIdsRef.current
    if (ids.length === 0) return
    const { data } = await supabase
      .from('attempts').select('*').eq('user_id', uid).in('block_id', ids)
    if (data) {
      const map: Record<string, Attempt> = {}
      for (const a of data) map[a.block_id] = a
      setUserAttempts(map)
    }
  }

  async function fetchData() {
    setLoading(true)
    const [{ data: leagueData }, { data: blocksData, error: blocksError }, { count }] = await Promise.all([
      supabase.from('leagues').select('*').eq('id', id).single(),
      supabase.from('blocks').select('*').eq('league_id', id).order('created_at'),
      supabase.from('league_participants').select('*', { count: 'exact', head: true }).eq('league_id', id),
    ])
    if (leagueData) setLeague(leagueData)
    if (blocksError) console.error('Error cargando bloques:', blocksError)
    const safeBlocks = blocksData ?? []
    setBlocks(safeBlocks)
    const blockIds = safeBlocks.map((b: Block) => b.id)
    blockIdsRef.current = blockIds
    if (blockIds.length > 0) await fetchUserAttempts(blockIds)
    if (count !== null) setParticipantCount(count)
    setLoading(false)
  }

  function handleShare() {
    if (!league?.access_code) return
    Clipboard.setString(league.access_code)
    Alert.alert('¡Copiado! 📋', `Código "${league.access_code}" copiado al portapapeles.`)
  }

  function openStartModal() {
    setStartDate(league?.start_date ? new Date(league.start_date) : null)
    setEndDate(league?.end_date ? new Date(league.end_date) : null)
    setDateErrors({})
    setShowStartModal(true)
  }

  async function handleSaveDates() {
    const e: { start?: string; end?: string } = {}
    if (!startDate) e.start = 'La fecha y hora de inicio son obligatorias'
    if (!endDate) e.end = 'La fecha y hora de fin son obligatorias'
    else if (startDate && endDate <= startDate) e.end = 'Debe ser posterior al inicio'
    setDateErrors(e)
    if (Object.keys(e).length > 0) return

    const finalStart = snapToQuarter(startDate!)
    const finalEnd   = snapToQuarter(endDate!)

    setSavingDates(true)
    const { error } = await supabase
      .from('leagues')
      .update({ start_date: toISO(finalStart), end_date: toISO(finalEnd) })
      .eq('id', id)
    setSavingDates(false)

    if (error) {
      Alert.alert('Error al guardar', `No se pudieron guardar las fechas.\n\n${error.message ?? error.code ?? 'Error desconocido'}`)
      return
    }

    setLeague(prev => prev ? { ...prev, start_date: toISO(finalStart), end_date: toISO(finalEnd) } : prev)
    setShowStartModal(false)
  }

  function getLeagueStatus(): { label: string; color: string } | null {
    if (!league?.start_date || !league?.end_date) return null
    const now = new Date()
    const start = new Date(league.start_date)
    const end = new Date(league.end_date)
    if (now < start) return { label: '⏳ Pendiente de inicio', color: colors.textMuted }
    if (now > end)   return { label: '🏁 Finalizada', color: colors.error }
    return { label: '🟢 En curso', color: colors.success }
  }

  const isCreator = user?.id === league?.creator_id
  const leagueStatus = getLeagueStatus()
  const hasDates = !!league?.start_date && !!league?.end_date
  const isInProgress = hasDates && new Date() >= new Date(league?.start_date ?? '')

  // ── Borrar bloque ────────────────────────────────────────────────────────
  function handleDeleteBlock(block: Block) {
    Alert.alert(
      '⚠️ Borrar bloque',
      `Se eliminarán la foto y todos los resultados de "${block.identifier}". Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar definitivamente',
          style: 'destructive',
          onPress: async () => {
            try {
              const path = block.photo_url?.split('/block-photos/')[1]
              if (path) await supabase.storage.from('block-photos').remove([path])
            } catch (_e) { /* continuar aunque falle el borrado de foto */ }

            const { error } = await supabase.from('blocks').delete().eq('id', block.id)
            if (error) { Alert.alert('Error', 'No se pudo borrar el bloque'); return }
            setBlocks(prev => prev.filter(b => b.id !== block.id))
          },
        },
      ]
    )
  }

  // ── Mover bloque con flechas ─────────────────────────────────────────────
  async function moveBlock(index: number, direction: 'up' | 'down') {
    const newBlocks = [...blocks]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return

    // Intercambiar posiciones
    const temp = newBlocks[index]
    newBlocks[index] = newBlocks[targetIndex]
    newBlocks[targetIndex] = temp
    setBlocks(newBlocks)

    // Persistir en BD
    await Promise.all([
      supabase.from('blocks').update({ position: index }).eq('id', newBlocks[index].id),
      supabase.from('blocks').update({ position: targetIndex }).eq('id', newBlocks[targetIndex].id),
    ])
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!league) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Liguilla no encontrada</Text>
      </View>
    )
  }

  const MIN_BLOCKS = 5
  const canStart = blocks.length >= MIN_BLOCKS
  const remaining = MIN_BLOCKS - blocks.length

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(app)')} style={styles.backButton}>
            <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>{league.name}</Text>
            <TouchableOpacity
              style={[styles.rankingButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/(app)/leagues/${league.id}/ranking`)}
            >
              <Icon name="trophy-outline" size={16} color={colors.textInverse} style={{ marginRight: 4 }} />
              <Text style={[styles.rankingButtonText, { color: colors.textInverse }]}>Ranking</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {leagueStatus && <InfoRow label="Estado" value={leagueStatus.label} valueColor={leagueStatus.color} colors={colors} />}
          {league.start_date && <InfoRow label="📅 Inicio" value={toDisplay(league.start_date) ?? ''} colors={colors} />}
          {league.end_date   && <InfoRow label="🏁 Fin"    value={toDisplay(league.end_date) ?? ''} colors={colors} />}
          <InfoRow
            label="👥 Participantes"
            value={league.max_participants
              ? `${participantCount} / ${league.max_participants}`
              : `${participantCount}`}
            colors={colors}
          />
          {league.reward && <InfoRow label="🏆 Recompensa" value={league.reward} colors={colors} />}
          {isCreator ? (
            <InfoRow
              label="👁 Ranking"
              value={league.ranking_visible_during ? 'Visible durante la liguilla' : 'Solo visible al terminar'}
              valueColor={league.ranking_visible_during ? colors.success : colors.textMuted}
              colors={colors}
            />
          ) : (
            !league.ranking_visible_during && (
              <InfoRow label="👁 Ranking" value="Se revelará al terminar 🔒" valueColor={colors.textMuted} colors={colors} />
            )
          )}
        </View>

        {/* Botón iniciar — solo creador, sin fechas */}
        {isCreator && !hasDates && (
          <View style={styles.startSection}>
            {!canStart && (
              <View style={[styles.startHintRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.startHintEmoji}>🧱</Text>
                <Text style={[styles.startHintText, { color: colors.textSecondary }]}>
                  {remaining === 1
                    ? 'Falta 1 bloque para poder iniciar'
                    : `Faltan ${remaining} bloques para poder iniciar`}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }, !canStart && { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
              onPress={canStart ? openStartModal : undefined}
              activeOpacity={canStart ? 0.8 : 1}
            >
              <Icon name="play-circle-outline" size={18} color={canStart ? colors.textInverse : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.startButtonText, { color: canStart ? colors.textInverse : colors.textMuted }]}>
                Iniciar liguilla
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botón editar fechas */}
        {isCreator && hasDates && !isInProgress && (
          <View style={styles.startSection}>
            <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.primary }]} onPress={openStartModal} activeOpacity={0.8}>
              <Icon name="create-outline" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
              <Text style={[styles.startButtonText, { color: colors.textInverse }]}>Editar fechas</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Compartir código */}
        {league.access_code && (
          <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.surface, borderColor: colors.primary }]} onPress={handleShare} activeOpacity={0.8}>
            <Text style={[styles.shareCode, { color: colors.primary }]}>{league.access_code}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="copy-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.shareLabel, { color: colors.textMuted }]}>Toca para copiar el código</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Bloques header */}
        <View style={styles.blocksHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Bloques ({blocks.length})</Text>
          {isCreator && !isInProgress && (
            <TouchableOpacity
              style={[styles.addBlockButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => router.push(`/(app)/leagues/${league.id}/add-block`)}
            >
              <Icon name="add-circle-outline" size={18} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.addBlockText, { color: colors.primary }]}>Añadir</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de bloques */}
        {blocks.length === 0 ? (
          <View style={styles.emptyBlocks}>
            <Icon name="grid-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aún no hay bloques</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              {isCreator
                ? 'Añade bloques con el botón "Añadir" para empezar a preparar la liguilla'
                : 'El organizador aún no ha añadido bloques a esta liguilla'}
            </Text>
          </View>
        ) : (
          blocks.map((block, index) => (
            <View key={block.id} style={styles.blockRow}>
              {isCreator && !isInProgress && (
                <View style={styles.arrowColumn}>
                  <TouchableOpacity
                    style={[styles.arrowBtn, { backgroundColor: colors.surface, borderColor: colors.border }, index === 0 && styles.arrowBtnDisabled]}
                    onPress={() => moveBlock(index, 'up')}
                    disabled={index === 0}
                  >
                    <Icon name="chevron-up-outline" size={18} color={index === 0 ? colors.textMuted : colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.arrowBtn, { backgroundColor: colors.surface, borderColor: colors.border }, index === blocks.length - 1 && styles.arrowBtnDisabled]}
                    onPress={() => moveBlock(index, 'down')}
                    disabled={index === blocks.length - 1}
                  >
                    <Icon name="chevron-down-outline" size={18} color={index === blocks.length - 1 ? colors.textMuted : colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.blockCardWrapper}>
                <BlockCard
                  block={block}
                  attempt={userAttempts[block.id] ?? null}
                  onPress={() => router.push(`/(app)/blocks/${block.id}`)}
                />
              </View>

              {isCreator && !isInProgress && (
                <TouchableOpacity style={styles.deleteHandle} onPress={() => handleDeleteBlock(block)}>
                  <Icon name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Modal iniciar liguilla ─────────────────────────────────────────── */}
      <Modal visible={showStartModal} transparent animationType="fade" onRequestClose={() => setShowStartModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {league.start_date ? 'Editar fechas' : 'Iniciar liguilla'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Define el período de la liguilla. Los participantes podrán registrar resultados durante estas fechas.
            </Text>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Fecha y hora de inicio</Text>
            <DateField value={startDate} onChange={setStartDate} placeholder="DD/MM/AAAA HH:MM" onPress={() => setPickerTarget('start')} colors={colors} />
            {dateErrors.start && <Text style={[styles.modalError, { color: colors.error }]}>{dateErrors.start}</Text>}

            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>Fecha y hora de fin</Text>
            <DateField value={endDate} onChange={setEndDate} placeholder="DD/MM/AAAA HH:MM" onPress={() => setPickerTarget('end')} minDate={startDate ?? undefined} colors={colors} />
            {dateErrors.end && <Text style={[styles.modalError, { color: colors.error }]}>{dateErrors.end}</Text>}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowStartModal(false)}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }, savingDates && styles.btnDisabled]}
                onPress={handleSaveDates}
                disabled={savingDates}
              >
                {savingDates
                  ? <ActivityIndicator color={colors.textInverse} />
                  : <Text style={[styles.confirmText, { color: colors.textInverse }]}>Iniciar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {Platform.OS !== 'web' && (
        <DateTimePickerModal
          isVisible={pickerTarget !== null}
          mode="datetime"
          minimumDate={pickerTarget === 'end' && startDate ? startDate : new Date()}
          date={
            pickerTarget === 'end' && endDate ? endDate
            : pickerTarget === 'start' && startDate ? startDate
            : new Date()
          }
          onConfirm={(date) => {
            if (pickerTarget === 'start') setStartDate(date)
            else setEndDate(date)
            setPickerTarget(null)
          }}
          onCancel={() => setPickerTarget(null)}
          locale="es_ES"
        />
      )}
    </SafeAreaView>
  )
}

type ThemeColors = ReturnType<typeof useTheme>['colors']

function InfoRow({ label, value, valueColor, colors }: { label: string; value: string; valueColor?: string; colors: ThemeColors }) {
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: valueColor ?? colors.textPrimary }]}>{value}</Text>
    </View>
  )
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const infoStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  label: { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  value: { fontSize: typography.size.sm, flex: 1, textAlign: 'right' },
})

const styles = StyleSheet.create({
  container:               { flex: 1 },
  centered:                { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:                 { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header:                  { paddingTop: spacing.xl, marginBottom: spacing.md },
  backButton:              { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  backText:                { fontSize: typography.size.md },
  titleRow:                { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title:                   { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, flex: 1 },
  rankingButton:           { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  rankingButtonText:       { fontSize: typography.size.sm, fontWeight: typography.weight.bold },
  infoCard:                { borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, gap: spacing.sm, marginBottom: spacing.md },
  startSection:            { marginBottom: spacing.md, gap: spacing.xs },
  startHintRow:            { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1 },
  startHintEmoji:          { fontSize: 16 },
  startHintText:           { fontSize: typography.size.sm, flex: 1 },
  startButton:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, paddingVertical: spacing.sm },
  startButtonText:         { fontWeight: typography.weight.bold, fontSize: typography.size.md },
  shareButton:             { borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  shareCode:               { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, letterSpacing: 4 },
  shareLabel:              { fontSize: typography.size.sm },
  blocksHeader:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle:            { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  addBlockButton:          { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  addBlockText:            { fontWeight: typography.weight.bold, fontSize: typography.size.sm },
  blockRow:                { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.xs },
  arrowColumn:             { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, width: 32 },
  arrowBtn:                { padding: 4, borderRadius: radius.sm, borderWidth: 1 },
  arrowBtnDisabled:        { opacity: 0.3 },
  blockCardWrapper:        { flex: 1 },
  deleteHandle:            { padding: spacing.xs, alignItems: 'center', justifyContent: 'center', width: 36, height: 48 },
  emptyBlocks:             { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText:               { fontSize: typography.size.md, fontWeight: typography.weight.medium },
  emptySubtext:            { fontSize: typography.size.sm },
  errorText:               { fontSize: typography.size.md },
  // Modal styles
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalCard:      { borderRadius: radius.xl, padding: spacing.lg, width: '100%', maxWidth: 420, gap: spacing.sm },
  modalTitle:     { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold },
  modalSubtitle:  { fontSize: typography.size.sm, marginBottom: spacing.xs },
  modalLabel:     { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalError:     { fontSize: typography.size.sm },
  modalButtons:   { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn:      { flex: 1, borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  cancelText:     { fontWeight: typography.weight.semibold },
  confirmBtn:     { flex: 1, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  confirmText:    { fontWeight: typography.weight.bold },
  btnDisabled:    { opacity: 0.6 },
})
