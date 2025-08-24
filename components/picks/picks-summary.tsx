"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Target, Coffee, CheckCircle } from "lucide-react"

interface GameData {
  id: string
  week: number
  home_team_id: string
  away_team_id: string
  home_team: string
  home_code: string
  away_team: string
  away_code: string
  home_points: number
  away_points: number
  kickoff_ts: string
  status: string
  winner_team_id: string | null
}

interface PicksSummaryProps {
  selectedTeams: string[]
  games: GameData[]
  usingBye: boolean
  byesUsed: number
  onByeWeek: () => void
  currentWeek: number
  lockedPicks?: { team_id: string; name: string; code: string; points: number }[]
  remainingSlots?: number
}

export function PicksSummary({ selectedTeams, games, usingBye, byesUsed, onByeWeek, currentWeek, lockedPicks = [], remainingSlots = 2 }: PicksSummaryProps) {
  const getTeamInfo = (teamId: string) => {
    for (const game of games) {
      if (game.home_team_id === teamId) {
        return {
          name: game.home_team,
          code: game.home_code,
          points: game.home_points,
        }
      }
      if (game.away_team_id === teamId) {
        return {
          name: game.away_team,
          code: game.away_code,
          points: game.away_points,
        }
      }
    }
    return null
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 mr-2 text-primary" />
          Your Picks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lockedPicks.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Locked pick(s): cannot be changed after kickoff</div>
            {lockedPicks.map((lp, i) => (
              <div key={`${lp.team_id}-${i}`} className="p-3 rounded-lg border bg-muted/30 border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">Locked</Badge>
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {lp.code}
                    </div>
                    <span className="font-medium text-foreground text-sm">{lp.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{lp.points} pts</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {remainingSlots > 0 ? `${remainingSlots} pick${remainingSlots === 1 ? "" : "s"} remaining this week` : "All weekly picks are locked or already used"}
        </div>

        {usingBye ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Coffee className="h-8 w-8 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Bye Week</h3>
            <p className="text-sm text-muted-foreground">Taking a break this week</p>
            <Badge variant="outline" className="mt-2">
              Week {currentWeek}
            </Badge>
          </div>
        ) : (
          <div className="space-y-3">
            {[1, 2].map((slot) => {
              const teamId = selectedTeams[slot - 1]
              const teamInfo = teamId ? getTeamInfo(teamId) : null

              return (
                <div
                  key={slot}
                  className={`p-3 rounded-lg border transition-all ${
                    teamInfo ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border/50 border-dashed"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        Pick {slot}
                      </Badge>
                      {teamInfo ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {teamInfo.code}
                          </div>
                          <span className="font-medium text-foreground text-sm">{teamInfo.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Select a team</span>
                      )}
                    </div>
                    {teamInfo && (
                      <Badge variant="outline" className="text-xs">
                        {teamInfo.points} pts
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Bye Weeks</span>
            <Badge variant="outline" className="text-xs">
              {byesUsed}/4 used
            </Badge>
          </div>

          <Button
            onClick={onByeWeek}
            variant={usingBye ? "default" : "outline"}
            size="sm"
            className="w-full bg-transparent"
            disabled={!usingBye && byesUsed >= 4}
          >
            {usingBye ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Using Bye Week
              </>
            ) : (
              <>
                <Coffee className="mr-2 h-4 w-4" />
                Use Bye Week
              </>
            )}
          </Button>

          {byesUsed >= 4 && !usingBye && (
            <p className="text-xs text-muted-foreground mt-2 text-center">All bye weeks used</p>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Pick exactly 2 teams per week</p>
          <p>• Each team can only be used once per season</p>
          <p>• Maximum 4 bye weeks allowed</p>
        </div>
      </CardContent>
    </Card>
  )
}
