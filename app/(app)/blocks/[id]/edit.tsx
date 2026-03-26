import { useEffect, useState } from 'react'
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
import type { BlockDifficulty } from '../../../../lib/scoring'

const DIFFICULTIES: { value: BlockDifficulty; label: string }[] = [
  { value: 'novato',        label: 'Novato' },
  { value: 'medio',         label: 'Medio' },
  { value: 'avanzado',      label: 'Avanzado' },
  { value: 'experimentado', label: 'Experimentado' },
  { value: 'profesional',   label: 'Profesional' },
]

export default function EditBlockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useSession()
  const { colors } = useTheme()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<BlockDifficulty | null>(null)
  const [color, setColor] = useState('')
  const [sector, setSector] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => { if (id) fetchBlock() }, [id])

  async function fetchBlock() {
    setLoading(true)
    const { data, error } = await supabase
      .from('blocks').select('*').eq('id', id).single()
    if (error || !data) {
      Alert.alert('Error', 'No se pudo cargar el bloque')
      router.back()
      return
    }
    // Verificar que el usuario es el owner
    const isOwner =
      (data.owner_type === 'gym' && data.gym_id === user?.id) ||
      (data.owner_type === 'user' && data.user_id === user?.id)
    if (!isOwner) {
      Alert.alert('Sin permiso', 'No puedes editar este bloque')
      router.back()
      return
    }
    setOriginalPhotoUrl(data.photo_url)
    setDifficulty(data.difficulty as BlockDifficulty)
    setColor(data.color ?? '')
    setSector(data.sector ?? '')
    setLoading(false)
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a la galería.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7, allowsEditing: true, aspect: [3, 4],
    })
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri)
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara.'); return }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7, allowsEditing: true, aspect: [3, 4],
    })
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!difficulty) e.difficulty = 'La dificultad es obligatoria'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function uploadPhoto(uri: string): Promise<string> {
    const ext = uri.split('.').pop() ?? 'jpg'
    const path = `blocks/gym_${user!.id}_${Date.now()}.${ext}`
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob()
      await supabase.storage.from('block-photos').upload(path, blob, { contentType: `image/${ext}` })
    } else {
      const ab = await (await fetch(uri)).arrayBuffer()
      await supabase.storage.from('block-photos').upload(path, ab, { contentType: `image/${ext}` })
    }
    return supabase.storage.from('block-photos').getPublicUrl(path).data.publicUrl
  }

  async function handleSave() {
    if (!validate() || !id) return
    setSaving(true)
    try {
      let photoUrl = originalPhotoUrl
      if (photoUri) photoUrl = await uploadPhoto(photoUri)

      const { error } = await supabase.from('blocks').update({
        photo_url: photoUrl,
        difficulty: difficulty!,
        color: color.trim() || null,
        sector: sector.trim() || null,
      }).eq('id', id)

      if (error) throw error
      router.back()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  )

  const currentPhoto = photoUri ?? originalPhotoUrl

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-back-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Editar bloque</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {/* Foto */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Foto</Text>
        {currentPhoto ? (
          <View>
            <Image source={{ uri: currentPhoto }} style={styles.photoPreview} resizeMode="cover" />
            <View style={styles.photoActions}>
              <TouchableOpacity style={[styles.photoActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={takePhoto} activeOpacity={0.8}>
                <Icon name="camera-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.photoActionText, { color: colors.textSecondary }]}>Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickImage} activeOpacity={0.8}>
                <Icon name="images-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.photoActionText, { color: colors.textSecondary }]}>Galería</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Dificultad */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Dificultad</Text>
          <View style={styles.chips}>
            {DIFFICULTIES.map(d => (
              <TouchableOpacity
                key={d.value}
                style={[styles.chip, { backgroundColor: colors.surface, borderColor: errors.difficulty ? colors.error : colors.border }, difficulty === d.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setDifficulty(d.value)} activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: difficulty === d.value ? colors.textInverse : colors.textSecondary }]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.difficulty ? <Text style={[styles.error, { color: colors.error }]}>{errors.difficulty}</Text> : null}
        </View>

        {/* Color */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Color <Text style={{ fontWeight: '400' }}>(opcional)</Text></Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Ej: Rojo, Azul"
            placeholderTextColor={colors.textMuted}
            value={color} onChangeText={setColor} autoCapitalize="words"
          />
        </View>

        {/* Sector */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Sector <Text style={{ fontWeight: '400' }}>(opcional)</Text></Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Ej: Zona A, Cueva"
            placeholderTextColor={colors.textMuted}
            value={sector} onChangeText={setSector} autoCapitalize="words"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
          onPress={handleSave} disabled={saving} activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color={colors.textInverse} /> : (
            <Text style={[styles.saveBtnText, { color: colors.textInverse }]}>Guardar cambios</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  body: { padding: spacing.lg, gap: spacing.md },
  label: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  photoPreview: { width: '100%', height: 220, borderRadius: radius.lg },
  photoActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  photoActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm },
  photoActionText: { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  fieldGroup: { gap: 4 },
  input: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.size.md, borderWidth: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipText: { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  error: { fontSize: typography.size.sm },
  saveBtn: { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
})


