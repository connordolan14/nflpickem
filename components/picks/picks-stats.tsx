"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Target, Award, Calendar } from "lucide-react"

interface StatsData {
  total_points: number
  total_wins: number
  total_losses: number
  win_percentage: number
  best_week: { week: number; points: number }
  worst_week: { week: number; points: number }
  byes_used: number
}

interface PicksStatsProps {
  stats: StatsData
}

export function PicksStats({ stats }: PicksStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-primary" />
            Total Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_points}</div>
          <p className="text-xs text-muted-foreground">
            {stats.total_wins}W - {stats.total_losses}L
          </p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Target className="h-4 w-4 mr-2 text-primary" />
            Win Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.win_percentage.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">{stats.total_wins + stats.total_losses} picks made</p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Award className="h-4 w-4 mr-2 text-primary" />
            Best Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.best_week.points} pts</div>
          <p className="text-xs text-muted-foreground">Week {stats.best_week.week}</p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            Byes Used
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.byes_used}/4</div>
          <p className="text-xs text-muted-foreground">{4 - stats.byes_used} remaining</p>
        </CardContent>
      </Card>
    </div>
  )
}
