"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
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
  user_rank: number
  user_points: number
  next_deadline: string | null
}

export function MyLeagues({ userId }: MyLeaguesProps) {
  const [leagues, setLeagues] = useState<LeagueData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMyLeagues() {
      try {
        const { data, error } = await supabase
          .from("league_members")
          .select(`
            league_id,
            leagues!inner (
              id,
              name,
              visibility
            )
          `)
          .eq("user_id", userId)

        if (error) throw error

        // Transform data and add mock stats (in real app, would calculate from scores/picks)
        const leagueData: LeagueData[] =
          data?.map((item, index) => ({
            id: item.leagues.id,
            name: item.leagues.name,
            visibility: item.leagues.visibility,
            member_count: Math.floor(Math.random() * 50) + 10, // Mock data
            user_rank: index + 1, // Mock data
            user_points: Math.floor(Math.random() * 100) + 50, // Mock data
            next_deadline: "2024-09-15T13:00:00Z", // Mock data
          })) || []

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
                    Rank #{league.user_rank} • {league.user_points} pts
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    Next: Sun 1:00 PM
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
