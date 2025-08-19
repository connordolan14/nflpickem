"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface NFLTeam {
  id: string
  nfl_team_code: string
  display_name: string
  points_value: number
}

interface TeamPointsCustomizerProps {
  teams: NFLTeam[]
  values: Record<string, number>
  onValueChange: (teamId: string, value: number) => void
}

export function TeamPointsCustomizer({ teams, values, onValueChange }: TeamPointsCustomizerProps) {
  const getValueColor = (value: number) => {
    if (value >= 25) return "bg-green-100 text-green-800 border-green-200"
    if (value >= 17) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const validateUnique = () => {
    const allValues = Object.values(values)
    const uniqueValues = new Set(allValues)
    return allValues.length === uniqueValues.size
  }

  const getDuplicateValues = () => {
    const valueCount: Record<number, string[]> = {}
    Object.entries(values).forEach(([teamId, value]) => {
      if (!valueCount[value]) valueCount[value] = []
      valueCount[value].push(teamId)
    })
    return Object.entries(valueCount).filter(([_, teamIds]) => teamIds.length > 1)
  }

  const duplicates = getDuplicateValues()
  const isValid = validateUnique()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Customize Team Point Values</h3>
          <p className="text-sm text-muted-foreground">
            Assign unique point values (1-32) to each NFL team. Higher values = more points when picked.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isValid ? "default" : "destructive"} className="text-xs">
            {isValid ? "All Unique" : "Duplicates Found"}
          </Badge>
        </div>
      </div>

      {!isValid && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive font-medium mb-2">Duplicate values found:</p>
          <div className="space-y-1">
            {duplicates.map(([value, teamIds]) => (
              <p key={value} className="text-xs text-destructive">
                Value {value}: {teamIds.map((id) => teams.find((t) => t.id === id)?.display_name).join(", ")}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {teams.map((team) => {
          const currentValue = values[team.id] || team.points_value
          const isDuplicate = duplicates.some(([_, teamIds]) => teamIds.includes(team.id))

          return (
            <div
              key={team.id}
              className={`p-3 rounded-lg border transition-all ${
                isDuplicate
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-border/50 bg-muted/20 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {team.nfl_team_code.substring(0, 2)}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{team.display_name}</span>
                </div>
                <Badge variant="outline" className={`text-xs ${getValueColor(currentValue)}`}>
                  {currentValue}
                </Badge>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`team-${team.id}`} className="text-xs text-muted-foreground">
                  Point Value
                </Label>
                <Input
                  id={`team-${team.id}`}
                  type="number"
                  min={1}
                  max={32}
                  value={currentValue}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value) || 1
                    onValueChange(team.id, Math.max(1, Math.min(32, value)))
                  }}
                  className={`text-sm h-8 ${isDuplicate ? "border-destructive/50 focus:border-destructive" : ""}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-green-200"></div>
            <span>High (25-32)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-yellow-200"></div>
            <span>Medium (17-24)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-red-200"></div>
            <span>Low (1-16)</span>
          </div>
        </div>
        <span>Total teams: {teams.length}</span>
      </div>
    </div>
  )
}
