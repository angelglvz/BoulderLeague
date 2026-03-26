import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, ScrollView, ActivityIndicator, Alert, Image, Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../../lib/supabase'
import { useSession } from '../../../../hooks'
import { useTheme } from '../../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../../constants'
import { Icon } from '../../../../components'

// 7 niveles con color identificativo (sin emojis)
const DIFFICULTIES = [
  { value: 'principiante', label: 'Principiante', color: '#AAAAAA' },
  { value: 'novato',       label: 'Novato',       color: '#4CAF50' },
  { value: 'medio',        label: 'Medio',        color: '#2196F3' },
  { value: 'avanzado',     label: 'Avanzado',     color: '#FFC107' },
  { value: 'experimentado',label: 'Experimentado',color: '#FF9800' },
  { value: 'elite',        label: 'Élite',        color: '#F44336' },
  { value: 'profesional',  label: 'Profesional',  color: '#9C27B0' },
] as const

type Difficulty = typeof DIFFICULTIES[number]['value']

const STYLES = [
  'Vertical', 'Placa', 'Desplome',
  'Regletas', 'Romos', 'Talones',
  'Empeines', 'Dinámicos',
]

export default function AddGymBlockScreen() {
  const router = useRouter()
  const { leagueId } = useLocalSearchParams<{ leagueId?: string }>()
  const { user } = useSession()
  const { colors } = useTheme()

  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [identifier, setIdentifier] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [sector, setSector] = useState('')
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [activeCount, setActiveCount] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) return
    supabase
      .from('blocks').select('id', { count: 'exact', head: true })
      .eq('gym_id', user.id).eq('is_active', true)
      .then(({ count }) => setActiveCount(count ?? 0))
  }, [user])

  // En móvil abre la cámara directamente; en web abre galería
  async function handlePhotoPress() {
    if (Platform.OS === 'web') {
      await pickFromGallery()
    } else {
      await openCamera()
    }
  }

  // Al tocar la foto ya puesta en móvil: ofrece cámara o galería
  async function handleChangePhoto() {
    if (Platform.OS === 'web') {
      await pickFromGallery()
      return
    }
    Alert.alert('Cambiar foto', 'Elige una opción', [
      { text: 'Cámara',   onPress: openCamera },
      { text: 'Galería',  onPress: pickFromGallery },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  async function openCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Sin acceso a la cámara', '¿Quieres usar la galería?', [
        { text: 'Galería', onPress: pickFromGallery },
        { text: 'Cancelar', style: 'cancel' },
      ])
      return
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.7 })
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri)
  }

  async function pickFromGallery() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a la galería.'); return }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.7 })
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri)
  }

  function toggleStyle(s: string) {
    setSelectedStyles(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!photoUri) e.photo = 'La foto es obligatoria'
    if (!identifier.trim()) e.identifier = 'El identificador es obligatorio'
    if (!difficulty) e.difficulty = 'La dificultad es obligatoria'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function uploadPhoto(uri: string): Promise<string> {
    const response = await fetch(uri)
    const blob = await response.blob()
    let ext = 'jpg'
    if (Platform.OS === 'web') {
      ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
    } else {
      ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg'
    }
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
    const path = `blocks/gym_${user!.id}_${Date.now()}.${ext}`

    if (Platform.OS === 'web') {
      await supabase.storage.from('block-photos').upload(path, blob, { contentType })
    } else {
      const ab = await blob.arrayBuffer()
      await supabase.storage.from('block-photos').upload(path, ab, { contentType })
    }
    return supabase.storage.from('block-photos').getPublicUrl(path).data.publicUrl
  }

  async function handleSave() {
    if (!validate() || !user) return
    setSaving(true)
    try {
      const photoUrl = await uploadPhoto(photoUri!)
      const { data: block, error } = await supabase.from('blocks').insert({
        owner_type: 'gym',
        gym_id: user.id,
        photo_url: photoUrl,
        identifier: identifier.trim(),
        difficulty: difficulty!,
        sector: sector.trim() || null,
        color: selectedStyles.size > 0 ? Array.from(selectedStyles).join(', ') : null,
        is_active: true,
      }).select('id').single()
      if (error) throw error

      // Si viene de una liguilla, vincular el bloque al crearlo
      if (leagueId && block?.id) {
        await supabase.from('league_blocks').insert({
          league_id: leagueId,
          block_id:  block.id,
        })
      }

      router.back()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar el bloque')
    } finally {
      setSaving(false)
    }
  }

  const nearLimit = activeCount !== null && activeCount >= 99

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Nuevo bloque</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {/* Aviso límite */}
        {nearLimit && (
          <View style={[styles.warningBanner, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
            <Icon name="warning-outline" size={16} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              {activeCount}/100 bloques activos. Añadir este bloque desactivará el más antiguo.
            </Text>
          </View>
        )}

        {/* Banner de contexto de liguilla */}
        {leagueId && (
          <View style={[styles.leagueBanner, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + '55' }]}>
            <Icon name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.leagueBannerText, { color: colors.primary }]}>
              Este bloque se añadirá a tu catálogo y a la liguilla. Solo podrá resolverse una vez que la liguilla haya comenzado.
            </Text>
          </View>
        )}

        {/* ── Foto ── */}
        {photoUri ? (
          <TouchableOpacity onPress={handleChangePhoto} activeOpacity={0.85} style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            <View style={styles.changePhotoBadge}>
              <Icon name="camera-outline" size={14} color="#fff" />
              <Text style={styles.changePhotoText}>Cambiar foto</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.photoPlaceholder, { backgroundColor: colors.surface, borderColor: errors.photo ? colors.error : colors.border }]}
            onPress={handlePhotoPress}
            activeOpacity={0.8}
          >
            <Icon name="camera-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.photoPlaceholderText, { color: colors.textSecondary }]}>
              {Platform.OS === 'web' ? 'Seleccionar foto' : 'Hacer foto'}
            </Text>
            {Platform.OS !== 'web' && (
              <Text style={[styles.photoPlaceholderSub, { color: colors.textMuted }]}>
                Toca para abrir la cámara
              </Text>
            )}
          </TouchableOpacity>
        )}
        {errors.photo ? <Text style={[styles.error, { color: colors.error }]}>{errors.photo}</Text> : null}

        {/* ── Identificador ── */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Identificador</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: errors.identifier ? colors.error : colors.border }]}
            placeholder="Ej: A1, Rojo-01, Overhang"
            placeholderTextColor={colors.textMuted}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="characters"
          />
          {errors.identifier ? <Text style={[styles.error, { color: colors.error }]}>{errors.identifier}</Text> : null}
        </View>

        {/* ── Dificultad — 7 niveles con color ── */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Dificultad</Text>
          <View style={styles.diffGrid}>
            {DIFFICULTIES.map(d => {
              const selected = difficulty === d.value
              return (
                <TouchableOpacity
                  key={d.value}
                  style={[
                    styles.diffBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selected && { backgroundColor: d.color + '22', borderColor: d.color },
                  ]}
                  onPress={() => setDifficulty(d.value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.diffDot, { backgroundColor: d.color }]} />
                  <Text style={[styles.diffLabel, { color: selected ? d.color : colors.textSecondary }]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
          {errors.difficulty ? <Text style={[styles.error, { color: colors.error }]}>{errors.difficulty}</Text> : null}
        </View>

        {/* ── Estilo (multiselección) ── */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Estilo <Text style={{ fontWeight: '400', textTransform: 'none' }}>(opcional)</Text></Text>
          <View style={styles.styleGrid}>
            {STYLES.map(s => {
              const selected = selectedStyles.has(s)
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.styleChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selected && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                  ]}
                  onPress={() => toggleStyle(s)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.styleChipText, { color: selected ? colors.primary : colors.textSecondary }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* ── Sección (opcional) ── */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Sección <Text style={{ fontWeight: '400', textTransform: 'none' }}>(opcional)</Text></Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Ej: A, Cueva, Izquierda"
            placeholderTextColor={colors.textMuted}
            value={sector}
            onChangeText={setSector}
            autoCapitalize="words"
          />
        </View>

        {/* ── Guardar ── */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={[styles.saveBtnText, { color: colors.textInverse }]}>Guardar bloque</Text>
          }
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  body: { padding: spacing.lg, gap: spacing.lg },
  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, padding: spacing.md,
  },
  warningText: { flex: 1, fontSize: typography.size.sm },
  leagueBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, padding: spacing.md,
  },
  leagueBannerText: { flex: 1, fontSize: typography.size.sm, lineHeight: 18 },
  // Foto
  photoWrap: { position: 'relative' },
  photoPreview: { width: '100%', height: 260, borderRadius: radius.lg },
  changePhotoBadge: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  changePhotoText: { color: '#fff', fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  photoPlaceholder: {
    width: '100%', height: 200, borderRadius: radius.lg, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  photoPlaceholderText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  photoPlaceholderSub: { fontSize: typography.size.sm },
  // Campos
  fieldGroup: { gap: spacing.xs },
  label: {
    fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.md, fontSize: typography.size.md, borderWidth: 1,
  },
  error: { fontSize: typography.size.sm },
  // Dificultad
  diffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  diffBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.md, borderWidth: 1,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  diffDot: { width: 10, height: 10, borderRadius: 5 },
  diffLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  // Estilo
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  styleChip: {
    borderRadius: radius.full, borderWidth: 1,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
  },
  styleChipText: { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  // Guardar
  saveBtn: { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnText: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
})
