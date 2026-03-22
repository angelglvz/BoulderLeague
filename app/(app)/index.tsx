import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useSession } from '../../hooks'
import { colors, typography, spacing, radius } from '../../constants'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Placeholder — se sustituirá en la Fase 3 por el Home real
export default function HomeScreen() {
  const { user, signOut } = useSession()
  const [userName, setUserName] = useState<string | null>(null)
  const [dbStatus, setDbStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (!user) return

    async function fetchUser() {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user!.id)
        .single()

      if (error) {
        setDbStatus('error')
      } else {
        setUserName(data.name)
        setDbStatus('ok')
      }
    }

    fetchUser()
  }, [user])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧗 BoulderLeague</Text>

      {dbStatus === 'loading' && <ActivityIndicator color={colors.primary} />}

      {dbStatus === 'ok' && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>✅ Supabase conectado</Text>
          <Text style={styles.cardValue}>Hola, {userName}</Text>
          <Text style={styles.cardSub}>{user?.email}</Text>
        </View>
      )}

      {dbStatus === 'error' && (
        <View style={[styles.card, styles.cardError]}>
          <Text style={styles.cardLabel}>❌ Error al leer la BD</Text>
          <Text style={styles.cardSub}>Revisa las políticas RLS en Supabase</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
  cardError: {
    borderColor: colors.error,
  },
  cardLabel: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontWeight: typography.weight.semibold,
  },
  cardValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  cardSub: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  button: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.error,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
})
