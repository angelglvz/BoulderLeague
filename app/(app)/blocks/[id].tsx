import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { colors, typography, spacing, radius } from '../../../constants'
import type { Block } from '../../../types'

const DIFFICULTY_LABEL: Record<string, string> = {
  novato:        '🟢 Novato',
  medio:         '🔵 Medio',
  avanzado:      '🟡 Avanzado',
  experimentado: '🟠 Experimentado',
  profesional:   '🔴 Profesional',
}

export default function BlockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [block, setBlock] = useState<Block | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchBlock()
  }, [id])

  async function fetchBlock() {
    const { data } = await supabase
      .from('blocks')
      .select('*')
      .eq('id', id)
      .single()

    if (data) setBlock(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!block) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Bloque no encontrado</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Foto grande */}
        <Image
          source={{ uri: block.photo_url }}
          style={styles.photo}
          resizeMode="cover"
        />

        <View style={styles.content}>
          {/* Botón volver */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>

          {/* Nombre */}
          <Text style={styles.identifier}>{block.identifier}</Text>

          {/* Dificultad */}
          {block.difficulty && (
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>
                {DIFFICULTY_LABEL[block.difficulty]}
              </Text>
            </View>
          )}

          {/* Fecha */}
          <Text style={styles.dateLabel}>
            Añadido el{' '}
            {new Date(block.created_at).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>

          {/* CTA registrar resultado */}
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => router.push(`/(app)/blocks/${block.id}/log-attempt`)}
            activeOpacity={0.8}
          >
            <Text style={styles.logButtonText}>✍️ Registrar resultado</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    marginBottom: spacing.xs,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: typography.size.md,
  },
  identifier: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.textPrimary,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  difficultyText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  dateLabel: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  logButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  logButtonText: {
    color: colors.textInverse,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.size.md,
  },
})

