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

export function useProfile(): UseProfileReturn {
  const { user } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  async function fetchProfile(userId: string) {
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
      console.log('[useProfile] perfil cargado:', data.id, 'account_type:', data.account_type)
      setProfile(data)
    }
    setLoading(false)
  }

  async function refetch() {
    if (!user?.id) return
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

