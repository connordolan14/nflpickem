"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { BarChart3, TrendingUp, Users, Target } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface LeagueStatisticsProps {
  leagueId: string
}

interface MemberActivity {
  user_id: string
  display_name: string
  picks_submitted: number
  total_weeks: number
  submission_rate: number
}

interface TeamPopularity {
  team_name: string
  pick_count: number
  percentage: number
}

interface WeeklyAverage {
  week: number
  average_score: number
  total_picks: number
}

export function LeagueStatistics({ leagueId }: LeagueStatisticsProps) {
  const [memberActivity, setMemberActivity] = useState<MemberActivity[]>([])
  const [popularTeams, setPopularTeams] = useState<TeamPopularity[]>([])
  const [unpopularTeams, setUnpopularTeams] = useState<TeamPopularity[]>([])
  const [weeklyAverages, setWeeklyAverages] = useState<WeeklyAverage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatistics()
  }, [leagueId])

  const fetchStatistics = async () => {
    try {
      // Fetch member activity
      const { data: membersData, error: membersError } = await supabase
        .from("league_members")
        .select(`
          user_id,
          profiles!inner(display_name)
        `)
        .eq("league_id", leagueId)

      if (membersError) throw membersError

      // Fetch picks data for activity calculation
      const { data: picksData, error: picksError } = await supabase
        .from("picks")
        .select("user_id, week, picked_team_id, teams!inner(display_name)")
        .eq("league_id", leagueId)

      if (picksError) throw picksError

      // Calculate member activity
      const activityMap = new Map<string, { picks: number; weeks: Set<number> }>()

      picksData?.forEach((pick) => {
        if (!activityMap.has(pick.user_id)) {
          activityMap.set(pick.user_id, { picks: 0, weeks: new Set() })
        }
        const activity = activityMap.get(pick.user_id)!
        activity.picks++
        activity.weeks.add(pick.week)
      })

      const memberActivityData: MemberActivity[] =
        membersData?.map((member: any) => {
          const activity = activityMap.get(member.user_id) || { picks: 0, weeks: new Set<number>() }
          const totalWeeks = Math.max(activity.weeks.size, 1)
          const prof = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
          return {
            user_id: member.user_id,
            display_name: prof?.display_name ?? "Unknown",
            picks_submitted: activity.picks,
            total_weeks: totalWeeks,
            submission_rate: (activity.picks / (totalWeeks * 2)) * 100, // 2 picks per week
          }
        }) || []

      setMemberActivity(memberActivityData.sort((a, b) => b.submission_rate - a.submission_rate))

      // Calculate team popularity
      const teamPickCounts = new Map<string, number>()
      const totalPicks = picksData?.length || 1

      picksData?.forEach((pick: any) => {
        const teamRel = Array.isArray(pick.teams) ? pick.teams[0] : pick.teams
        const name = teamRel?.display_name
        if (name) {
          teamPickCounts.set(name, (teamPickCounts.get(name) || 0) + 1)
        }
      })

      const teamPopularityData: TeamPopularity[] = Array.from(teamPickCounts.entries())
        .map(([teamName, count]) => ({
          team_name: teamName,
          pick_count: count,
          percentage: (count / totalPicks) * 100,
        }))
        .sort((a, b) => b.pick_count - a.pick_count)

      setPopularTeams(teamPopularityData.slice(0, 5))
      setUnpopularTeams(teamPopularityData.slice(-5).reverse())

      // Real weekly averages
      const memberCount = Math.max(membersData?.length || 0, 1)

      // 1) Pull persisted weekly scores per user
      const { data: scoreRows, error: scoresErr } = await supabase
        .from("scores")
        .select("user_id, week, points")
        .eq("league_id", leagueId)
      if (scoresErr) throw scoresErr

      const sumByWeek: Map<number, number> = new Map()
      ;(scoreRows || []).forEach((r: any) => {
        const w = Number(r.week)
        sumByWeek.set(w, (sumByWeek.get(w) || 0) + Number(r.points || 0))
      })

      // 2) Live fallback for weeks missing in scores: compute from picks + final games with league overrides
      const { data: picksLive, error: picksLiveErr } = await supabase
        .from("picks")
        .select(`user_id, week, is_bye, picked_team_id,
                 games(winner_team_id, status),
                 teams:picked_team_id(points_value)`)
        .eq("league_id", leagueId)
      if (picksLiveErr) throw picksLiveErr

      const { data: ltv, error: ltvErr } = await supabase
        .from("league_team_values")
        .select("team_id, points_value")
        .eq("league_id", leagueId)
      if (ltvErr) throw ltvErr
      const ltvMap = new Map<string, number>()
      ;(ltv || []).forEach((r: any) => ltvMap.set(String(r.team_id), r.points_value as number))

      // Aggregate live user-week totals and total picks per week
      const liveSumByWeek: Map<number, number> = new Map()
      const picksCountByWeek: Map<number, number> = new Map() // non-bye picks submitted
      for (const p of picksLive || []) {
        const wk = Number(p.week)
        if (!p.is_bye) picksCountByWeek.set(wk, (picksCountByWeek.get(wk) || 0) + 1)
        if (p.is_bye) continue
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
        liveSumByWeek.set(wk, (liveSumByWeek.get(wk) || 0) + (override ?? baseVal ?? 0))
      }

      // Merge: prefer persisted scores if present; otherwise use live sums
      const weeks = new Set<number>([
        ...Array.from(sumByWeek.keys()),
        ...Array.from(liveSumByWeek.keys()),
      ])

      const averages: WeeklyAverage[] = Array.from(weeks)
        .sort((a, b) => a - b)
        .map((w) => ({
          week: w,
          average_score: (sumByWeek.has(w) ? sumByWeek.get(w)! : (liveSumByWeek.get(w) || 0)) / memberCount,
          total_picks: picksCountByWeek.get(w) || 0,
        }))

      setWeeklyAverages(averages)
    } catch (error) {
      console.error("Error fetching statistics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Member Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Member Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {memberActivity.map((member, index) => (
                <div key={member.user_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <span className="text-sm">{member.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{member.picks_submitted} picks</span>
                    <Badge
                      variant={
                        member.submission_rate >= 80
                          ? "default"
                          : member.submission_rate >= 50
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {member.submission_rate.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Popular Teams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Most Popular Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {popularTeams.map((team, index) => (
                <div key={team.team_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <span className="text-sm">{team.team_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{team.pick_count} picks</span>
                    <Badge variant="outline">{team.percentage.toFixed(1)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Least Popular Teams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Least Popular Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unpopularTeams.map((team, index) => (
                <div key={team.team_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <span className="text-sm">{team.team_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{team.pick_count} picks</span>
                    <Badge variant="secondary">{team.percentage.toFixed(1)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Averages Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Weekly Score Averages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                average_score: {
                  label: "Average Score",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyAverages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="average_score" fill="var(--color-average_score)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
