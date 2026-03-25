import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../../lib/supabase'
import { typography, spacing, radius } from '../../../../constants'
import { useTheme } from '../../../../lib/ThemeContext'
import type { Difficulty } from '../../../../types'

const DIFFICULTIES: { label: string; value: Difficulty }[] = [
  { label: '⚪ Principiante', value: 'principiante' },
  { label: '🟢 Novato',       value: 'novato' },
  { label: '🔵 Medio',        value: 'medio' },
  { label: '🟡 Avanzado',     value: 'avanzado' },
  { label: '🟠 Experimentado',value: 'experimentado' },
  { label: '🔴 Élite',        value: 'elite' },
  { label: '🟣 Profesional',  value: 'profesional' },
]

export default function AddBlockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()

  const [identifier, setIdentifier] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ identifier?: string; image?: string; general?: string }>({})

  // ─── Seleccionar imagen ───────────────────────────────────────────────────
  async function pickImage() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para añadir una foto.')
        return
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
    }
  }

  async function takePhoto() {
    if (Platform.OS === 'web') {
      Alert.alert('No disponible en web', 'Usa la opción de galería en el navegador.')
      return
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara para hacer una foto.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
    }
  }

  function showImageOptions() {
    if (Platform.OS === 'web') {
      pickImage()
      return
    }
    Alert.alert('Añadir foto', 'Elige una opción', [
      { text: 'Cámara',   onPress: takePhoto },
      { text: 'Galería',  onPress: pickImage },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  // ─── Subir imagen a Storage ───────────────────────────────────────────────
  async function uploadImage(uri: string): Promise<string> {
    const response = await fetch(uri)
    const blob = await response.blob()

    // En web la URI es blob:http://... sin extensión real → leer el MIME del blob
    // En móvil la URI es file:///... con extensión real
    let ext = 'jpg'
    if (Platform.OS === 'web') {
      // blob.type → "image/jpeg" | "image/png" | "image/webp" ...
      const mime = blob.type // ej: "image/jpeg"
      ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
    } else {
      ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg'
    }

    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
    const fileName = `${id}/${Date.now()}.${ext}`

    if (Platform.OS === 'web') {
      const { error } = await supabase.storage
        .from('block-photos')
        .upload(fileName, blob, { contentType })

      if (error) throw error
    } else {
      const arrayBuffer = await blob.arrayBuffer()

      const { error } = await supabase.storage
        .from('block-photos')
        .upload(fileName, arrayBuffer, { contentType })

      if (error) throw error
    }

    const { data } = supabase.storage
      .from('block-photos')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  // ─── Guardar bloque ───────────────────────────────────────────────────────
  async function handleSave() {
    const newErrors: { identifier?: string; image?: string; general?: string } = {}
    if (!identifier.trim()) newErrors.identifier = 'El identificador es obligatorio'
    if (!imageUri) newErrors.image = 'Selecciona una foto para el bloque'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setLoading(true)
    setErrors({})
    try {
      setUploadProgress('Subiendo foto…')
      const photoUrl = await uploadImage(imageUri!)
      setUploadProgress('Guardando bloque…')

      const { error } = await supabase.from('blocks').insert({
        league_id:  id,
        identifier: identifier.trim(),
        difficulty: difficulty ?? null,
        photo_url:  photoUrl,
      })

      if (error) throw error

      router.replace(`/(app)/leagues/${id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setErrors({ general: `No se pudo guardar el bloque: ${message}` })
    } finally {
      setLoading(false)
      setUploadProgress(null)
    }
  }

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace(`/(app)/leagues/${id}`)}>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>← Volver</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Nuevo bloque</Text>
        </View>

        {/* Foto */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Foto *</Text>
        <TouchableOpacity style={[styles.photoArea, { borderColor: errors.image ? colors.error : colors.border }]} onPress={showImageOptions} activeOpacity={0.8}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.surface }]}>
              <Text style={styles.photoEmoji}>📸</Text>
              <Text style={[styles.photoHint, { color: colors.textMuted }]}>Toca para añadir foto</Text>
            </View>
          )}
        </TouchableOpacity>
        {errors.image && <Text style={[styles.errorText, { color: colors.error }]}>{errors.image}</Text>}
        {imageUri && (
          <TouchableOpacity onPress={showImageOptions} style={styles.changePhoto}>
            <Text style={[styles.changePhotoText, { color: colors.primary }]}>Cambiar foto</Text>
          </TouchableOpacity>
        )}

        {/* Identificador */}
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>Identificador *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: errors.identifier ? colors.error : colors.border, color: colors.textPrimary }]}
          placeholder="Ej: Amarillo sector A, Verde 3..."
          placeholderTextColor={colors.textMuted}
          value={identifier}
          onChangeText={t => { setIdentifier(t); setErrors(e => ({ ...e, identifier: undefined })) }}
          maxLength={60}
        />
        {errors.identifier && <Text style={[styles.errorText, { color: colors.error }]}>{errors.identifier}</Text>}

        {/* Dificultad */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Dificultad <Text style={styles.optional}>(opcional)</Text>
        </Text>
        <View style={styles.difficultyGrid}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d.value}
              style={[
                styles.difficultyChip,
                { borderColor: colors.border, backgroundColor: colors.surface },
                difficulty === d.value && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setDifficulty(prev => (prev === d.value ? null : d.value))}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.difficultyText,
                  { color: difficulty === d.value ? colors.textInverse : colors.textSecondary },
                ]}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error general */}
        {errors.general && (
          <View style={[styles.errorCard, { backgroundColor: colors.error + '18', borderColor: colors.error + '40' }]}>
            <Text style={[styles.errorCardText, { color: colors.error }]}>⚠️ {errors.general}</Text>
          </View>
        )}

        {/* Mensaje de progreso */}
        {uploadProgress && (
          <View style={[styles.progressCard, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
            <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: spacing.sm }} />
            <Text style={[styles.progressText, { color: colors.primary }]}>{uploadProgress}</Text>
          </View>
        )}

        {/* Botón guardar */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>Guardar bloque</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:            { flex: 1 },
  content:              { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header:               { paddingTop: spacing.xl, marginBottom: spacing.lg },
  backText:             { fontSize: typography.size.md, marginBottom: spacing.md },
  title:                { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  label:                { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  optional:             { fontWeight: typography.weight.regular, textTransform: 'none', letterSpacing: 0 },
  input:                { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.size.md, marginBottom: spacing.xs },
  errorText:            { fontSize: typography.size.sm, marginBottom: spacing.sm },
  errorCard:            { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, marginBottom: spacing.sm },
  errorCardText:        { fontSize: typography.size.sm, fontWeight: typography.weight.medium, flex: 1 },
  progressCard:         { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, marginBottom: spacing.sm },
  progressText:         { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  photoArea:            { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.xs, borderWidth: 1, height: 200 },
  photoPreview:         { width: '100%', height: '100%' },
  photoPlaceholder:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  photoEmoji:           { fontSize: 36 },
  photoHint:            { fontSize: typography.size.sm },
  changePhoto:          { alignItems: 'center', marginBottom: spacing.lg },
  changePhotoText:      { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  difficultyGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  difficultyChip:       { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  difficultyText:       { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  saveButton:           { borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveButtonDisabled:   { opacity: 0.6 },
  saveButtonText:       { fontSize: typography.size.md, fontWeight: typography.weight.bold },
})



