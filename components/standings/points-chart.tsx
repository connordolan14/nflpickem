"use client"

import { useEffect, useMemo, useState } from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { supabase } from "@/lib/supabase"

interface StandingData {
  user_id: string
  display_name: string
  total_points: number
  wins: number
  losses: number
  byes_used: number
  rank: number
}

interface PointsChartProps {
  standings: StandingData[]
  leagueId: string
}

export function PointsChart({ standings, leagueId }: PointsChartProps) {
  const topPlayers = useMemo(() => standings.slice(0, 5), [standings])
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    if (!topPlayers.length) {
      setChartData([])
      return
    }

    async function fetchWeeklyScores() {
      const userIds = topPlayers.map((s) => s.user_id)
  const { data, error } = await supabase
        .from("scores")
        .select("user_id, week, points")
        .eq("league_id", leagueId)
        .in("user_id", userIds)
        .order("week", { ascending: true })

      if (error) {
        console.error("Error loading scores for chart:", error)
        setChartData([])
        return
      }

  let scoreRows = data || []

      // Merge: compute live weekly points from picks+games, then override with persisted scores when present
      // This ensures partial weeks (e.g., Week 3 present in picks but not yet in scores) still show up.
      // Load picks for these users with their games
      const { data: picks, error: picksErr } = await supabase
        .from("picks")
        .select(`user_id, week, is_bye, picked_team_id,
                 games(winner_team_id, status),
                 teams:picked_team_id(points_value)`)
        .eq("league_id", leagueId)
        .in("user_id", userIds)
      if (picksErr) {
        console.error("Picks query error for chart merge:", picksErr)
      }

      // League overrides for team points
      const { data: ltv, error: ltvErr } = await supabase
        .from("league_team_values")
        .select("team_id, points_value")
        .eq("league_id", leagueId)
      if (ltvErr) {
        console.error("LTV query error for chart merge:", ltvErr)
      }
      const ltvMap = new Map<string, number>()
      ;(ltv || []).forEach((r: any) => ltvMap.set(String(r.team_id), r.points_value as number))

      // Compute live points per user/week from final games only
      const liveMap = new Map<string, number>() // key: `${uid}:${wk}` -> points
      for (const p of picks || []) {
        if (p.is_bye) continue
        const uid = String(p.user_id)
        const wk = Number(p.week)
        const game = Array.isArray(p.games) ? p.games[0] : p.games
        const team = Array.isArray(p.teams) ? p.teams[0] : p.teams
        const winnerId = game?.winner_team_id
        const isFinal = (game?.status === "final") || (winnerId != null)
        if (!isFinal) continue
        const pickedId = p.picked_team_id
        const win = String(pickedId) === String(winnerId)
        if (!win) continue
        const override = pickedId ? ltvMap.get(String(pickedId)) : undefined
        const baseVal = team?.points_value ?? 0
        const key = `${uid}:${wk}`
        const prev = liveMap.get(key) ?? 0
        liveMap.set(key, prev + (override ?? baseVal ?? 0))
      }

      // Build merged map; prefer persisted scores if a row exists for that user/week
      const merged = new Map<string, { user_id: string; week: number; points: number }>()
      // Start with live
      for (const [key, pts] of liveMap.entries()) {
        const [uid, wkStr] = key.split(":" )
        merged.set(key, { user_id: uid, week: Number(wkStr), points: pts })
      }
      // Overlay scores (including zero-point weeks)
      for (const row of scoreRows) {
        const key = `${row.user_id}:${row.week}`
        merged.set(key, { user_id: String(row.user_id), week: Number(row.week), points: Number(row.points) || 0 })
      }

      // Flatten to rows for downstream processing
      const mergedRows = Array.from(merged.values()).sort((a, b) => a.week - b.week)

    const byUser: Record<string, { week: number; points: number }[]> = {}
    for (const row of mergedRows || []) {
        const uid = row.user_id as string
        if (!byUser[uid]) byUser[uid] = []
        byUser[uid].push({ week: row.week as number, points: row.points as number })
      }

      // Determine max week present in data (fallback 18)
    const maxWeek = Math.max(18, ...(mergedRows || []).map((r) => (r.week as number) || 0))

      // Build cumulative series per user
      const cumulativeByUser: Record<string, number[]> = {}
      for (const p of topPlayers) {
        const series = new Array(maxWeek).fill(0)
        let running = 0
        const rows = (byUser[p.user_id] || []).sort((a, b) => a.week - b.week)
        let idx = 0
        for (let w = 1; w <= maxWeek; w++) {
          while (idx < rows.length && rows[idx].week === w) {
            running += rows[idx].points || 0
            idx++
          }
          series[w - 1] = running
        }
        cumulativeByUser[p.user_id] = series
      }

  const chartRows = Array.from({ length: Math.min(maxWeek, 18) }, (_, i) => {
        const w = i + 1
        const obj: any = { week: `Week ${w}` }
        for (const p of topPlayers) {
          obj[p.user_id] = cumulativeByUser[p.user_id]?.[i] ?? 0
        }
        return obj
      })

  setChartData(chartRows)
    }

    fetchWeeklyScores()
  }, [leagueId, topPlayers])

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

  return (
    <ChartContainer
      config={topPlayers.reduce(
        (acc, standing, index) => ({
          ...acc,
          [standing.user_id]: {
            label: standing.display_name,
            color: colors[index] || "hsl(var(--chart-1))",
          },
        }),
        {},
      )}
      className="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          {topPlayers.map((standing, index) => (
            <Line
              key={standing.user_id}
              type="monotone"
              dataKey={standing.user_id}
              stroke={colors[index]}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
