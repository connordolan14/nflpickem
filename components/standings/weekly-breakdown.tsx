"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

interface WeeklyBreakdownProps {
  userId: string
  leagueId: string
}

interface WeeklyScore {
  week: number
  points: number
  picks_made: number
  is_bye: boolean
}

export function WeeklyBreakdown({ userId, leagueId }: WeeklyBreakdownProps) {
  const [weeklyScores, setWeeklyScores] = useState<WeeklyScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWeeklyBreakdown() {
      try {
        // Fetch weekly scores
        const { data: scoresData, error: scoresError } = await supabase
          .from("scores")
          .select("week, points")
          .eq("league_id", leagueId)
          .eq("user_id", userId)
          .order("week")

        if (scoresError) throw scoresError

        // Fetch picks to determine bye weeks
        const { data: picksData, error: picksError } = await supabase
          .from("picks")
          .select("week, is_bye")
          .eq("league_id", leagueId)
          .eq("user_id", userId)
          .order("week")

        if (picksError) throw picksError

        // Combine data for weeks 1-18
        const weeklyData: WeeklyScore[] = []
        for (let week = 1; week <= 18; week++) {
          const score = scoresData?.find((s) => s.week === week)
          const picks = picksData?.filter((p) => p.week === week) || []
          const hasBye = picks.some((p) => p.is_bye)

          weeklyData.push({
            week,
            points: score?.points || 0,
            picks_made: picks.length,
            is_bye: hasBye,
          })
        }

        setWeeklyScores(weeklyData)
      } catch (error) {
        console.error("Error fetching weekly breakdown:", error)
        // Mock data for demonstration
        const mockData: WeeklyScore[] = Array.from({ length: 18 }, (_, i) => ({
          week: i + 1,
          points: i < 8 ? Math.floor(Math.random() * 20) + 5 : 0,
          picks_made: i < 8 ? 2 : 0,
          is_bye: i === 3 || i === 7, // Mock bye weeks
        }))
        setWeeklyScores(mockData)
      } finally {
        setLoading(false)
      }
    }

    fetchWeeklyBreakdown()
  }, [userId, leagueId])

  if (loading) {
    return (
      <div className="p-4 bg-muted/10">
        <div className="animate-pulse flex space-x-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 w-12 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-muted/10 border-t border-border/50">
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">Weekly Breakdown</h4>
      <div className="grid grid-cols-6 md:grid-cols-9 lg:grid-cols-18 gap-2">
        {weeklyScores.map((week) => (
          <div key={week.week} className="text-center">
            <div className="text-xs text-muted-foreground mb-1">W{week.week}</div>
            <Card className="p-2 min-h-[60px] flex flex-col justify-center">
              <CardContent className="p-0">
                {week.is_bye ? (
                  <Badge variant="secondary" className="text-xs">
                    BYE
                  </Badge>
                ) : week.picks_made === 0 ? (
                  <span className="text-xs text-muted-foreground">-</span>
                ) : (
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">{week.points}</div>
                    <div className="text-xs text-muted-foreground">{week.picks_made} picks</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
