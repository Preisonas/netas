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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      case_items: {
        Row: {
          case_id: string
          chance: number
          created_at: string
          id: string
          item_name: string
          label: string
        }
        Insert: {
          case_id: string
          chance?: number
          created_at?: string
          id?: string
          item_name: string
          label: string
        }
        Update: {
          case_id?: string
          chance?: number
          created_at?: string
          id?: string
          item_name?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      characters: {
        Row: {
          bank: number | null
          black_money: number | null
          cash: number | null
          created_at: string
          discord_id: string
          first_name: string | null
          id: string
          identifier: string
          inventory: Json | null
          job: string | null
          job_grade: number | null
          last_name: string | null
          last_synced_at: string
          metadata: Json | null
          playtime_minutes: number
          position: Json | null
          updated_at: string
        }
        Insert: {
          bank?: number | null
          black_money?: number | null
          cash?: number | null
          created_at?: string
          discord_id: string
          first_name?: string | null
          id?: string
          identifier: string
          inventory?: Json | null
          job?: string | null
          job_grade?: number | null
          last_name?: string | null
          last_synced_at?: string
          metadata?: Json | null
          playtime_minutes?: number
          position?: Json | null
          updated_at?: string
        }
        Update: {
          bank?: number | null
          black_money?: number | null
          cash?: number | null
          created_at?: string
          discord_id?: string
          first_name?: string | null
          id?: string
          identifier?: string
          inventory?: Json | null
          job?: string | null
          job_grade?: number | null
          last_name?: string | null
          last_synced_at?: string
          metadata?: Json | null
          playtime_minutes?: number
          position?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          amount_eur: number
          created_at: string
          credits: number
          discount_code: string | null
          environment: string
          fulfilled_at: string | null
          id: string
          status: string
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          amount_eur: number
          created_at?: string
          credits: number
          discount_code?: string | null
          environment?: string
          fulfilled_at?: string | null
          id?: string
          status?: string
          stripe_session_id: string
          user_id: string
        }
        Update: {
          amount_eur?: number
          created_at?: string
          credits?: number
          discount_code?: string | null
          environment?: string
          fulfilled_at?: string | null
          id?: string
          status?: string
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          max_uses: number | null
          updated_at: string
          uses: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          updated_at?: string
          uses?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          updated_at?: string
          uses?: number
        }
        Relationships: []
      }
      lucky_wheel_entries: {
        Row: {
          avatar_url: string | null
          discord_id: string
          id: string
          joined_at: string
          user_id: string
          username: string | null
          vip_tier: string | null
          wheel_id: string
        }
        Insert: {
          avatar_url?: string | null
          discord_id: string
          id?: string
          joined_at?: string
          user_id: string
          username?: string | null
          vip_tier?: string | null
          wheel_id: string
        }
        Update: {
          avatar_url?: string | null
          discord_id?: string
          id?: string
          joined_at?: string
          user_id?: string
          username?: string | null
          vip_tier?: string | null
          wheel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lucky_wheel_entries_wheel_id_fkey"
            columns: ["wheel_id"]
            isOneToOne: false
            referencedRelation: "lucky_wheels"
            referencedColumns: ["id"]
          },
        ]
      }
      lucky_wheels: {
        Row: {
          created_at: string
          created_by: string
          delivery_id: string | null
          ends_at: string
          id: string
          spun_at: string | null
          starts_at: string
          status: string
          updated_at: string
          vehicle_id: string
          winner_character_id: string | null
          winner_discord_id: string | null
          winner_entry_id: string | null
          winner_user_id: string | null
          winner_username: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          delivery_id?: string | null
          ends_at: string
          id?: string
          spun_at?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          vehicle_id: string
          winner_character_id?: string | null
          winner_discord_id?: string | null
          winner_entry_id?: string | null
          winner_user_id?: string | null
          winner_username?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          delivery_id?: string | null
          ends_at?: string
          id?: string
          spun_at?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
          winner_character_id?: string | null
          winner_discord_id?: string | null
          winner_entry_id?: string | null
          winner_user_id?: string | null
          winner_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lucky_wheels_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_deliveries: {
        Row: {
          character_id: string
          character_identifier: string
          created_at: string
          delivered_at: string | null
          discord_id: string
          error: string | null
          id: string
          item_name: string
          label: string
          metadata: Json | null
          plate: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          character_id: string
          character_identifier: string
          created_at?: string
          delivered_at?: string | null
          discord_id: string
          error?: string | null
          id?: string
          item_name: string
          label: string
          metadata?: Json | null
          plate?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          character_id?: string
          character_identifier?: string
          created_at?: string
          delivered_at?: string | null
          discord_id?: string
          error?: string | null
          id?: string
          item_name?: string
          label?: string
          metadata?: Json | null
          plate?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_deliveries_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          discord_id: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          discord_id?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          discord_id?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_vips: {
        Row: {
          created_at: string
          discord_id: string | null
          expires_at: string
          id: string
          tier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discord_id?: string | null
          expires_at: string
          id?: string
          tier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discord_id?: string | null
          expires_at?: string
          id?: string
          tier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vips_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "vip_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          created_at: string
          features: string[]
          id: string
          image_url: string | null
          images: string[]
          model: string
          model_name: string
          price: number
          sort_order: number
          top_speed: number
          trunk: number | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          brand: string
          created_at?: string
          features?: string[]
          id?: string
          image_url?: string | null
          images?: string[]
          model: string
          model_name?: string
          price?: number
          sort_order?: number
          top_speed?: number
          trunk?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          brand?: string
          created_at?: string
          features?: string[]
          id?: string
          image_url?: string | null
          images?: string[]
          model?: string
          model_name?: string
          price?: number
          sort_order?: number
          top_speed?: number
          trunk?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      vip_tiers: {
        Row: {
          active: boolean
          color: string
          created_at: string
          description: string | null
          duration_days: number
          id: string
          name: string
          perks: string[]
          price: number
          sort_order: number
          tier: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          name: string
          perks?: string[]
          price?: number
          sort_order?: number
          tier: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          name?: string
          perks?: string[]
          price?: number
          sort_order?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_owner: { Args: never; Returns: boolean }
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
    Enums: {},
  },
} as const
