import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSession } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { typography, spacing, radius } from '../../../constants'
import { useTheme } from '../../../lib/ThemeContext'
import { Icon } from '../../../components'

export default function JoinLeagueScreen() {
  const router = useRouter()
  const { user } = useSession()
  const { colors } = useTheme()
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
      // Ya participas: navegar directamente a la liguilla
      router.replace(`/(app)/leagues/${league.id}`)
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

    // Navegar directamente a la liguilla
    router.replace(`/(app)/leagues/${league.id}`)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.textSecondary} />
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Unirse a liguilla</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Introduce el código que te han compartido</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.codeInput, { backgroundColor: colors.surfaceAlt, color: colors.primary, borderColor: error ? colors.error : colors.border }]}
            placeholder="ESCALA24"
            placeholderTextColor={colors.textMuted}
            value={code}
            onChangeText={t => { setCode(t.toUpperCase()); setError('') }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
          />
          {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.buttonPrimary, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleJoin} activeOpacity={0.8} disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={[styles.buttonPrimaryText, { color: colors.textInverse }]}>Unirse</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:         { flex: 1 },
  inner:             { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  header:            { marginBottom: spacing.xl },
  backButton:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.lg },
  backText:          { fontSize: typography.size.md },
  title:             { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, marginBottom: spacing.xs },
  subtitle:          { fontSize: typography.size.md },
  form:              { marginBottom: spacing.lg, gap: spacing.xs },
  codeInput:         {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.lg,
    fontSize: typography.size['2xl'], fontWeight: typography.weight.bold,
    borderWidth: 1,
    textAlign: 'center', letterSpacing: 4,
  },
  errorText:         { fontSize: typography.size.sm, textAlign: 'center' },
  buttonPrimary:     { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  buttonDisabled:    { opacity: 0.6 },
  buttonPrimaryText: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
})
