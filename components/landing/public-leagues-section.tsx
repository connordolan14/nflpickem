"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase, type League } from "@/lib/supabase"
import { Users, Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"

interface LeagueWithMemberCount extends League {
  member_count: number
}

export function PublicLeaguesSection() {
  const [leagues, setLeagues] = useState<LeagueWithMemberCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPublicLeagues() {
      try {
        const { data, error } = await supabase
          .from("leagues")
          .select(`
            *,
            league_members(count)
          `)
          .eq("visibility", "public")
          .limit(3)

        if (error) throw error

        const leaguesWithCount =
          data?.map((league) => ({
            ...league,
            member_count: league.league_members?.[0]?.count || 0,
          })) || []

        setLeagues(leaguesWithCount)
      } catch (error) {
        console.error("Error fetching public leagues:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPublicLeagues()
  }, [])

  if (loading) {
    return (
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-4">Featured Public Leagues</h2>
            <p className="text-lg text-muted-foreground">Loading leagues...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-4">Featured Public Leagues</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of NFL fans in these popular public leagues. No invitation needed!
          </p>
        </div>

        {leagues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {leagues.map((league) => (
              <Card
                key={league.id}
                className="backdrop-blur-sm bg-card/80 border-border/50 hover:bg-card/90 transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-foreground">{league.name}</CardTitle>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      Public
                    </Badge>
                  </div>
                  {league.description && <p className="text-sm text-muted-foreground">{league.description}</p>}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      {league.member_count} members
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      2024 Season
                    </div>
                  </div>
                  <Button asChild className="w-full bg-transparent" variant="outline">
                    <Link href={`/leagues/${league.id}/join`}>
                      Join League
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No public leagues available yet.</p>
            <Button asChild>
              <Link href="/leagues/create">Create the First Public League</Link>
            </Button>
          </div>
        )}

        <div className="text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/leagues">
              View All Leagues
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
