/**
 * database.types.ts
 *
 * Tipos sincronizados manualmente con schema.sql (Fase 1.8).
 *
 * Para regenerarlos automáticamente desde Supabase cuando hagas cambios en la BD:
 *   npm run types:gen
 *
 * Requiere estar autenticado en Supabase CLI:
 *   npx supabase login
 */

export type Difficulty = 'novato' | 'medio' | 'avanzado' | 'experimentado' | 'profesional'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar_url?: string | null
          updated_at?: string
        }
      }
      gyms: {
        Row: {
          id: string
          name: string
          location: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          location?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string | null
        }
      }
      leagues: {
        Row: {
          id: string
          name: string
          gym_id: string | null
          creator_id: string
          start_date: string
          end_date: string
          reward: string | null
          is_private: boolean
          max_participants: number | null
          access_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          gym_id?: string | null
          creator_id: string
          start_date: string
          end_date: string
          reward?: string | null
          is_private?: boolean
          max_participants?: number | null
          access_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          gym_id?: string | null
          start_date?: string
          end_date?: string
          reward?: string | null
          is_private?: boolean
          max_participants?: number | null
          access_code?: string | null
          updated_at?: string
        }
      }
      league_participants: {
        Row: {
          id: string
          league_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          league_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      blocks: {
        Row: {
          id: string
          league_id: string
          photo_url: string
          identifier: string
          difficulty: Difficulty | null
          created_at: string
        }
        Insert: {
          id?: string
          league_id: string
          photo_url: string
          identifier: string
          difficulty?: Difficulty | null
          created_at?: string
        }
        Update: {
          id?: string
          photo_url?: string
          identifier?: string
          difficulty?: Difficulty | null
        }
      }
      attempts: {
        Row: {
          id: string
          user_id: string
          block_id: string
          number_of_goes: number
          score: number
          timestamp: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          block_id: string
          number_of_goes: number
          score: number
          timestamp?: string
          updated_at?: string
        }
        Update: {
          id?: string
          number_of_goes?: number
          score?: number
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      difficulty: Difficulty
    }
  }
}

// ─── Tipos de conveniencia ───────────────────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Tipos directos para usar en componentes
export type User = Tables<'users'>
export type Gym = Tables<'gyms'>
export type League = Tables<'leagues'>
export type LeagueParticipant = Tables<'league_participants'>
export type Block = Tables<'blocks'>
export type Attempt = Tables<'attempts'>
