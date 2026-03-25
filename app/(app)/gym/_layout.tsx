import { Stack } from 'expo-router'
import { useTheme } from '../../../lib/ThemeContext'

export default function GymLayout() {
  const { colors } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  )
}

