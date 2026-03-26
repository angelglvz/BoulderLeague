/**
 * gym/leagues.tsx
 * Listado de todas las liguillas creadas por el rocódromo.
 * Ruta: /(app)/gym/leagues
 */

import { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSession } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../constants'
import { Icon, LeagueCard } from '../../../components'
import type { League } from '../../../types'

export default function GymLeaguesScreen() {
  const router = useRouter()
  const { user } = useSession()
  const { colors } = useTheme()

  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => { load() }, [user?.id]))

  async function load() {
    if (!user?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('leagues')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
    setLeagues((data as League[]) ?? [])
    setLoading(false)
  }

  function renderContent() {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )
    }
    if (leagues.length === 0) {
      return (
        <View style={styles.centered}>
          <Icon name="trophy-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Aún no has creado liguillas</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            Pulsa "+ Nueva" para crear tu primera liguilla
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(app)/leagues/create')}
            activeOpacity={0.8}
          >
            <Icon name="add-outline" size={18} color={colors.textInverse} />
            <Text style={[styles.newBtnText, { color: colors.textInverse }]}>Nueva liguilla</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {leagues.map(league => (
          <LeagueCard key={league.id} league={league} />
        ))}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-back-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Mis liguillas</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(app)/leagues/create')}
          activeOpacity={0.8}
        >
          <Icon name="add-outline" size={18} color={colors.textInverse} />
          <Text style={[styles.newBtnText, { color: colors.textInverse }]}>Nueva</Text>
        </TouchableOpacity>
      </View>

      {renderContent()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  backBtn:    { padding: 4 },
  title:      { flex: 1, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  newBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  newBtnText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.semibold, textAlign: 'center' },
  emptySub:   { fontSize: typography.size.sm, textAlign: 'center' },
  emptyBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.sm },
  list:       { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
})


