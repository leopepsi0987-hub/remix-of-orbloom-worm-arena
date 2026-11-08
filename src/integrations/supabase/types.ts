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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      game_friends: {
        Row: {
          a: string
          b: string
          created_at: string
          requester: string
          status: string
        }
        Insert: {
          a: string
          b: string
          created_at?: string
          requester: string
          status?: string
        }
        Update: {
          a?: string
          b?: string
          created_at?: string
          requester?: string
          status?: string
        }
        Relationships: []
      }
      game_invites: {
        Row: {
          created_at: string
          from_id: string
          id: string
          status: string
          to_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          status?: string
          to_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          status?: string
          to_id?: string
        }
        Relationships: []
      }
      game_profiles: {
        Row: {
          avatar: string
          best_length: number
          created_at: string
          id: string
          last_seen: string
          matches: number
          party_leader: string | null
          token_hash: string
          total_kills: number
          total_seconds: number
          username: string
          username_key: string
        }
        Insert: {
          avatar?: string
          best_length?: number
          created_at?: string
          id?: string
          last_seen?: string
          matches?: number
          party_leader?: string | null
          token_hash: string
          total_kills?: number
          total_seconds?: number
          username: string
          username_key: string
        }
        Update: {
          avatar?: string
          best_length?: number
          created_at?: string
          id?: string
          last_seen?: string
          matches?: number
          party_leader?: string | null
          token_hash?: string
          total_kills?: number
          total_seconds?: number
          username?: string
          username_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_profiles_token_hash_fkey"
            columns: ["token_hash"]
            isOneToOne: true
            referencedRelation: "game_wallets"
            referencedColumns: ["token_hash"]
          },
        ]
      }
      game_quest_progress: {
        Row: {
          claimed: boolean
          period: string
          quest_id: string
          token_hash: string
          value: number
        }
        Insert: {
          claimed?: boolean
          period: string
          quest_id: string
          token_hash: string
          value?: number
        }
        Update: {
          claimed?: boolean
          period?: string
          quest_id?: string
          token_hash?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_quest_progress_token_hash_fkey"
            columns: ["token_hash"]
            isOneToOne: false
            referencedRelation: "game_wallets"
            referencedColumns: ["token_hash"]
          },
        ]
      }
      game_wallets: {
        Row: {
          created_at: string
          equipped: string
          gold: number
          match_id: string | null
          match_started_at: string | null
          owned: string[]
          token_hash: string
        }
        Insert: {
          created_at?: string
          equipped?: string
          gold?: number
          match_id?: string | null
          match_started_at?: string | null
          owned?: string[]
          token_hash: string
        }
        Update: {
          created_at?: string
          equipped?: string
          gold?: number
          match_id?: string | null
          match_started_at?: string | null
          owned?: string[]
          token_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      game_finish_match: {
        Args: {
          p_hash: string
          p_kills: number
          p_length: number
          p_match: string
        }
        Returns: Json
      }
      game_quest_period: { Args: { p_kind: string }; Returns: string }
      game_quests: {
        Args: never
        Returns: {
          goal: number
          kind: string
          metric: string
          quest_id: string
          reward: number
        }[]
      }
      game_social_action: {
        Args: { p_action: string; p_args?: Json; p_hash: string }
        Returns: Json
      }
      game_wallet_action: {
        Args: {
          p_action: string
          p_hash: string
          p_match?: string
          p_skin?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
