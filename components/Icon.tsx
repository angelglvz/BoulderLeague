/**
 * Icon.tsx — Wrapper de Ionicons con defaults del theme
 *
 * Uso:
 *   <Icon name="trash-outline" />                     → tamaño md, color textSecondary
 *   <Icon name="trophy-outline" size={28} color={colors.primary} />
 *   <Icon name="play-circle-outline" color="primary" />  → alias de color del theme
 */

import Ionicons from '@expo/vector-icons/Ionicons'
import { useTheme } from '../lib/ThemeContext'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

type ColorAlias =
  | 'primary'
  | 'accent'
  | 'success'
  | 'error'
  | 'warning'
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted'

interface IconProps {
  name: IoniconsName
  size?: number
  /** Color directo (hex/rgb) o alias del theme */
  color?: string | ColorAlias
  style?: object
}

export function Icon({ name, size = 20, color = 'textSecondary', style }: IconProps) {
  const { colors } = useTheme()

  const COLOR_MAP: Record<ColorAlias, string> = {
    primary:       colors.primary,
    accent:        colors.accent,
    success:       colors.success,
    error:         colors.error,
    warning:       colors.warning,
    textPrimary:   colors.textPrimary,
    textSecondary: colors.textSecondary,
    textMuted:     colors.textMuted,
  }

  const resolvedColor = COLOR_MAP[color as ColorAlias] ?? color
  return (
    <Ionicons
      name={name}
      size={size}
      color={resolvedColor}
      style={style}
    />
  )
}

export default Icon

