export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          account_type: Database["public"]["Enums"]["account_type"]
          name: string
          avatar_url: string | null
          gym_location: string | null
          gym_description: string | null
          bio: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          account_type?: Database["public"]["Enums"]["account_type"]
          name: string
          avatar_url?: string | null
          gym_location?: string | null
          gym_description?: string | null
          bio?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          name?: string
          avatar_url?: string | null
          gym_location?: string | null
          gym_description?: string | null
          bio?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          id: string
          owner_type: Database["public"]["Enums"]["block_owner_type"]
          gym_id: string | null
          user_id: string | null
          photo_url: string
          identifier: string
          difficulty: Database["public"]["Enums"]["block_difficulty"]
          color: string | null
          sector: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_type: Database["public"]["Enums"]["block_owner_type"]
          gym_id?: string | null
          user_id?: string | null
          photo_url: string
          identifier: string
          difficulty: Database["public"]["Enums"]["block_difficulty"]
          color?: string | null
          sector?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_type?: Database["public"]["Enums"]["block_owner_type"]
          gym_id?: string | null
          user_id?: string | null
          photo_url?: string
          identifier?: string
          difficulty?: Database["public"]["Enums"]["block_difficulty"]
          color?: string | null
          sector?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          id: string
          user_id: string
          block_id: string
          number_of_goes: number
          result: Database["public"]["Enums"]["attempt_result"]
          score: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          block_id: string
          number_of_goes: number
          result: Database["public"]["Enums"]["attempt_result"]
          score: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          block_id?: string
          number_of_goes?: number
          result?: Database["public"]["Enums"]["attempt_result"]
          score?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          id: string
          creator_id: string
          name: string
          reward: string | null
          is_private: boolean
          access_code: string | null
          max_participants: number | null
          ranking_visible_during: boolean
          start_date: string | null
          end_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          creator_id: string
          name: string
          reward?: string | null
          is_private?: boolean
          access_code?: string | null
          max_participants?: number | null
          ranking_visible_during?: boolean
          start_date?: string | null
          end_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          creator_id?: string
          name?: string
          reward?: string | null
          is_private?: boolean
          access_code?: string | null
          max_participants?: number | null
          ranking_visible_during?: boolean
          start_date?: string | null
          end_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leagues_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_participants: {
        Row: {
          id: string
          league_id: string
          user_id: string
          joined_at: string | null
        }
        Insert: {
          id?: string
          league_id: string
          user_id: string
          joined_at?: string | null
        }
        Update: {
          id?: string
          league_id?: string
          user_id?: string
          joined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_participants_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_blocks: {
        Row: {
          id: string
          league_id: string
          block_id: string
          display_order: number
          created_at: string | null
        }
        Insert: {
          id?: string
          league_id: string
          block_id: string
          display_order?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          league_id?: string
          block_id?: string
          display_order?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_blocks_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_blocks_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      block_ratings: {
        Row: {
          id: string
          block_id: string
          user_id: string
          stars: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          block_id: string
          user_id: string
          stars: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          block_id?: string
          user_id?: string
          stars?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_ratings_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      block_comments: {
        Row: {
          id: string
          block_id: string
          user_id: string
          content: string
          created_at: string | null
        }
        Insert: {
          id?: string
          block_id: string
          user_id: string
          content: string
          created_at?: string | null
        }
        Update: {
          id?: string
          block_id?: string
          user_id?: string
          content?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_comments_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          type: Database["public"]["Enums"]["achievement_type"]
          achieved_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: Database["public"]["Enums"]["achievement_type"]
          achieved_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["achievement_type"]
          achieved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          requester_id: string
          addressee_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          requester_id?: string
          addressee_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_favorites: {
        Row: {
          id: string
          user_id: string
          gym_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          gym_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          gym_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_favorites_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_feed: {
        Row: {
          id: string
          user_id: string
          event_type: Database["public"]["Enums"]["feed_event_type"]
          block_id: string | null
          achievement_id: string | null
          likes_count: number
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          event_type: Database["public"]["Enums"]["feed_event_type"]
          block_id?: string | null
          achievement_id?: string | null
          likes_count?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: Database["public"]["Enums"]["feed_event_type"]
          block_id?: string | null
          achievement_id?: string | null
          likes_count?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_likes: {
        Row: {
          id: string
          feed_item_id: string
          user_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          feed_item_id: string
          user_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          feed_item_id?: string
          user_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "activity_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      gym_rankings: {
        Row: {
          user_id: string | null
          gym_id: string | null
          total_score: number | null
          blocks_completed: number | null
        }
        Relationships: []
      }
      gym_rankings_monthly: {
        Row: {
          user_id: string | null
          gym_id: string | null
          month: string | null
          total_score: number | null
        }
        Relationships: []
      }
      block_avg_rating: {
        Row: {
          block_id: string | null
          avg_stars: number | null
          rating_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: "user" | "gym"
      block_difficulty: "principiante" | "novato" | "medio" | "avanzado" | "experimentado" | "elite" | "profesional"
      block_owner_type: "gym" | "user"
      attempt_result: "flash" | "completed" | "not_completed"
      friendship_status: "pending" | "accepted"
      achievement_type:
        | "blocks_10"
        | "blocks_50"
        | "blocks_100"
        | "advanced_10"
        | "professional_5"
        | "flash_month"
        | "active_days_month"
      feed_event_type: "attempt_completed" | "achievement_earned"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["user", "gym"] as const,
      block_difficulty: ["principiante", "novato", "medio", "avanzado", "experimentado", "elite", "profesional"] as const,
      block_owner_type: ["gym", "user"] as const,
      attempt_result: ["flash", "completed", "not_completed"] as const,
      friendship_status: ["pending", "accepted"] as const,
      achievement_type: [
        "blocks_10",
        "blocks_50",
        "blocks_100",
        "advanced_10",
        "professional_5",
        "flash_month",
        "active_days_month",
      ] as const,
      feed_event_type: ["attempt_completed", "achievement_earned"] as const,
    },
  },
} as const
