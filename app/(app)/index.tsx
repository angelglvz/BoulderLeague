import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useSession } from '../../hooks'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/ThemeContext'
import { typography, spacing, radius } from '../../constants'
import { LeagueCard } from '../../components/LeagueCard'
import { Icon } from '../../components'
import type { League } from '../../types'

export default function HomeScreen() {
  const { user, signOut } = useSession()
  const router = useRouter()
  const { colors, toggleTheme, isDark } = useTheme()
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>🧗 BoulderLeague</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowSettings(true)}
            activeOpacity={0.8}
          >
            <Icon name="settings-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={[styles.signOutBtn, { borderColor: colors.border }]}>
            <Text style={[styles.signOut, { color: colors.textMuted }]}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.buttonPrimary, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(app)/leagues/create')}
          activeOpacity={0.8}
        >
          <Icon name="add-circle-outline" size={16} color={colors.textInverse} style={{ marginRight: 4 }} />
          <Text style={[styles.buttonPrimaryText, { color: colors.textInverse }]}>Nueva liguilla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buttonSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/(app)/leagues/join')}
          activeOpacity={0.8}
        >
          <Icon name="enter-outline" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.buttonSecondaryText, { color: colors.textSecondary }]}>Unirse con código</Text>
        </TouchableOpacity>
      </View>

      {/* Listado */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mis liguillas</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : leagues.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏔️</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aún no participas en ninguna liguilla</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Crea una nueva o únete con un código</Text>
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

      {/* ── Modal de ajustes / tema ────────────────────────────────── */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <View
            style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            // Evitar que el tap en la tarjeta cierre el modal
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.settingsHeader}>
              <Icon name="settings-outline" size={20} color={colors.primary} />
              <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>Ajustes</Text>
            </View>

            {/* Selector de tema */}
            <Text style={[styles.settingsLabel, { color: colors.textSecondary }]}>Apariencia</Text>
            <View style={[styles.themeRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              {/* Botón OSCURO */}
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  isDark && [styles.themeOptionActive, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }],
                  !isDark && { borderColor: 'transparent' },
                ]}
                onPress={() => { if (!isDark) toggleTheme() }}
                activeOpacity={0.8}
              >
                <Text style={styles.themeEmoji}>🌙</Text>
                <Text style={[styles.themeLabel, { color: isDark ? colors.primary : colors.textSecondary }]}>
                  Oscuro
                </Text>
                {isDark && (
                  <View style={[styles.themeCheck, { backgroundColor: colors.primary }]}>
                    <Icon name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Botón CLARO */}
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  !isDark && [styles.themeOptionActive, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }],
                  isDark && { borderColor: 'transparent' },
                ]}
                onPress={() => { if (isDark) toggleTheme() }}
                activeOpacity={0.8}
              >
                <Text style={styles.themeEmoji}>☀️</Text>
                <Text style={[styles.themeLabel, { color: !isDark ? colors.primary : colors.textSecondary }]}>
                  Claro
                </Text>
                {!isDark && (
                  <View style={[styles.themeCheck, { backgroundColor: colors.primary }]}>
                    <Icon name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Cerrar */}
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={() => setShowSettings(false)}
            >
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtn: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  signOut: {
    fontSize: typography.size.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  buttonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  buttonPrimaryText: {
    fontWeight: typography.weight.bold,
    fontSize: typography.size.md,
  },
  buttonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  buttonSecondaryText: {
    fontWeight: typography.weight.medium,
    fontSize: typography.size.md,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
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
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  // ── Settings modal ──────────────────────────────────────────
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  settingsCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  settingsLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeRow: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: 4,
    position: 'relative',
  },
  themeOptionActive: {},
  themeEmoji: { fontSize: 22 },
  themeLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  themeCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  closeBtnText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
})
