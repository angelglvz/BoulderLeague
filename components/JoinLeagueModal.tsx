import { useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { typography, spacing, radius } from '../constants'
import { useTheme } from '../lib/ThemeContext'
import { supabase } from '../lib/supabase'

interface Props {
  visible: boolean
  leagueId: string | null
  currentUserId: string | null
  onClose: () => void
  onJoined: () => void
}

export function JoinLeagueModal({ visible, leagueId, currentUserId, onClose, onJoined }: Props) {
  const { colors } = useTheme()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    setCode('')
    setError(null)
    onClose()
  }

  async function handleJoin() {
    if (!leagueId || !currentUserId) return
    if (code.trim().length < 4) {
      setError('El código debe tener al menos 4 caracteres')
      return
    }
    setLoading(true)
    setError(null)

    // Verificar código
    const { data: league, error: leagueErr } = await supabase
      .from('leagues')
      .select('id, max_participants, access_code')
      .eq('id', leagueId)
      .eq('access_code', code.trim().toUpperCase())
      .single()

    if (leagueErr || !league) {
      setError('Código incorrecto. Verifica e inténtalo de nuevo.')
      setLoading(false)
      return
    }

    // Verificar si ya participa
    const { data: existing } = await supabase
      .from('league_participants')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', currentUserId)
      .maybeSingle()

    if (existing) {
      setError('Ya eres participante de esta liguilla.')
      setLoading(false)
      return
    }

    // Verificar límite de participantes
    if (league.max_participants) {
      const { count } = await supabase
        .from('league_participants')
        .select('id', { count: 'exact', head: true })
        .eq('league_id', leagueId)

      if ((count ?? 0) >= league.max_participants) {
        setError('Esta liguilla ya está llena.')
        setLoading(false)
        return
      }
    }

    // Unirse
    const { error: insertErr } = await supabase
      .from('league_participants')
      .insert({ league_id: leagueId, user_id: currentUserId })

    setLoading(false)
    if (insertErr) {
      setError('No se pudo unir. Inténtalo de nuevo.')
    } else {
      setCode('')
      setError(null)
      onJoined()
      onClose()
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        activeOpacity={1}
        onPress={handleClose}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>🔒 Unirse con código</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Introduce el código que te ha dado el organizador
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: error ? colors.error : colors.border }]}
              placeholder="Código de acceso"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={t => { setCode(t.toUpperCase()); setError(null) }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />

            {error ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: colors.border }]}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
                onPress={handleJoin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Unirse</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  subtitle: { fontSize: typography.size.sm },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.lg,
    borderWidth: 1,
    textAlign: 'center',
    letterSpacing: 4,
  },
  errorText: { fontSize: typography.size.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btnSecondary: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  btnSecondaryText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  btnPrimary: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: typography.size.md, fontWeight: typography.weight.bold, color: '#fff' },
})

