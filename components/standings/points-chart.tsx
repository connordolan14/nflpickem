"use client"

import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

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
}

export function PointsChart({ standings }: PointsChartProps) {
  // Mock weekly progression data (in real app, would fetch from scores table)
  const weeks = Array.from({ length: 8 }, (_, i) => i + 1)

  const chartData = weeks.map((week) => {
    const weekData: any = { week: `Week ${week}` }

    // Add top 5 players to chart
    standings.slice(0, 5).forEach((standing) => {
      // Mock cumulative points progression
      weekData[standing.display_name] = Math.floor((standing.total_points / 8) * week + Math.random() * 10 - 5)
    })

    return weekData
  })

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

  return (
    <ChartContainer
      config={standings.slice(0, 5).reduce(
        (acc, standing, index) => ({
          ...acc,
          [standing.display_name]: {
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
          {standings.slice(0, 5).map((standing, index) => (
            <Line
              key={standing.user_id}
              type="monotone"
              dataKey={standing.display_name}
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
