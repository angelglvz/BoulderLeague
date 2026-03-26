import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useTheme } from '../../lib/ThemeContext'
import { useSession } from '../../hooks/useSession'
import { useProfile } from '../../hooks/useProfile'

export default function AppLayout() {
  const { colors } = useTheme()
  const { user, loading: sessionLoading } = useSession()
  const { profile, loading: profileLoading, isGym, isUser } = useProfile()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (sessionLoading || profileLoading) return
    if (!user) {
      router.replace('/(auth)/welcome')
      return
    }
    if (!profile) return

    const currentPath = segments.join('/')

    // Rutas exclusivas de GYM — redirigir a usuarios
    const gymOnlyPaths = ['(app)/gym']
    const isOnGymRoute = gymOnlyPaths.some(p => currentPath.includes(p))
    if (isOnGymRoute && isUser) {
      router.replace('/(app)')
      return
    }

    // Rutas exclusivas de USER — redirigir a gyms
    const userOnlyPaths = ['(app)/leagues/create', '(app)/leagues/join', '(app)/gyms']
    const isOnUserRoute = userOnlyPaths.some(p => currentPath.includes(p))
    if (isOnUserRoute && isGym) {
      router.replace('/(app)/gym')
    }
  }, [sessionLoading, profileLoading, user, profile, segments])

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  )
}
