import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useSession } from '../../hooks'
import { supabase } from '../../lib/supabase'
import { colors, typography, spacing, radius } from '../../constants'
import { LeagueCard } from '../../components/LeagueCard'
import type { League } from '../../types'

export default function HomeScreen() {
  const { user, signOut } = useSession()
  const router = useRouter()
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchLeagues()
  }, [user])

  async function fetchLeagues() {
    setLoading(true)
    const { data, error } = await supabase
      .from('league_participants')
      .select('league_id, leagues(*)')
      .eq('user_id', user!.id)

    if (!error && data) {
      const leagueList = data
        .map((item: any) => item.leagues)
        .filter(Boolean) as League[]
      setLeagues(leagueList)
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🧗 BoulderLeague</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => router.push('/(app)/leagues/create')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonPrimaryText}>+ Nueva liguilla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => router.push('/(app)/leagues/join')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonSecondaryText}>Unirse con código</Text>
        </TouchableOpacity>
      </View>

      {/* Listado */}
      <Text style={styles.sectionTitle}>Mis liguillas</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : leagues.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏔️</Text>
          <Text style={styles.emptyText}>Aún no participas en ninguna liguilla</Text>
          <Text style={styles.emptySubtext}>Crea una nueva o únete con un código</Text>
        </View>
      ) : (
        <FlatList
          data={leagues}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <LeagueCard league={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: colors.primary,
  },
  signOut: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: colors.textInverse,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.md,
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSecondaryText: {
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
    fontSize: typography.size.md,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  loader: {
    marginTop: spacing.xl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
})
