"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { WeeklyPicksCard } from "./weekly-picks-card"
import { PicksStats } from "./picks-stats"
import { TeamsRemaining } from "./teams-remaining"
import { History, TrendingUp, Calendar } from "lucide-react"
import Link from "next/link"

interface PicksHistoryProps {
  leagueId: string
  userId: string
}

interface PickHistoryData {
  week: number
  slot_number: number
  is_bye: boolean
  team_name: string | null
  team_code: string | null
  home_team: string | null
  away_team: string | null
  home_team_id: string | null
  away_team_id: string | null
  winner_team_id: string | null
  points_earned: number
  kickoff_ts: string | null
  status: string | null
  picked_team_id: string | null
}

interface WeekData {
  week: number
  picks: PickHistoryData[]
  total_points: number
  is_bye: boolean
  status: "completed" | "pending" | "future"
}

interface StatsData {
  total_points: number
  total_wins: number
  total_losses: number
  win_percentage: number
  best_week: { week: number; points: number }
  worst_week: { week: number; points: number }
  byes_used: number
}

export function PicksHistory({ leagueId, userId }: PicksHistoryProps) {
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [usedTeams, setUsedTeams] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchPicksHistory()
  }, [leagueId, userId])

  const fetchPicksHistory = async () => {
    try {
      // Fetch all picks for the user in this league
      const { data: picksData, error: picksError } = await supabase
        .from("picks")
        .select(`
          week,
          slot_number,
          is_bye,
          picked_team_id,
          teams:picked_team_id(display_name, nfl_team_code),
          games!inner(
            home_team_id,
            away_team_id,
            winner_team_id,
            kickoff_ts,
            status,
            home_team:teams!games_home_team_id_fkey(display_name),
            away_team:teams!games_away_team_id_fkey(display_name)
          )
        `)
        .eq("league_id", leagueId)
        .eq("user_id", userId)
        .order("week")
        .order("slot_number")

      if (picksError) throw picksError

      // Fetch scores for points calculation
      const { data: scoresData, error: scoresError } = await supabase
        .from("scores")
        .select("week, points")
        .eq("league_id", leagueId)
        .eq("user_id", userId)

      if (scoresError) throw scoresError

      // Process data into weekly format
      const weeklyMap = new Map<number, WeekData>()

      // Initialize all 18 weeks
      for (let week = 1; week <= 18; week++) {
        weeklyMap.set(week, {
          week,
          picks: [],
          total_points: 0,
          is_bye: false,
          status: week <= 8 ? "completed" : week === 9 ? "pending" : "future", // Mock status
        })
      }

      // Process picks data
      const processedPicks: PickHistoryData[] =
        picksData?.map((pick) => ({
          week: pick.week,
          slot_number: pick.slot_number,
          is_bye: pick.is_bye,
          team_name: pick.teams?.display_name || null,
          team_code: pick.teams?.nfl_team_code || null,
          home_team: pick.games?.home_team?.display_name || null,
          away_team: pick.games?.away_team?.display_name || null,
          home_team_id: pick.games?.home_team_id || null,
          away_team_id: pick.games?.away_team_id || null,
          winner_team_id: pick.games?.winner_team_id || null,
          points_earned: pick.games?.winner_team_id === pick.picked_team_id ? Math.floor(Math.random() * 20) + 5 : 0, // Mock points
          kickoff_ts: pick.games?.kickoff_ts || null,
          status: pick.games?.status || null,
          picked_team_id: pick.picked_team_id,
        })) || []

      // Group picks by week
      processedPicks.forEach((pick) => {
        const weekData = weeklyMap.get(pick.week)
        if (weekData) {
          weekData.picks.push(pick)
          weekData.is_bye = pick.is_bye
          weekData.total_points += pick.points_earned
        }
      })

      // Add scores data
      scoresData?.forEach((score) => {
        const weekData = weeklyMap.get(score.week)
        if (weekData) {
          weekData.total_points = score.points
        }
      })

      const weeklyArray = Array.from(weeklyMap.values())
      setWeeklyData(weeklyArray)

      // Calculate stats
      const completedWeeks = weeklyArray.filter((w) => w.status === "completed")
      const totalPoints = completedWeeks.reduce((sum, w) => sum + w.total_points, 0)
      const totalWins = processedPicks.filter((p) => p.points_earned > 0).length
      const totalLosses = processedPicks.filter((p) => !p.is_bye && p.points_earned === 0).length
      const byesUsed = processedPicks.filter((p) => p.is_bye).length

      const bestWeek = completedWeeks.reduce(
        (best, week) => (week.total_points > best.points ? { week: week.week, points: week.total_points } : best),
        { week: 1, points: 0 },
      )

      const worstWeek = completedWeeks.reduce(
        (worst, week) => (week.total_points < worst.points ? { week: week.week, points: week.total_points } : worst),
        { week: 1, points: 100 },
      )

      setStats({
        total_points: totalPoints,
        total_wins: totalWins,
        total_losses: totalLosses,
        win_percentage: totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses)) * 100 : 0,
        best_week: bestWeek,
        worst_week: worstWeek,
        byes_used: byesUsed,
      })

      // Track used teams
      const used = processedPicks.filter((p) => !p.is_bye && p.picked_team_id).map((p) => p.picked_team_id!)
      setUsedTeams(used)
    } catch (error) {
      console.error("Error fetching picks history:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleWeekCollapse = (week: number) => {
    const newCollapsed = new Set(collapsedWeeks)
    if (newCollapsed.has(week)) {
      newCollapsed.delete(week)
    } else {
      newCollapsed.add(week)
    }
    setCollapsedWeeks(newCollapsed)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground mb-2">My Picks History</h1>
          <p className="text-muted-foreground">Track your picks and performance throughout the season</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/leagues/${leagueId}/picks`}>
              <Calendar className="h-4 w-4 mr-2" />
              Make Picks
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/leagues/${leagueId}`}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Standings
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && <PicksStats stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Weekly History */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="backdrop-blur-sm bg-card/80 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2 text-primary" />
                Weekly Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {weeklyData.map((weekData) => (
                <WeeklyPicksCard
                  key={weekData.week}
                  weekData={weekData}
                  isCollapsed={collapsedWeeks.has(weekData.week)}
                  onToggleCollapse={() => toggleWeekCollapse(weekData.week)}
                  leagueId={leagueId}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Teams Remaining */}
        <div className="space-y-4">
          <TeamsRemaining usedTeams={usedTeams} leagueId={leagueId} />
        </div>
      </div>
    </div>
  )
}
