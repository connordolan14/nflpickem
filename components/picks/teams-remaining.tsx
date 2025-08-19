"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Users, Check } from "lucide-react"

interface TeamsRemainingProps {
  usedTeams: string[]
  leagueId: string
}

interface TeamData {
  id: string
  display_name: string
  nfl_team_code: string
  points_value: number
}

export function TeamsRemaining({ usedTeams, leagueId }: TeamsRemainingProps) {
  const [allTeams, setAllTeams] = useState<TeamData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeams()
  }, [leagueId])

  const fetchTeams = async () => {
    try {
      // Fetch all teams for current season
      const { data: teamsData, error } = await supabase
        .from("teams")
        .select("id, display_name, nfl_team_code, points_value")
        .order("display_name")

      if (error) throw error

      setAllTeams(teamsData || [])
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setLoading(false)
    }
  }

  const remainingTeams = allTeams.filter((team) => !usedTeams.includes(team.id))
  const usedTeamData = allTeams.filter((team) => usedTeams.includes(team.id))

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Teams Remaining</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <Users className="h-4 w-4 mr-2 text-primary" />
            Teams Remaining ({remainingTeams.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {remainingTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">All teams used!</p>
          ) : (
            remainingTeams.map((team) => (
              <div key={team.id} className="flex items-center justify-between p-2 rounded bg-muted/20">
                <div className="flex items-center gap-2">
                  <img
                    src={`/abstract-geometric-shapes.png?height=20&width=20&query=${team.nfl_team_code} NFL team logo`}
                    alt={team.display_name}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm font-medium">{team.display_name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {team.points_value} pts
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <Check className="h-4 w-4 mr-2 text-green-600" />
            Teams Used ({usedTeamData.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {usedTeamData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No teams used yet</p>
          ) : (
            usedTeamData.map((team) => (
              <div key={team.id} className="flex items-center justify-between p-2 rounded bg-muted/10 opacity-60">
                <div className="flex items-center gap-2">
                  <img
                    src={`/abstract-geometric-shapes.png?height=20&width=20&query=${team.nfl_team_code} NFL team logo`}
                    alt={team.display_name}
                    className="w-5 h-5 rounded grayscale"
                  />
                  <span className="text-sm">{team.display_name}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Used
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
