import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import { useSession, useProfile } from '../../../hooks'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../lib/ThemeContext'
import { typography, spacing, radius } from '../../../constants'
import { Icon, BlockCard } from '../../../components'

interface GymStats {
  activeBlocks: number
  attemptsThisWeek: number
}

interface Block {
  id: string
  identifier: string
  difficulty: string
  photo_url: string
  color?: string | null
  sector?: string | null
  is_active: boolean
  created_at?: string | null
}

export default function GymHomeScreen() {
  const { user, signOut } = useSession()
  const { profile, isUser } = useProfile()
  const router = useRouter()
  const { colors, toggleTheme, isDark } = useTheme()

  const [stats, setStats] = useState<GymStats>({ activeBlocks: 0, attemptsThisWeek: 0 })
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  // Si es USER redirigir al home de user
  useEffect(() => {
    if (isUser) router.replace('/(app)')
  }, [isUser])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

    const [blocksRes, attemptsRes] = await Promise.all([
      supabase
        .from('blocks')
        .select('*')
        .eq('gym_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('attempts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgo)
        .in('block_id',
          (await supabase.from('blocks').select('id').eq('gym_id', user.id)).data?.map(b => b.id) ?? []
        ),
    ])

    if (blocksRes.data) {
      setBlocks(blocksRes.data)
      setStats(s => ({ ...s, activeBlocks: blocksRes.data.length }))
    }
    setStats(s => ({ ...s, attemptsThisWeek: attemptsRes.count ?? 0 }))
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const blockPct = Math.min(stats.activeBlocks / 100, 1)
  const nearLimit = stats.activeBlocks >= 90

  function renderBlocks() {
    if (loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />
    if (blocks.length === 0) {
      return (
        <View style={[styles.emptyBlocks, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="grid-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aún no hay bloques</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Añade bloques con el botón "Añadir bloque" para empezar
          </Text>
        </View>
      )
    }
    return (
      <View style={styles.blockList}>
        {blocks.slice(0, 5).map(block => (
          <BlockCard
            key={block.id}
            block={block as any}
            onPress={() => router.push(`/(app)/blocks/${block.id}`)}
          />
        ))}
        {blocks.length > 5 && (
          <TouchableOpacity
            style={[styles.seeMoreBtn, { borderColor: colors.border }]}
            onPress={() => router.push('/(app)/gym/blocks')}
            activeOpacity={0.8}
          >
            <Text style={[styles.seeMoreText, { color: colors.primary }]}>
              Ver los {blocks.length - 5} restantes →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={isDark
            ? require('../../../assets/logo-climbify.png')
            : require('../../../assets/logo-climbify-light.png')
          }
          style={styles.logo}
          resizeMode="contain"
        />
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Nombre del gym */}
        {profile && (
          <Text style={[styles.gymName, { color: colors.textPrimary }]}>🏢 {profile.name}</Text>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: nearLimit ? colors.warning : colors.border }]}>
            <Text style={[styles.statValue, { color: nearLimit ? colors.warning : colors.primary }]}>
              {stats.activeBlocks}<Text style={styles.statMax}>/100</Text>
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bloques activos</Text>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.barFill, { width: `${blockPct * 100}%` as any, backgroundColor: nearLimit ? colors.warning : colors.primary }]} />
            </View>
            {nearLimit && (
              <Text style={[styles.warningText, { color: colors.warning }]}>⚠️ Cerca del límite</Text>
            )}
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>{stats.attemptsThisWeek}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Intentos esta semana</Text>
          </View>
        </View>

        {/* Accesos rápidos */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Acciones</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(app)/gym/blocks/add')}
            activeOpacity={0.8}
          >
            <Icon name="add-circle-outline" size={22} color="#fff" />
            <Text style={styles.quickBtnText}>Añadir bloque</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/(app)/gym/${user?.id}/ranking`)}
            activeOpacity={0.8}
          >
            <Icon name="podium-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.quickBtnTextAlt, { color: colors.textSecondary }]}>Ver ranking</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(app)/leagues/create')}
            activeOpacity={0.8}
          >
            <Icon name="trophy-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.quickBtnTextAlt, { color: colors.textSecondary }]}>Crear liguilla</Text>
          </TouchableOpacity>
        </View>

        {/* Bloques activos */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Bloques activos</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/gym/blocks')}>
            <Text style={[styles.sectionLink, { color: colors.primary }]}>Ver todos →</Text>
          </TouchableOpacity>
        </View>

        {renderBlocks()}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Modal ajustes */}
      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <View
            style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.settingsHeader}>
              <Icon name="settings-outline" size={20} color={colors.primary} />
              <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>Ajustes</Text>
            </View>
            <Text style={[styles.settingsLabel, { color: colors.textSecondary }]}>Apariencia</Text>
            <View style={[styles.themeRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              {[{ label: 'Oscuro', emoji: '🌙', active: isDark }, { label: 'Claro', emoji: '☀️', active: !isDark }].map(({ label, emoji, active }) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.themeOption, active ? [{ backgroundColor: colors.primaryMuted, borderColor: colors.primary }] : { borderColor: 'transparent' }]}
                  onPress={() => { if (!active) toggleTheme() }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.themeEmoji}>{emoji}</Text>
                  <Text style={[styles.themeLabel, { color: active ? colors.primary : colors.textSecondary }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
  container: { flex: 1, paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  logo: { height: 52, width: 213 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  signOutBtn: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  signOut: { fontSize: typography.size.sm },
  gymName: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 4 },
  statValue: { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold },
  statMax: { fontSize: typography.size.md, fontWeight: typography.weight.medium },
  statLabel: { fontSize: typography.size.xs },
  barTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  barFill: { height: 4, borderRadius: 2 },
  warningText: { fontSize: typography.size.xs },
  sectionTitle: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionLink: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  quickBtn: { flex: 1, borderRadius: radius.md, borderWidth: 1, padding: spacing.sm, alignItems: 'center', gap: 4 },
  quickBtnText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: '#fff', textAlign: 'center' },
  quickBtnTextAlt: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textAlign: 'center' },
  loader: { marginTop: spacing.md },
  emptyBlocks: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold, textAlign: 'center' },
  emptySubtext: { fontSize: typography.size.sm, textAlign: 'center', lineHeight: typography.size.sm * 1.5 },
  blockList: { gap: spacing.sm },
  seeMoreBtn: { borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  seeMoreText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  settingsCard: { width: '100%', maxWidth: 360, borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settingsTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  settingsLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  themeRow: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, padding: spacing.xs, gap: spacing.xs },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, gap: 4 },
  themeEmoji: { fontSize: 22 },
  themeLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  closeBtn: { borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  closeBtnText: { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
})

