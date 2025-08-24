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

      const byUser: Record<string, { week: number; points: number }[]> = {}
      for (const row of data || []) {
        const uid = row.user_id as string
        if (!byUser[uid]) byUser[uid] = []
        byUser[uid].push({ week: row.week as number, points: row.points as number })
      }

      // Determine max week present in data (fallback 18)
      const maxWeek = Math.max(18, ...(data || []).map((r) => (r.week as number) || 0))

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

      const rows = Array.from({ length: Math.min(maxWeek, 18) }, (_, i) => {
        const w = i + 1
        const obj: any = { week: `Week ${w}` }
        for (const p of topPlayers) {
          obj[p.user_id] = cumulativeByUser[p.user_id]?.[i] ?? 0
        }
        return obj
      })

      setChartData(rows)
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
