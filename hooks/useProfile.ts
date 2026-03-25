import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database.types'
import { useSession } from './useSession'

type Profile = Tables<'profiles'>

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  isUser: boolean
  isGym: boolean
  refetch: () => Promise<void>
}

// Cache en memoria para evitar refetch innecesarios
const profileCache = new Map<string, Profile>()

export function useProfile(): UseProfileReturn {
  const { user } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  async function fetchProfile(userId: string) {
    // Usar caché si está disponible
    const cached = profileCache.get(userId)
    if (cached) {
      if (mountedRef.current) {
        setProfile(cached)
        setLoading(false)
      }
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!mountedRef.current) return

    if (error) {
      console.warn('[useProfile] Error fetching profile:', error.message)
      setProfile(null)
    } else if (data) {
      profileCache.set(userId, data)
      setProfile(data)
    }
    setLoading(false)
  }

  async function refetch() {
    if (!user?.id) return
    // Limpiar caché para forzar recarga
    profileCache.delete(user.id)
    await fetchProfile(user.id)
  }

  useEffect(() => {
    mountedRef.current = true
    if (user?.id) {
      fetchProfile(user.id)
    } else {
      setProfile(null)
      setLoading(false)
    }
    return () => {
      mountedRef.current = false
    }
  }, [user?.id])

  return {
    profile,
    loading,
    isUser: profile?.account_type === 'user',
    isGym: profile?.account_type === 'gym',
    refetch,
  }
}

