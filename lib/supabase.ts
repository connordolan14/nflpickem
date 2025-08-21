import { createClient } from "@supabase/supabase-js"

// Prefer environment variables so different deploy targets (local, preview, prod)
// get the right Supabase project + redirect domains. Fallbacks only to aid dev.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvxyijvtoyxqwfqhyobz.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2eHlpanZ0b3l4cXdmcWh5b2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzM2OTYsImV4cCI6MjA3MDQwOTY5Nn0.7tmEptJOAvNDPwWGrHzadvm3uXP3mrqYmmDahjH6EPg"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // If you later switch to PKCE or code exchange flows you can set flowType here.
    // flowType: 'pkce',
    // detectSessionInUrl true processes the hash (#access_token=...) upon redirect.
    detectSessionInUrl: true,
  },
})

// Database types
export interface Profile {
  user_id: string
  display_name: string | null
  avatar_url: string | null
}

export interface League {
  id: string
  name: string
  visibility: "public" | "private"
  owner_id: string
  season_id: number
  join_code: string | null
  rules_json: any
  description: string | null
}

export interface LeagueMember {
  id: string
  league_id: string
  user_id: string
  role: "admin" | "member"
}
