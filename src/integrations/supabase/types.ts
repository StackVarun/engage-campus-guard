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
      attendance_challenges: {
        Row: {
          attendance_session_id: string
          challenge_token: string
          created_at: string
          expires_at: string
          id: string
          issued_at: string
        }
        Insert: {
          attendance_session_id: string
          challenge_token?: string
          created_at?: string
          expires_at: string
          id?: string
          issued_at?: string
        }
        Update: {
          attendance_session_id?: string
          challenge_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          issued_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_challenges_attendance_session_id_fkey"
            columns: ["attendance_session_id"]
            isOneToOne: true
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_session_id: string
          id: string
          marked_at: string
          student_id: string
        }
        Insert: {
          attendance_session_id: string
          id?: string
          marked_at?: string
          student_id: string
        }
        Update: {
          attendance_session_id?: string
          id?: string
          marked_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_attendance_session_id_fkey"
            columns: ["attendance_session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          class_offering_id: string
          closed_at: string | null
          created_at: string
          expires_at: string
          id: string
          started_at: string
          started_by: string
          status: Database["public"]["Enums"]["attendance_session_status"]
        }
        Insert: {
          class_offering_id: string
          closed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          started_at?: string
          started_by: string
          status?: Database["public"]["Enums"]["attendance_session_status"]
        }
        Update: {
          class_offering_id?: string
          closed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          started_at?: string
          started_by?: string
          status?: Database["public"]["Enums"]["attendance_session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_class_offering_id_started_by_fkey"
            columns: ["class_offering_id", "started_by"]
            isOneToOne: false
            referencedRelation: "class_offerings"
            referencedColumns: ["id", "faculty_id"]
          },
        ]
      }
      class_offerings: {
        Row: {
          academic_year: string
          course_id: string
          created_at: string
          faculty_id: string
          id: string
          room_location_id: string | null
          section: string
          term: string
        }
        Insert: {
          academic_year: string
          course_id: string
          created_at?: string
          faculty_id: string
          id?: string
          room_location_id?: string | null
          section: string
          term: string
        }
        Update: {
          academic_year?: string
          course_id?: string
          created_at?: string
          faculty_id?: string
          id?: string
          room_location_id?: string | null
          section?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_offerings_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "class_offerings_room_location_id_fkey"
            columns: ["room_location_id"]
            isOneToOne: false
            referencedRelation: "room_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          credits: number | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          credits?: number | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          credits?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          class_offering_id: string
          enrolled_at: string
          student_id: string
        }
        Insert: {
          class_offering_id: string
          enrolled_at?: string
          student_id: string
        }
        Update: {
          class_offering_id?: string
          enrolled_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_offering_id_fkey"
            columns: ["class_offering_id"]
            isOneToOne: false
            referencedRelation: "class_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      faculty_profiles: {
        Row: {
          created_at: string
          department: string | null
          employee_number: string | null
          full_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          employee_number?: string | null
          full_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          employee_number?: string | null
          full_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_locations: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          radius_meters: number
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          radius_meters?: number
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          radius_meters?: number
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          created_at: string
          department: string | null
          full_name: string
          roll_number: string
          section: string | null
          semester: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          full_name: string
          roll_number: string
          section?: string | null
          semester?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          full_name?: string
          roll_number?: string
          section?: string | null
          semester?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_accounts: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_attendance_session: {
        Args: { p_attendance_session_id: string }
        Returns: {
          class_offering_id: string
          closed_at: string | null
          created_at: string
          expires_at: string
          id: string
          started_at: string
          started_by: string
          status: Database["public"]["Enums"]["attendance_session_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "attendance_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      faculty_owns_attendance_session: {
        Args: { attendance_session_id: string; faculty_user_id: string }
        Returns: boolean
      }
      faculty_owns_class: {
        Args: { faculty_user_id: string; offering_id: string }
        Returns: boolean
      }
      get_attendance_submission_context: {
        Args: { p_attendance_session_id: string; p_challenge_token: string }
        Returns: {
          already_recorded: boolean
          challenge_exists: boolean
          challenge_expires_at: string
          challenge_session_id: string
          enrolled: boolean
          session_exists: boolean
          session_expires_at: string
          session_id: string
          session_started_at: string
          session_status: Database["public"]["Enums"]["attendance_session_status"]
          student_profile_exists: boolean
        }[]
      }
      is_enrolled_in_class: {
        Args: { offering_id: string; student_user_id: string }
        Returns: boolean
      }
      start_attendance_session: {
        Args: { p_class_offering_id: string; p_duration_seconds: number }
        Returns: {
          challenge_expires_at: string
          challenge_id: string
          challenge_issued_at: string
          challenge_token: string
          class_offering_id: string
          closed_at: string
          expires_at: string
          session_created_at: string
          session_id: string
          started_at: string
          started_by: string
          status: Database["public"]["Enums"]["attendance_session_status"]
        }[]
      }
      student_can_access_attendance_session: {
        Args: { attendance_session_id: string; student_user_id: string }
        Returns: boolean
      }
      submit_attendance_challenge: {
        Args: { p_attendance_session_id: string; p_challenge_token: string }
        Returns: {
          attendance_session_id: string
          id: string
          marked_at: string
          student_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "attendance_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "STUDENT" | "FACULTY"
      attendance_session_status: "ACTIVE" | "CLOSED"
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
    Enums: {
      app_role: ["STUDENT", "FACULTY"],
      attendance_session_status: ["ACTIVE", "CLOSED"],
    },
  },
} as const
