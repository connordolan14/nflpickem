"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, Calendar } from "lucide-react"
import Link from "next/link"

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

interface WeeklyPicksCardProps {
  weekData: WeekData
  isCollapsed: boolean
  onToggleCollapse: () => void
  leagueId: string
}

export function WeeklyPicksCard({ weekData, isCollapsed, onToggleCollapse, leagueId }: WeeklyPicksCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return weekData.total_points > 0
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-red-50 text-red-700 border-red-200"
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getPickResult = (pick: PickHistoryData) => {
    if (pick.is_bye) return "bye"
    if (pick.status !== "completed") return "pending"
    return pick.points_earned > 0 ? "win" : "loss"
  }

  const formatGameTime = (kickoffTs: string | null) => {
    if (!kickoffTs) return ""
    const date = new Date(kickoffTs)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      {/* Week Header */}
      <div
        className="flex items-center justify-between p-4 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Week {weekData.week}</h3>
          <Badge variant="outline" className={getStatusColor(weekData.status)}>
            {weekData.status === "completed" ? `${weekData.total_points} pts` : weekData.status}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Your Picks Summary */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Your Picks:</span>
            {weekData.is_bye ? (
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                BYE
              </Badge>
            ) : weekData.picks.length === 0 ? (
              <span className="text-sm text-muted-foreground">Not picked</span>
            ) : (
              <div className="flex items-center gap-2">
                {weekData.picks.map((pick, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <img
                      src={`/abstract-geometric-shapes.png?height=20&width=20&query=${pick.team_code} NFL team logo`}
                      alt={pick.team_name || ""}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm font-medium">{pick.team_name}</span>
                    {getPickResult(pick) === "win" && <span className="text-green-600 text-xs">✓</span>}
                    {getPickResult(pick) === "loss" && <span className="text-red-600 text-xs">✗</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm">
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Week Details */}
      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {weekData.status === "future" ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground mb-4">Week {weekData.week} games haven't started yet</p>
              <Button asChild size="sm">
                <Link href={`/leagues/${leagueId}/picks?week=${weekData.week}`}>
                  Make Picks for Week {weekData.week}
                </Link>
              </Button>
            </div>
          ) : weekData.picks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No picks made for Week {weekData.week}</p>
              {weekData.status === "pending" && (
                <Button asChild size="sm">
                  <Link href={`/leagues/${leagueId}/picks?week=${weekData.week}`}>Make Picks Now</Link>
                </Button>
              )}
            </div>
          ) : weekData.is_bye ? (
            <div className="text-center py-8">
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-lg px-4 py-2">
                BYE WEEK
              </Badge>
              <p className="text-muted-foreground mt-2">You used a bye week</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weekData.picks.map((pick, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={`/abstract-geometric-shapes.png?height=32&width=32&query=${pick.team_code} NFL team logo`}
                          alt={pick.team_name || ""}
                          className="w-8 h-8 rounded"
                        />
                        <div>
                          <div className="font-semibold">{pick.team_name}</div>
                          <div className="text-sm text-muted-foreground">
                            vs {pick.picked_team_id === pick.home_team_id ? pick.away_team : pick.home_team}
                          </div>
                        </div>
                      </div>

                      {pick.kickoff_ts && (
                        <div className="text-sm text-muted-foreground">{formatGameTime(pick.kickoff_ts)}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {pick.status === "completed" && (
                        <Badge
                          variant="outline"
                          className={
                            pick.points_earned > 0
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }
                        >
                          {pick.points_earned > 0 ? `+${pick.points_earned} pts` : "0 pts"}
                        </Badge>
                      )}
                      {pick.status === "pending" && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
