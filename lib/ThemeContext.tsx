/**
 * ThemeContext — Proveedor de tema oscuro/claro para BoulderLeague
 * Persiste la preferencia del usuario en localStorage (web) o en memoria (nativo sin AsyncStorage).
 */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { getColors, type ThemeMode } from '../constants/theme'

const STORAGE_KEY = '@boulder_theme_mode'

// ── Helpers de persistencia multiplataforma ─────────────────────────────────
function saveTheme(mode: ThemeMode) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode)
    }
  } catch (_) {}
}

function loadTheme(): ThemeMode {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') return saved
    }
  } catch (_) {}
  return 'dark'
}

// ── Contexto ─────────────────────────────────────────────────────────────────
interface ThemeContextValue {
  mode: ThemeMode
  colors: ReturnType<typeof getColors>
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: getColors('dark'),
  toggleTheme: () => {},
  isDark: true,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark')

  // Cargar preferencia al montar
  useEffect(() => {
    setMode(loadTheme())
  }, [])

  function toggleTheme() {
    setMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      saveTheme(next)
      return next
    })
  }

  return (
    <ThemeContext.Provider
      value={{ mode, colors: getColors(mode), toggleTheme, isDark: mode === 'dark' }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
