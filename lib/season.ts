import type { SupabaseClient } from '@supabase/supabase-js'

let cachedSeasonId: number | null = null

function parseEnvSeason(): number | null {
  const raw = process.env.NEXT_PUBLIC_SEASON_ID || process.env.SEASON_ID
  if (!raw) return null
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

function coerceId(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isInteger(n)) return n
  }
  throw new Error(`Unable to coerce season id: ${v}`)
}

// Determine current season: highest year where is_active = true. If multiple active rows share year, pick highest id among them.
// If no active seasons found, throw (do NOT silently pick inactive). Caller can surface friendly error.
export async function fetchCurrentSeasonId(supabase: SupabaseClient): Promise<number> {
  if (cachedSeasonId) return cachedSeasonId

  const envId = parseEnvSeason()
  if (envId) {
    cachedSeasonId = envId
    return cachedSeasonId
  }

  // Active seasons ordered by (year DESC, id DESC)
  const { data: active, error: activeErr } = await supabase
    .from('seasons')
    .select('id, year, is_active')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)

  if (activeErr) {
    throw new Error('Failed fetching active seasons: ' + activeErr.message)
  }
  if (active && active.length === 1) {
    cachedSeasonId = coerceId(active[0].id)
    return cachedSeasonId
  }

  // No active season: explicit failure (enforce data correctness instead of guessing)
  throw new Error('No active season found (is_active = true). Mark a season active or set NEXT_PUBLIC_SEASON_ID.')
}
