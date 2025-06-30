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
          initial_weight: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          initial_weight: number
        }
        Update: {
          display_name?: string
        }
      }
      weight_entries: {
        Row: {
          id: string
          user_id: string
          weight: number
          percentage_change: number
          notes: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          weight: number
          percentage_change: number
          notes?: string | null
        }
        Update: {
          weight?: number
          percentage_change?: number
          notes?: string | null
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          invite_code: string
          created_at: string
        }
        Insert: {
          name: string
          description?: string | null
          created_by: string
          invite_code: string
        }
        Update: {
          name?: string
          description?: string | null
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          display_name: string
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          display_name: string
        }
        Update: {
          display_name?: string
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