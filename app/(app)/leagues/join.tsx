import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { colors, typography, spacing, radius } from '../../../constants'

export default function JoinLeagueScreen() {
  const router = useRouter()
  const { user } = useSession()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    if (!code.trim()) {
      setError('Introduce un código de acceso')
      return
    }
    setError('')
    setLoading(true)

    // Buscar la liguilla por código
    const { data: league, error: fetchError } = await supabase
      .from('leagues')
      .select('*')
      .eq('access_code', code.trim().toUpperCase())
      .single()

    if (fetchError || !league) {
      setLoading(false)
      setError('Código no válido. Comprueba que está bien escrito.')
      return
    }

    // Comprobar si la liguilla ha llegado al máximo de participantes
    if (league.max_participants) {
      const { count } = await supabase
        .from('league_participants')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', league.id)

      if (count !== null && count >= league.max_participants) {
        setLoading(false)
        setError('Esta liguilla ya ha alcanzado el máximo de participantes.')
        return
      }
    }

    // Comprobar si ya es participante
    const { data: existing } = await supabase
      .from('league_participants')
      .select('id')
      .eq('league_id', league.id)
      .eq('user_id', user!.id)
      .single()

    if (existing) {
      setLoading(false)
      Alert.alert('Ya participas', 'Ya estás apuntado a esta liguilla.', [
        { text: 'Ver liguilla', onPress: () => router.replace(`/(app)/leagues/${league.id}`) },
      ])
      return
    }

    // Unirse
    const { error: joinError } = await supabase
      .from('league_participants')
      .insert({ league_id: league.id, user_id: user!.id })

    setLoading(false)

    if (joinError) {
      setError('Error al unirse. Inténtalo de nuevo.')
      return
    }

    Alert.alert('¡Te has unido! 🧗', `Bienvenido a "${league.name}"`, [
      { text: 'Ver liguilla', onPress: () => router.replace(`/(app)/leagues/${league.id}`) },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Unirse a liguilla</Text>
        <Text style={styles.subtitle}>Introduce el código que te han compartido</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={[styles.codeInput, error ? styles.inputError : null]}
          placeholder="ESCALA24"
          placeholderTextColor={colors.textMuted}
          value={code}
          onChangeText={t => { setCode(t.toUpperCase()); setError('') }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={20}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
        onPress={handleJoin} activeOpacity={0.8} disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={colors.textInverse} />
          : <Text style={styles.buttonPrimaryText}>Unirse</Text>
        }
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  header: { marginBottom: spacing.xl },
  backText: { color: colors.textSecondary, fontSize: typography.size.md, marginBottom: spacing.md },
  title: { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontSize: typography.size.md, color: colors.textSecondary },
  form: { marginBottom: spacing.lg, gap: spacing.xs },
  codeInput: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.lg,
    fontSize: typography.size['2xl'], fontWeight: typography.weight.bold,
    color: colors.primary, borderWidth: 1, borderColor: colors.border,
    textAlign: 'center', letterSpacing: 4,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontSize: typography.size.sm, color: colors.error, textAlign: 'center' },
  buttonPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonPrimaryText: { color: colors.textInverse, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
})

