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
import { colors, typography, spacing, radius } from '../../../../constants'
import type { Difficulty } from '../../../../types'

const DIFFICULTIES: { label: string; value: Difficulty }[] = [
  { label: 'Novato',        value: 'novato' },
  { label: 'Medio',         value: 'medio' },
  { label: 'Avanzado',      value: 'avanzado' },
  { label: 'Experimentado', value: 'experimentado' },
  { label: 'Profesional',   value: 'profesional' },
]

export default function AddBlockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [identifier, setIdentifier] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    if (!identifier.trim()) {
      Alert.alert('Campo obligatorio', 'Añade un identificador al bloque.')
      return
    }
    if (!imageUri) {
      Alert.alert('Foto obligatoria', 'Selecciona una foto para el bloque.')
      return
    }

    setLoading(true)
    try {
      const photoUrl = await uploadImage(imageUri)

      const { error } = await supabase.from('blocks').insert({
        league_id:  id,
        identifier: identifier.trim(),
        difficulty: difficulty ?? null,
        photo_url:  photoUrl,
      })

      if (error) throw error

      // Navegar de vuelta al detalle de la liguilla
      router.replace(`/(app)/leagues/${id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      Alert.alert('Error', `No se pudo guardar el bloque: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace(`/(app)/leagues/${id}`)}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nuevo bloque</Text>
        </View>

        {/* Foto */}
        <Text style={styles.label}>Foto *</Text>
        <TouchableOpacity style={styles.photoArea} onPress={showImageOptions} activeOpacity={0.8}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoEmoji}>📸</Text>
              <Text style={styles.photoHint}>Toca para añadir foto</Text>
            </View>
          )}
        </TouchableOpacity>
        {imageUri && (
          <TouchableOpacity onPress={showImageOptions} style={styles.changePhoto}>
            <Text style={styles.changePhotoText}>Cambiar foto</Text>
          </TouchableOpacity>
        )}

        {/* Identificador */}
        <Text style={[styles.label, { marginTop: spacing.md }]}>Identificador *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Amarillo sector A, Verde 3..."
          placeholderTextColor={colors.textMuted}
          value={identifier}
          onChangeText={setIdentifier}
          maxLength={60}
        />

        {/* Dificultad */}
        <Text style={styles.label}>
          Dificultad <Text style={styles.optional}>(opcional)</Text>
        </Text>
        <View style={styles.difficultyGrid}>
          {DIFFICULTIES.map(d => (
            <TouchableOpacity
              key={d.value}
              style={[
                styles.difficultyChip,
                difficulty === d.value && styles.difficultyChipActive,
              ]}
              onPress={() => setDifficulty(prev => (prev === d.value ? null : d.value))}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.difficultyText,
                  difficulty === d.value && styles.difficultyTextActive,
                ]}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Botón guardar */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.saveButtonText}>Guardar bloque</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: colors.background },
  content:              { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header:               { paddingTop: spacing.xl, marginBottom: spacing.lg },
  backText:             { color: colors.textSecondary, fontSize: typography.size.md, marginBottom: spacing.md },
  title:                { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, color: colors.textPrimary },
  label:                { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textSecondary, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  optional:             { fontWeight: typography.weight.regular, textTransform: 'none', letterSpacing: 0 },
  input:                { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.size.md, color: colors.textPrimary, marginBottom: spacing.lg },
  photoArea:            { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border, height: 200 },
  photoPreview:         { width: '100%', height: '100%' },
  photoPlaceholder:     { flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  photoEmoji:           { fontSize: 36 },
  photoHint:            { fontSize: typography.size.sm, color: colors.textMuted },
  changePhoto:          { alignItems: 'center', marginBottom: spacing.lg },
  changePhotoText:      { fontSize: typography.size.sm, color: colors.primary, fontWeight: typography.weight.medium },
  difficultyGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  difficultyChip:       { borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.surface },
  difficultyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  difficultyText:       { fontSize: typography.size.sm, color: colors.textSecondary, fontWeight: typography.weight.medium },
  difficultyTextActive: { color: colors.textInverse },
  saveButton:           { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveButtonDisabled:   { opacity: 0.6 },
  saveButtonText:       { color: colors.textInverse, fontSize: typography.size.md, fontWeight: typography.weight.bold },
})



