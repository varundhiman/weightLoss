import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          height?: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          height?: number
        }
        Update: {
          display_name?: string
          height?: number
        }
      }
      weight_entries: {
        Row: {
          id: string
          user_id: string
          weight: number
          percentage_change: number
          notes: string | null
          is_private: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          weight: number
          percentage_change: number
          notes?: string | null
          is_private?: boolean
        }
        Update: {
          weight?: number
          percentage_change?: number
          notes?: string | null
          is_private?: boolean
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          invite_code: string
          start_date: string | null
          end_date: string | null
          total_weight_lost: number | null
          is_team_challenge: boolean
          created_at: string
        }
        Insert: {
          name: string
          description?: string | null
          created_by: string
          invite_code: string
          start_date?: string | null
          end_date?: string | null
          total_weight_lost?: number | null
          is_team_challenge?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          total_weight_lost?: number | null
          is_team_challenge?: boolean
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          display_name: string
          team_id: string | null
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          display_name: string
          team_id?: string | null
        }
        Update: {
          display_name?: string
          team_id?: string | null
        }
      }
      teams: {
        Row: {
          id: string
          group_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          group_id: string
          name: string
          color: string
        }
        Update: {
          name?: string
          color?: string
        }
      }
      messages: {
        Row: {
          id: string
          group_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          content: string
        }
        Update: {
          content?: string
        }
      }
    }
  }
}