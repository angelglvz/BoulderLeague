import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Clipboard, FlatList,
  Modal, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import { useSession } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { colors, typography, spacing, radius } from '../../../constants'
import { BlockCard } from '../../../components'
import type { League, Block } from '../../../types'

// ── Helpers de fecha ─────────────────────────────────────────────────────────
function toISO(d: Date) { return d.toISOString().split('T')[0] }
function toDisplay(s: string | null) {
  if (!s) return null
  return new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Componente DateField multiplataforma ─────────────────────────────────────
function DateField({ value, onChange, placeholder, onPress, minDate }: {
  value: Date | null
  onChange: (d: Date) => void
  placeholder: string
  onPress: () => void
  minDate?: Date
}) {
  const displayVal = value
    ? value.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  if (Platform.OS === 'web') {
    const minISO = minDate ? toISO(minDate) : undefined
    return (
      <View style={modalStyles.dateButton}>
        <Text style={modalStyles.dateIcon}>📅</Text>
        {/* @ts-ignore */}
        <input
          type="date"
          value={value ? toISO(value) : ''}
          min={minISO}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.value) onChange(new Date(e.target.value + 'T12:00:00'))
          }}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: value ? colors.textPrimary : colors.textMuted,
            fontSize: typography.size.md, cursor: 'pointer', width: '100%',
          }}
        />
      </View>
    )
  }
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
  const [loading, setLoading] = useState(true)

  // Modal de iniciar liguilla
  const [showStartModal, setShowStartModal] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [dateErrors, setDateErrors] = useState<{ start?: string; end?: string }>({})
  const [savingDates, setSavingDates] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null)

  useEffect(() => { if (id) fetchData() }, [id])

  async function fetchData() {
    setLoading(true)
    const [{ data: leagueData }, { data: blocksData }, { count }] = await Promise.all([
      supabase.from('leagues').select('*').eq('id', id).single(),
      supabase.from('blocks').select('*').eq('league_id', id).order('created_at'),
      supabase.from('league_participants').select('*', { count: 'exact', head: true }).eq('league_id', id),
    ])
    if (leagueData) setLeague(leagueData)
    if (blocksData) setBlocks(blocksData)
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
    setStartDate(league?.start_date ? new Date(league.start_date + 'T12:00:00') : null)
    setEndDate(league?.end_date ? new Date(league.end_date + 'T12:00:00') : null)
    setDateErrors({})
    setShowStartModal(true)
  }

  async function handleSaveDates() {
    const e: { start?: string; end?: string } = {}
    if (!startDate) e.start = 'La fecha de inicio es obligatoria'
    if (!endDate) e.end = 'La fecha de fin es obligatoria'
    else if (startDate && endDate <= startDate) e.end = 'Debe ser posterior al inicio'
    setDateErrors(e)
    if (Object.keys(e).length > 0) return

    setSavingDates(true)
    const { error } = await supabase
      .from('leagues')
      .update({ start_date: toISO(startDate!), end_date: toISO(endDate!) })
      .eq('id', id)
    setSavingDates(false)

    if (error) {
      Alert.alert('Error', 'No se pudo guardar las fechas')
      return
    }
    setLeague(prev => prev ? { ...prev, start_date: toISO(startDate!), end_date: toISO(endDate!) } : prev)
    setShowStartModal(false)
  }

  // ── Estado de la liguilla ────────────────────────────────────────────────
  function getLeagueStatus(): { label: string; color: string } | null {
    if (!league?.start_date || !league?.end_date) return null
    const now = new Date()
    const start = new Date(league.start_date + 'T00:00:00')
    const end = new Date(league.end_date + 'T23:59:59')
    if (now < start) return { label: '⏳ Pendiente de inicio', color: colors.textMuted }
    if (now > end)   return { label: '🏁 Finalizada', color: colors.error }
    return { label: '🟢 En curso', color: colors.success ?? colors.primary }
  }

  const isCreator = user?.id === league?.creator_id
  const leagueStatus = getLeagueStatus()

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

  // ── Mover bloque (reordenar) ─────────────────────────────────────────────
  const handleMoveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId)
      if (idx === -1) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev

      const next = [...prev]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return next
    })
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
    <SafeAreaView style={styles.container}>
      <FlatList
        data={blocks}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.backText}>← Volver</Text>
              </TouchableOpacity>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>{league.name}</Text>
                <TouchableOpacity
                  style={styles.rankingButton}
                  onPress={() => router.push(`/(app)/leagues/${league.id}/ranking`)}
                >
                  <Text style={styles.rankingButtonText}>🏆 Ranking</Text>
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
            </View>

            {/* Botón iniciar (solo creador) */}
            {isCreator && (() => {
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
                    <Text style={[styles.startButtonText, !canStart && styles.startButtonTextDisabled]}>
                      {league.start_date ? '✏️ Editar fechas' : '▶ Iniciar liguilla'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            })()}

            {/* Compartir */}
            {league.access_code && (
              <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
                <Text style={styles.shareCode}>{league.access_code}</Text>
                <Text style={styles.shareLabel}>Toca para copiar el código 📋</Text>
              </TouchableOpacity>
            )}

            {/* Bloques header */}
            <View style={styles.blocksHeader}>
              <Text style={styles.sectionTitle}>Bloques ({blocks.length})</Text>
              <TouchableOpacity
                style={styles.addBlockButton}
                onPress={() => router.push(`/(app)/leagues/${league.id}/add-block`)}
              >
                <Text style={styles.addBlockText}>+ Añadir</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.blockRow}>
            {/* Handles de reordenación */}
            <View style={styles.orderHandles}>
              <TouchableOpacity
                onPress={() => handleMoveBlock(item.id, 'up')}
                disabled={index === 0}
                style={[styles.handle, index === 0 && styles.handleDisabled]}
              >
                <Text style={styles.handleText}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMoveBlock(item.id, 'down')}
                disabled={index === blocks.length - 1}
                style={[styles.handle, index === blocks.length - 1 && styles.handleDisabled]}
              >
                <Text style={styles.handleText}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Card */}
            <View style={styles.blockCardWrapper}>
              <BlockCard
                block={item}
                onPress={() => router.push(`/(app)/blocks/${item.id}`)}
              />
            </View>

            {/* Botón borrar */}
            <TouchableOpacity
              style={styles.deleteHandle}
              onPress={() => handleDeleteBlock(item)}
            >
              <Text style={styles.deleteText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBlocks}>
            <Text style={styles.emptyEmoji}>🧱</Text>
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
              {league.start_date ? 'Editar fechas' : '▶ Iniciar liguilla'}
            </Text>
            <Text style={modalStyles.subtitle}>
              Define el período de la liguilla. Los participantes podrán registrar resultados durante estas fechas.
            </Text>

            <Text style={modalStyles.label}>Fecha de inicio</Text>
            <DateField
              value={startDate}
              onChange={setStartDate}
              placeholder="DD / MM / AAAA"
              onPress={() => setPickerTarget('start')}
            />
            {dateErrors.start && <Text style={modalStyles.error}>{dateErrors.start}</Text>}

            <Text style={[modalStyles.label, { marginTop: spacing.md }]}>Fecha de fin</Text>
            <DateField
              value={endDate}
              onChange={setEndDate}
              placeholder="DD / MM / AAAA"
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
          mode="date"
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
  container:          { flex: 1, backgroundColor: colors.background },
  centered:           { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  content:            { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header:             { paddingTop: spacing.xl, marginBottom: spacing.md },
  backText:           { color: colors.textSecondary, fontSize: typography.size.md, marginBottom: spacing.md },
  titleRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title:              { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, color: colors.textPrimary, flex: 1 },
  rankingButton:      { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  rankingButtonText:  { fontSize: typography.size.sm, color: colors.textSecondary, fontWeight: typography.weight.semibold },
  infoCard:           { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm, marginBottom: spacing.md },
  startSection:          { marginBottom: spacing.md, gap: spacing.xs },
  startHintRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  startHintEmoji:        { fontSize: 16 },
  startHintText:         { fontSize: typography.size.sm, color: colors.textSecondary, flex: 1 },
  startButton:           { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  startButtonDisabled:   { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  startButtonText:       { color: colors.textInverse, fontWeight: typography.weight.bold, fontSize: typography.size.md },
  startButtonTextDisabled: { color: colors.textMuted },
  shareButton:        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  shareCode:          { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, color: colors.primary, letterSpacing: 4 },
  shareLabel:         { fontSize: typography.size.sm, color: colors.textMuted },
  blocksHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle:       { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  addBlockButton:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  addBlockText:       { color: colors.textInverse, fontWeight: typography.weight.bold, fontSize: typography.size.sm },
  blockRow:           { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.xs },
  orderHandles:       { flexDirection: 'column', gap: 2 },
  handle:             { padding: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', width: 28, height: 28 },
  handleDisabled:     { opacity: 0.25 },
  handleText:         { fontSize: 10, color: colors.textSecondary },
  blockCardWrapper:   { flex: 1 },
  deleteHandle:       { padding: spacing.xs, alignItems: 'center', justifyContent: 'center', width: 36, height: 36 },
  deleteText:         { fontSize: 18 },
  emptyBlocks:        { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyEmoji:         { fontSize: 40 },
  emptyText:          { fontSize: typography.size.md, color: colors.textSecondary, fontWeight: typography.weight.medium },
  emptySubtext:       { fontSize: typography.size.sm, color: colors.textMuted },
  errorText:          { color: colors.error, fontSize: typography.size.md },
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
