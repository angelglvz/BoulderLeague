import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Clipboard,
  Modal, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSession } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { colors, typography, spacing, radius } from '../../../constants'
import { BlockCard, Icon } from '../../../components'
import type { League, Block, Attempt } from '../../../types'

// ── Helpers de fecha ─────────────────────────────────────────────────────────

/** Convierte un Date a string ISO completo para guardar en BD (timestamptz) */
function toISO(d: Date) { return d.toISOString() }

/** Muestra fecha + hora en formato legible */
function toDisplay(s: string | null) {
  if (!s) return null
  const d = new Date(s)
  const fecha = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const hora  = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${fecha} a las ${hora}`
}

/** Snap de minutos al cuarto de hora más cercano (0, 15, 30, 45) */
function snapToQuarter(d: Date): Date {
  const result = new Date(d)
  const mins = d.getMinutes()
  const snapped = Math.round(mins / 15) * 15
  result.setMinutes(snapped === 60 ? 0 : snapped, 0, 0)
  if (snapped === 60) result.setHours(result.getHours() + 1)
  return result
}

function pad2(n: number) { return String(n).padStart(2, '0') }

// Opciones de hora: solo cuartos de hora → "00:00", "00:15", ..., "23:45"
const HOUR_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (const m of [0, 15, 30, 45]) {
    HOUR_OPTIONS.push(`${pad2(h)}:${pad2(m)}`)
  }
}

// ── Componente DateField multiplataforma ─────────────────────────────────────
function DateField({ value, onChange, placeholder, onPress, minDate }: {
  value: Date | null
  onChange: (d: Date) => void
  placeholder: string
  onPress: () => void
  minDate?: Date
}) {
  if (Platform.OS === 'web') {
    // Fecha como "YYYY-MM-DD"
    const dateStr = value
      ? `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
      : ''

    // Hora snapeada como "HH:MM"
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
      <View style={[modalStyles.dateButton, { gap: 8 }]}>
        {/* @ts-ignore — input HTML nativo en web */}
        <input
          type="date"
          value={dateStr}
          min={minDateStr}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            applyDate(e.target.value, timeStr)
          }
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#FFFFFF',
            colorScheme: 'dark',
            fontSize: typography.size.md, cursor: 'pointer',
          }}
        />
        <Icon name="time-outline" size={18} color={colors.textSecondary} />
        {/* @ts-ignore — select HTML nativo en web */}
        <select
          value={timeStr}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            applyTime(e.target.value, dateStr)
          }
          style={{
            background: colors.surfaceAlt,
            border: `1px solid ${colors.border}`,
            outline: 'none',
            color: '#FFFFFF',
            colorScheme: 'dark',
            fontSize: typography.size.md, cursor: 'pointer',
            borderRadius: 6, padding: '4px 8px',
          }}
        >
          {HOUR_OPTIONS.map(t => (
            // @ts-ignore
            <option key={t} value={t} style={{ background: colors.surfaceAlt, color: '#FFFFFF' }}>{t}</option>
          ))}
        </select>
      </View>
    )
  }

  // ── Móvil ──
  const displayVal = value
    ? `${pad2(value.getDate())}/${pad2(value.getMonth() + 1)}/${value.getFullYear()} ` +
      `${pad2(snapToQuarter(value).getHours())}:${pad2(snapToQuarter(value).getMinutes())}`
    : ''
  return (
    <TouchableOpacity style={modalStyles.dateButton} onPress={onPress} activeOpacity={0.8}>
      <Text style={value ? modalStyles.dateText : modalStyles.datePlaceholder}>
        {displayVal || placeholder}
      </Text>
      <Text style={modalStyles.dateIcon}>📅</Text>
    </TouchableOpacity>
  )
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useSession()

  const [league, setLeague] = useState<League | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [userAttempts, setUserAttempts] = useState<Record<string, Attempt>>({})
  const [loading, setLoading] = useState(true)
  const blockIdsRef = useRef<string[]>([])

  // Modal de iniciar liguilla
  const [showStartModal, setShowStartModal] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [dateErrors, setDateErrors] = useState<{ start?: string; end?: string }>({})
  const [savingDates, setSavingDates] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null)

  useEffect(() => { if (id) fetchData() }, [id])

  useFocusEffect(
    useCallback(() => {
      if (id) fetchUserAttempts()
    }, [id, user?.id])
  )

  async function fetchUserAttempts(blockIds?: string[]) {
    const { data: sessionData } = await supabase.auth.getSession()
    const uid = sessionData.session?.user?.id
    if (!uid) return
    const ids = blockIds ?? blockIdsRef.current
    if (ids.length === 0) return
    const { data } = await supabase
      .from('attempts')
      .select('*')
      .eq('user_id', uid)
      .in('block_id', ids)
    if (data) {
      const map: Record<string, Attempt> = {}
      for (const a of data) map[a.block_id] = a
      setUserAttempts(map)
    }
  }

  async function fetchData() {
    setLoading(true)
    const [{ data: leagueData }, { data: blocksData }, { count }] = await Promise.all([
      supabase.from('leagues').select('*').eq('id', id).single(),
      supabase.from('blocks').select('*').eq('league_id', id).order('created_at'),
      supabase.from('league_participants').select('*', { count: 'exact', head: true }).eq('league_id', id),
    ])
    if (leagueData) setLeague(leagueData)
    if (blocksData) {
      setBlocks(blocksData)
      const blockIds = blocksData.map((b: Block) => b.id)
      blockIdsRef.current = blockIds
      await fetchUserAttempts(blockIds)
    }
    if (count !== null) setParticipantCount(count)
    setLoading(false)
  }

  function handleShare() {
    if (!league?.access_code) return
    Clipboard.setString(league.access_code)
    Alert.alert('¡Copiado! 📋', `Código "${league.access_code}" copiado al portapapeles.`)
  }

  // ── Modal iniciar liguilla ───────────────────────────────────────────────
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

    // Snap a cuartos de hora antes de guardar
    const finalStart = snapToQuarter(startDate!)
    const finalEnd   = snapToQuarter(endDate!)

    setSavingDates(true)
    const { error } = await supabase
      .from('leagues')
      .update({ start_date: toISO(finalStart), end_date: toISO(finalEnd) })
      .eq('id', id)
    setSavingDates(false)

    if (error) {
      console.error('Error al guardar fechas:', error)
      Alert.alert(
        'Error al guardar',
        `No se pudieron guardar las fechas.\n\n${error.message ?? error.code ?? 'Error desconocido'}\n\nAsegúrate de haber ejecutado la migración de BD (start_date/end_date a TIMESTAMPTZ).`
      )
      return
    }

    setLeague(prev => prev
      ? { ...prev, start_date: toISO(finalStart), end_date: toISO(finalEnd) }
      : prev
    )
    setShowStartModal(false)
  }

  // ── Estado de la liguilla ────────────────────────────────────────────────
  function getLeagueStatus(): { label: string; color: string } | null {
    if (!league?.start_date || !league?.end_date) return null
    const now = new Date()
    const start = new Date(league.start_date)
    const end = new Date(league.end_date)
    if (now < start) return { label: '⏳ Pendiente de inicio', color: colors.textMuted }
    if (now > end)   return { label: '🏁 Finalizada', color: colors.error }
    return { label: '🟢 En curso', color: colors.success ?? colors.primary }
  }

  const isCreator = user?.id === league?.creator_id
  const leagueStatus = getLeagueStatus()

  // La liga ya tiene fechas asignadas (aunque sean futuras) → ocultar botón "Iniciar"
  const hasDates = !!league?.start_date && !!league?.end_date

  // La liga ya ha comenzado realmente → bloquear edición de bloques (añadir/borrar/reordenar)
  const isInProgress = hasDates && new Date() >= new Date(league!.start_date!)

  // ── Borrar bloque ────────────────────────────────────────────────────────
  const handleDeleteBlock = useCallback((block: Block) => {
    Alert.alert(
      '⚠️ Borrar bloque',
      `Se eliminarán la foto y todos los resultados registrados de "${block.identifier}". Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar definitivamente',
          style: 'destructive',
          onPress: async () => {
            // 1. Borrar foto de Storage
            try {
              const url = block.photo_url
              const path = url.split('/block-photos/')[1]
              if (path) {
                await supabase.storage.from('block-photos').remove([path])
              }
            } catch (_) { /* si falla el borrado de la foto, continuamos */ }

            // 2. Borrar fila (attempts se borran en cascada por FK)
            const { error } = await supabase.from('blocks').delete().eq('id', block.id)
            if (error) {
              Alert.alert('Error', 'No se pudo borrar el bloque')
              return
            }

            // 3. Actualizar lista local
            setBlocks(prev => prev.filter(b => b.id !== block.id))
          },
        },
      ]
    )
  }, [])

  // ── Drag & drop — guardar nuevo orden en BD ──────────────────────────────
  const handleDragEnd = useCallback(async ({ data }: { data: Block[] }) => {
    setBlocks(data)
    // Persistir posiciones en BD
    const updates = data.map((b, i) =>
      supabase.from('blocks').update({ position: i }).eq('id', b.id)
    )
    await Promise.all(updates)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!league) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Liguilla no encontrada</Text>
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
      <DraggableFlatList
        data={blocks}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.replace('/(app)')} style={styles.backButton}>
                <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.backText}>Volver</Text>
              </TouchableOpacity>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>{league.name}</Text>
                <TouchableOpacity
                  style={styles.rankingButton}
                  onPress={() => router.push(`/(app)/leagues/${league.id}/ranking`)}
                >
                  <Icon name="trophy-outline" size={16} color={colors.textInverse} style={{ marginRight: 4 }} />
                  <Text style={styles.rankingButtonText}>Ranking</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Info */}
            <View style={styles.infoCard}>
              {leagueStatus ? (
                <InfoRow label="Estado" value={leagueStatus.label} valueColor={leagueStatus.color} />
              ) : null}
              {league.start_date && (
                <InfoRow label="📅 Inicio" value={toDisplay(league.start_date) ?? ''} />
              )}
              {league.end_date && (
                <InfoRow label="🏁 Fin" value={toDisplay(league.end_date) ?? ''} />
              )}
              <InfoRow
                label="👥 Participantes"
                value={`${participantCount}${league.max_participants ? ` / ${league.max_participants}` : ''}`}
              />
              {league.reward && <InfoRow label="🏆 Recompensa" value={league.reward} />}
              {/* Badge de visibilidad del ranking */}
              {isCreator ? (
                <InfoRow
                  label="👁 Ranking"
                  value={league.ranking_visible_during ? 'Visible para todos durante la liguilla' : 'Solo visible al terminar'}
                  valueColor={league.ranking_visible_during ? (colors.success ?? colors.primary) : colors.textMuted}
                />
              ) : !league.ranking_visible_during ? (
                <InfoRow
                  label="👁 Ranking"
                  value="Se revelará al terminar la liguilla 🔒"
                  valueColor={colors.textMuted}
                />
              ) : null}
            </View>

            {/* Botón iniciar/editar fechas — solo creador, solo si la liga NO tiene fechas aún */}
            {isCreator && !hasDates && (() => {
              const MIN_BLOCKS = 5
              const remaining = MIN_BLOCKS - blocks.length
              const canStart = blocks.length >= MIN_BLOCKS

              return (
                <View style={styles.startSection}>
                  {!canStart && (
                    <View style={styles.startHintRow}>
                      <Text style={styles.startHintEmoji}>🧱</Text>
                      <Text style={styles.startHintText}>
                        {remaining === 1
                          ? 'Falta 1 bloque para poder iniciar'
                          : `Faltan ${remaining} bloques para poder iniciar`}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.startButton, !canStart && styles.startButtonDisabled]}
                    onPress={canStart ? openStartModal : undefined}
                    activeOpacity={canStart ? 0.8 : 1}
                  >
                    <Icon
                      name="play-circle-outline"
                      size={18}
                      color={canStart ? colors.textInverse : colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.startButtonText, !canStart && styles.startButtonTextDisabled]}>
                      Iniciar liguilla
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            })()}

            {/* Botón editar fechas — solo creador, tiene fechas pero aún no ha comenzado */}
            {isCreator && hasDates && !isInProgress && (
              <View style={styles.startSection}>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={openStartModal}
                  activeOpacity={0.8}
                >
                  <Icon name="create-outline" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
                  <Text style={styles.startButtonText}>Editar fechas</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Compartir */}
            {league.access_code && (
              <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
                <Text style={styles.shareCode}>{league.access_code}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="copy-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.shareLabel}>Toca para copiar el código</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Bloques header */}
            <View style={styles.blocksHeader}>
              <Text style={styles.sectionTitle}>Bloques ({blocks.length})</Text>
              {isCreator && !isInProgress && (
                <TouchableOpacity
                  style={styles.addBlockButton}
                  onPress={() => router.push(`/(app)/leagues/${league.id}/add-block`)}
                >
                  <Icon name="add-circle-outline" size={18} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.addBlockText}>Añadir</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        renderItem={({ item, drag, isActive }: RenderItemParams<Block>) => (
          <ScaleDecorator>
            <View style={[styles.blockRow, isActive && styles.blockRowDragging]}>
              {/* Drag handle — solo si la liga no ha comenzado */}
              {isCreator && !isInProgress && (
                <TouchableOpacity
                  style={styles.dragHandle}
                  onLongPress={drag}
                  delayLongPress={100}
                >
                  <Icon name="reorder-three-outline" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              )}

              {/* Card */}
              <View style={styles.blockCardWrapper}>
                <BlockCard
                  block={item}
                  attempt={userAttempts[item.id] ?? null}
                  onPress={() => router.push(`/(app)/blocks/${item.id}`)}
                />
              </View>

              {/* Botón borrar — solo si la liga no ha comenzado */}
              {isCreator && !isInProgress && (
                <TouchableOpacity
                  style={styles.deleteHandle}
                  onPress={() => handleDeleteBlock(item)}
                >
                  <Icon name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          </ScaleDecorator>
        )}
        onDragEnd={isCreator && !isInProgress ? handleDragEnd : undefined}
        ListEmptyComponent={
          <View style={styles.emptyBlocks}>
            <Icon name="grid-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Aún no hay bloques</Text>
            <Text style={styles.emptySubtext}>Añade el primer bloque de la liguilla</Text>
          </View>
        }
        contentContainerStyle={styles.content}
      />

      {/* ── Modal iniciar liguilla ─────────────────────────────────────────── */}
      <Modal
        visible={showStartModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStartModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>
              {league.start_date ? 'Editar fechas' : 'Iniciar liguilla'}
            </Text>
            <Text style={modalStyles.subtitle}>
              Define el período de la liguilla. Los participantes podrán registrar resultados durante estas fechas.
            </Text>

            <Text style={modalStyles.label}>Fecha y hora de inicio</Text>
            <DateField
              value={startDate}
              onChange={setStartDate}
              placeholder="DD/MM/AAAA HH:MM"
              onPress={() => setPickerTarget('start')}
            />
            {dateErrors.start && <Text style={modalStyles.error}>{dateErrors.start}</Text>}

            <Text style={[modalStyles.label, { marginTop: spacing.md }]}>Fecha y hora de fin</Text>
            <DateField
              value={endDate}
              onChange={setEndDate}
              placeholder="DD/MM/AAAA HH:MM"
              onPress={() => setPickerTarget('end')}
              minDate={startDate ?? undefined}
            />
            {dateErrors.end && <Text style={modalStyles.error}>{dateErrors.end}</Text>}

            <View style={modalStyles.buttons}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() => setShowStartModal(false)}
              >
                <Text style={modalStyles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.confirmBtn, savingDates && modalStyles.btnDisabled]}
                onPress={handleSaveDates}
                disabled={savingDates}
              >
                {savingDates
                  ? <ActivityIndicator color={colors.textInverse} />
                  : <Text style={modalStyles.confirmText}>Iniciar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date picker modal — solo móvil */}
      {Platform.OS !== 'web' && (
        <DateTimePickerModal
          isVisible={pickerTarget !== null}
          mode="datetime"
          minimumDate={pickerTarget === 'end' && startDate ? startDate : new Date()}
          date={
            pickerTarget === 'end' && endDate ? endDate :
            pickerTarget === 'start' && startDate ? startDate :
            new Date()
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
    </GestureHandlerRootView>
  )
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  )
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  label: { fontSize: typography.size.sm, color: colors.textSecondary, fontWeight: typography.weight.medium },
  value: { fontSize: typography.size.sm, color: colors.textPrimary, flex: 1, textAlign: 'right' },
})

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: colors.background },
  centered:             { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  content:              { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header:               { paddingTop: spacing.xl, marginBottom: spacing.md },
  backButton:           { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  backText:             { color: colors.textSecondary, fontSize: typography.size.md },
  titleRow:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title:                { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, color: colors.textPrimary, flex: 1 },
  rankingButton:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  rankingButtonText:    { fontSize: typography.size.sm, color: colors.textInverse, fontWeight: typography.weight.bold },
  infoCard:             { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm, marginBottom: spacing.md },
  startSection:         { marginBottom: spacing.md, gap: spacing.xs },
  startHintRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  startHintEmoji:       { fontSize: 16 },
  startHintText:        { fontSize: typography.size.sm, color: colors.textSecondary, flex: 1 },
  startButton:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm },
  startButtonDisabled:  { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  startButtonText:      { color: colors.textInverse, fontWeight: typography.weight.bold, fontSize: typography.size.md },
  startButtonTextDisabled: { color: colors.textMuted },
  shareButton:          { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  shareCode:            { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, color: colors.primary, letterSpacing: 4 },
  shareLabel:           { fontSize: typography.size.sm, color: colors.textMuted },
  blocksHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle:         { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  addBlockButton:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  addBlockText:         { color: colors.primary, fontWeight: typography.weight.bold, fontSize: typography.size.sm },
  blockRow:             { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.xs },
  blockRowDragging:     { opacity: 0.85, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  dragHandle:           { padding: spacing.xs, alignItems: 'center', justifyContent: 'center', width: 32, height: 48 },
  blockCardWrapper:     { flex: 1 },
  deleteHandle:         { padding: spacing.xs, alignItems: 'center', justifyContent: 'center', width: 36, height: 48 },
  emptyBlocks:          { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText:            { fontSize: typography.size.md, color: colors.textSecondary, fontWeight: typography.weight.medium },
  emptySubtext:         { fontSize: typography.size.sm, color: colors.textMuted },
  errorText:            { color: colors.error, fontSize: typography.size.md },
})

const modalStyles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card:          { backgroundColor: colors.background, borderRadius: radius.xl, padding: spacing.lg, width: '100%', maxWidth: 420, gap: spacing.sm },
  title:         { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, color: colors.textPrimary },
  subtitle:      { fontSize: typography.size.sm, color: colors.textMuted, marginBottom: spacing.xs },
  label:         { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  error:         { fontSize: typography.size.sm, color: colors.error },
  dateButton:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  dateText:      { fontSize: typography.size.md, color: colors.textPrimary, flex: 1 },
  datePlaceholder: { fontSize: typography.size.md, color: colors.textMuted, flex: 1 },
  dateIcon:      { fontSize: 18 },
  buttons:       { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn:     { flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm, alignItems: 'center' },
  cancelText:    { color: colors.textSecondary, fontWeight: typography.weight.semibold },
  confirmBtn:    { flex: 1, borderRadius: radius.md, backgroundColor: colors.primary, paddingVertical: spacing.sm, alignItems: 'center' },
  confirmText:   { color: colors.textInverse, fontWeight: typography.weight.bold },
  btnDisabled:   { opacity: 0.6 },
})
