"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Coffee, Target } from "lucide-react"

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

interface ConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTeams: string[]
  games: GameData[]
  usingBye: boolean
  currentWeek: number
  onConfirm: () => void
  loading: boolean
}

export function ConfirmationModal({
  open,
  onOpenChange,
  selectedTeams,
  games,
  usingBye,
  currentWeek,
  onConfirm,
  loading,
}: ConfirmationModalProps) {
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

  const totalPoints = selectedTeams.reduce((sum, teamId) => {
    const teamInfo = getTeamInfo(teamId)
    return sum + (teamInfo?.points || 0)
  }, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-sm bg-card/95 border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {usingBye ? (
              <>
                <Coffee className="h-5 w-5 mr-2 text-accent" />
                Confirm Bye Week
              </>
            ) : (
              <>
                <Target className="h-5 w-5 mr-2 text-primary" />
                Confirm Your Picks
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {usingBye
              ? `You're about to use a bye week for Week ${currentWeek}. This cannot be undone.`
              : `Review your picks for Week ${currentWeek} before submitting.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {usingBye ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Coffee className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Bye Week</h3>
              <p className="text-sm text-muted-foreground">No picks for Week {currentWeek}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Selected Teams:</h4>
              {selectedTeams.map((teamId, index) => {
                const teamInfo = getTeamInfo(teamId)
                if (!teamInfo) return null

                return (
                  <div
                    key={teamId}
                    className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        Pick {index + 1}
                      </Badge>
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {teamInfo.code}
                      </div>
                      <span className="font-medium text-foreground">{teamInfo.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {teamInfo.points} pts
                    </Badge>
                  </div>
                )
              })}

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="font-medium text-foreground">Total Potential Points:</span>
                <Badge className="bg-primary/20 text-primary border-primary/30">{totalPoints} points</Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-primary hover:bg-primary/90">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Confirm Picks"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
