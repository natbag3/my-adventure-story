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
      children: {
        Row: {
          avatar_emoji: string | null
          created_at: string
          date_of_birth: string | null
          eye_color: string | null
          favorite_animals: string[]
          favorite_colors: string[]
          favorite_foods: string[]
          favorite_hobbies: string[]
          favorite_places: string[]
          favorite_story_themes: string[]
          favorite_toys: string[]
          first_name: string
          freckles: boolean | null
          gender: string | null
          glasses: boolean | null
          hair_color: string | null
          hair_style: string | null
          id: string
          last_story_read_date: string | null
          learning_goals: string[]
          nickname: string | null
          outfit_color: string | null
          personality_answers: Json
          personality_traits: string[]
          portrait_url: string | null
          reference_photo_url: string | null
          shoes: string | null
          skin_tone: string | null
          streak_count: number
          updated_at: string
          user_id: string
          world_notes: string | null
        }
        Insert: {
          avatar_emoji?: string | null
          created_at?: string
          date_of_birth?: string | null
          eye_color?: string | null
          favorite_animals?: string[]
          favorite_colors?: string[]
          favorite_foods?: string[]
          favorite_hobbies?: string[]
          favorite_places?: string[]
          favorite_story_themes?: string[]
          favorite_toys?: string[]
          first_name: string
          freckles?: boolean | null
          gender?: string | null
          glasses?: boolean | null
          hair_color?: string | null
          hair_style?: string | null
          id?: string
          last_story_read_date?: string | null
          learning_goals?: string[]
          nickname?: string | null
          outfit_color?: string | null
          personality_answers?: Json
          personality_traits?: string[]
          portrait_url?: string | null
          reference_photo_url?: string | null
          shoes?: string | null
          skin_tone?: string | null
          streak_count?: number
          updated_at?: string
          user_id: string
          world_notes?: string | null
        }
        Update: {
          avatar_emoji?: string | null
          created_at?: string
          date_of_birth?: string | null
          eye_color?: string | null
          favorite_animals?: string[]
          favorite_colors?: string[]
          favorite_foods?: string[]
          favorite_hobbies?: string[]
          favorite_places?: string[]
          favorite_story_themes?: string[]
          favorite_toys?: string[]
          first_name?: string
          freckles?: boolean | null
          gender?: string | null
          glasses?: boolean | null
          hair_color?: string | null
          hair_style?: string | null
          id?: string
          last_story_read_date?: string | null
          learning_goals?: string[]
          nickname?: string | null
          outfit_color?: string | null
          personality_answers?: Json
          personality_traits?: string[]
          portrait_url?: string | null
          reference_photo_url?: string | null
          shoes?: string | null
          skin_tone?: string | null
          streak_count?: number
          updated_at?: string
          user_id?: string
          world_notes?: string | null
        }
        Relationships: []
      }
      pets: {
        Row: {
          created_at: string
          eye_color: string | null
          fur_color: string | null
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          eye_color?: string | null
          fur_color?: string | null
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          eye_color?: string | null
          fur_color?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_child_id: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active_child_id?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          active_child_id?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_child_id_fkey"
            columns: ["active_child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          child_id: string
          co_star_ids: string[]
          cover_emoji: string
          cover_gradient: string
          created_at: string
          favorite: boolean
          id: string
          length_minutes: number
          lesson: string
          mood: string
          pages: Json
          progress: number
          share_token: string
          story_summary: string | null
          theme: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          child_id: string
          co_star_ids?: string[]
          cover_emoji?: string
          cover_gradient?: string
          created_at?: string
          favorite?: boolean
          id?: string
          length_minutes?: number
          lesson: string
          mood: string
          pages?: Json
          progress?: number
          share_token?: string
          story_summary?: string | null
          theme: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          child_id?: string
          co_star_ids?: string[]
          cover_emoji?: string
          cover_gradient?: string
          created_at?: string
          favorite?: boolean
          id?: string
          length_minutes?: number
          lesson?: string
          mood?: string
          pages?: Json
          progress?: number
          share_token?: string
          story_summary?: string | null
          theme?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_reading_streak: {
        Args: { p_child_id: string }
        Returns: {
          last_story_read_date: string
          streak_count: number
        }[]
      }
      set_story_page_image_url: {
        Args: { p_image_url: string; p_page_index: number; p_story_id: string }
        Returns: undefined
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
