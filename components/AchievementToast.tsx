/**
 * AchievementToast — Notificación animada de medalla conseguida.
 *
 * - Aparece desde arriba con slide-in + spring bounce.
 * - Borde del color del tier de la medalla.
 * - Auto-cierre a los 4 s, o tap para cerrar antes.
 * - Cola de medallas: una tras otra con 500 ms de separación.
 * - Vibración suave con expo-haptics al aparecer cada medalla.
 */

import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../lib/ThemeContext'
import { Icon } from './Icon'
import { typography, spacing, radius } from '../constants'
import type { MedalDefinition } from '../lib/achievements'

// ─────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────
interface AchievementToastProps {
  medals: MedalDefinition[]   // cola de medallas nuevas
  onDismiss: () => void       // llamado cuando la cola se vacía
}

// ─────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────
export function AchievementToast({ medals, onDismiss }: Readonly<AchievementToastProps>) {
  const { colors } = useTheme()
  const [queue, setQueue]       = useState<MedalDefinition[]>(medals)
  const [current, setCurrent]   = useState<MedalDefinition | null>(medals[0] ?? null)
  const [visible, setVisible]   = useState(medals.length > 0)

  const slideY    = useRef(new Animated.Value(-160)).current
  const opacity   = useRef(new Animated.Value(0)).current
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sincronizar si llegan medallas nuevas desde fuera
  useEffect(() => {
    if (medals.length > 0) {
      setQueue(medals)
      setCurrent(medals[0])
      setVisible(true)
    }
  }, [medals])

  // Animación cuando aparece una medalla
  useEffect(() => {
    if (!current || !visible) return

    // Vibración suave
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    }

    // Slide-in desde arriba
    slideY.setValue(-160)
    opacity.setValue(0)
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    // Auto-dismiss a los 4 s
    if (autoTimer.current) clearTimeout(autoTimer.current)
    autoTimer.current = setTimeout(() => dismiss(), 4000)

    return () => { if (autoTimer.current) clearTimeout(autoTimer.current) }
  }, [current])

  function dismiss() {
    if (autoTimer.current) clearTimeout(autoTimer.current)

    // Slide-out hacia arriba
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: -160,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const remaining = queue.slice(1)
      if (remaining.length > 0) {
        // Siguiente medalla con 500 ms de pausa
        setTimeout(() => {
          setQueue(remaining)
          setCurrent(remaining[0])
        }, 500)
      } else {
        setVisible(false)
        setCurrent(null)
        onDismiss()
      }
    })
  }

  if (!visible || !current) return null

  const tierColor = current.tierColor

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          transform: [{ translateY: slideY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={dismiss}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: tierColor,
          },
        ]}
      >
        {/* Icono de medalla */}
        <View style={[styles.iconWrap, { backgroundColor: tierColor + '22' }]}>
          <Icon name="medal-outline" size={28} color={tierColor} />
        </View>

        {/* Contenido */}
        <View style={styles.content}>
          {/* Badge de tier */}
          <View style={[styles.tierBadge, { backgroundColor: tierColor + '33', borderColor: tierColor + '66' }]}>
            <Text style={[styles.tierBadgeText, { color: tierColor }]}>
              {current.tierName.toUpperCase()}
            </Text>
          </View>

          {/* Label de la medalla */}
          <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
            {current.label}
          </Text>

          {/* Puntos */}
          <Text style={[styles.points, { color: '#22C55E' }]}>
            +{current.points} pts
          </Text>
        </View>

        {/* Botón cerrar */}
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="close-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 56,          // debajo del safe-area / status bar
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tierBadgeText: {
    fontSize: typography.size.xs - 1,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  label: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  points: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
})


