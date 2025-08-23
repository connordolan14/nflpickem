"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { fetchCurrentSeasonId } from "@/lib/season"
import { Users, Trophy, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"

interface MyLeaguesProps {
  userId: string
}

interface LeagueData {
  id: string
  name: string
  visibility: string
  member_count: number
  user_rank: number | null
  user_points: number | null
  next_deadline: string | null
}

export function MyLeagues({ userId }: MyLeaguesProps) {
  const [leagues, setLeagues] = useState<LeagueData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMyLeagues() {
      try {
        // 1) Memberships with league details and member counts
        const { data, error } = await supabase
          .from("league_members")
          .select(`
            league_id,
            leagues!inner (
              id,
              name,
              visibility,
              league_members(count)
            )
          `)
          .eq("user_id", userId)

        if (error) throw error

        const memberships = (data as any[]) || []
        const leagueIds: (string | number)[] = memberships.map((m) => m.leagues.id)

        // 2) User's standings across these leagues
        let standingsMap = new Map<string | number, { rank: number; total_points: number }>()
        if (leagueIds.length > 0) {
          const { data: standings, error: standingsError } = await supabase
            .from("league_standings")
            .select("league_id, rank, total_points")
            .eq("user_id", userId)
            .in("league_id", leagueIds)

          if (standingsError) throw standingsError
          ;(standings || []).forEach((s: any) => standingsMap.set(s.league_id, { rank: s.rank, total_points: s.total_points }))
        }

        // 3) Next upcoming NFL game (deadline) for current season
        let nextDeadline: string | null = null
        try {
          const seasonId = await fetchCurrentSeasonId(supabase)
          if (seasonId != null) {
            const { data: nextGame } = await supabase
              .from("games")
              .select("kickoff_ts")
              .eq("season_id", seasonId)
              .gte("kickoff_ts", new Date().toISOString())
              .order("kickoff_ts", { ascending: true })
              .limit(1)
              .maybeSingle()
            nextDeadline = nextGame?.kickoff_ts ?? null
          }
        } catch {
          // ignore deadline errors; we'll show null
        }

        const leagueData: LeagueData[] = memberships.map((item: any) => {
          const leaguesRel = item.leagues
          const memberCount = leaguesRel?.league_members?.[0]?.count || 0
          const userStanding = standingsMap.get(leaguesRel.id)
          return {
            id: leaguesRel.id,
            name: leaguesRel.name,
            visibility: leaguesRel.visibility,
            member_count: memberCount,
            user_rank: userStanding?.rank ?? null,
            user_points: userStanding?.total_points ?? null,
            next_deadline: nextDeadline,
          }
        })

        setLeagues(leagueData)
      } catch (error) {
        console.error("Error fetching leagues:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMyLeagues()
  }, [userId])

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle>My Leagues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Leagues</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href="/leagues/create">Create New</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {leagues.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">You haven't joined any leagues yet.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild>
                <Link href="/leagues/join">Join a League</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/leagues/create">Create League</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {leagues.map((league) => (
              <div
                key={league.id}
                className="p-4 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{league.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={league.visibility === "public" ? "default" : "secondary"} className="text-xs">
                        {league.visibility}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {league.member_count} members
                      </span>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/leagues/${league.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Trophy className="h-4 w-4 mr-1" />
                    {league.user_rank != null ? `Rank #${league.user_rank}` : "Rank N/A"}
                    {" "}• {league.user_points ?? 0} pts
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                  {league.next_deadline
                    ? new Date(league.next_deadline).toLocaleString(undefined, {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "No upcoming games"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
