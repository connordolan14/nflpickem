"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { DollarSign, Save, AlertTriangle, Loader2 } from "lucide-react"

interface PointValuesManagementProps {
  leagueId: string
  canEdit: boolean
}

interface TeamPointValue {
  team_id: string
  team_name: string
  nfl_team_code: string
  default_points: number
  custom_points: number | null
}

export function PointValuesManagement({ leagueId, canEdit }: PointValuesManagementProps) {
  const [teams, setTeams] = useState<TeamPointValue[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchTeamValues()
  }, [leagueId])

  const fetchTeamValues = async () => {
    try {
      // Fetch all teams with their default values
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, display_name, nfl_team_code, points_value")
        .order("display_name")

      if (teamsError) throw teamsError

      // Fetch custom values for this league
      const { data: customValues, error: customError } = await supabase
        .from("league_team_values")
        .select("team_id, points_value")
        .eq("league_id", leagueId)

      if (customError) throw customError

      // Combine data
      const customValuesMap = new Map(customValues?.map((cv) => [cv.team_id, cv.points_value]) || [])

      const teamValues: TeamPointValue[] =
        teamsData?.map((team) => ({
          team_id: team.id,
          team_name: team.display_name,
          nfl_team_code: team.nfl_team_code,
          default_points: team.points_value,
          custom_points: customValuesMap.get(team.id) || null,
        })) || []

      setTeams(teamValues)
    } catch (error) {
      console.error("Error fetching team values:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateCustomPoints = (teamId: string, points: number) => {
    if (!canEdit) return

    setTeams((prev) => prev.map((team) => (team.team_id === teamId ? { ...team, custom_points: points } : team)))
    setHasChanges(true)
  }

  const resetToDefaults = () => {
    if (!canEdit) return

    setTeams((prev) => prev.map((team) => ({ ...team, custom_points: null })))
    setHasChanges(true)
  }

  const validatePoints = () => {
    const customPoints = teams.filter((team) => team.custom_points !== null).map((team) => team.custom_points!)

    if (customPoints.length === 0) return true

    // Check for duplicates
    const uniquePoints = new Set(customPoints)
    if (uniquePoints.size !== customPoints.length) {
      setError("All custom point values must be unique.")
      return false
    }

    // Check range
    const invalidPoints = customPoints.filter((points) => points < 1 || points > 32)
    if (invalidPoints.length > 0) {
      setError("Point values must be between 1 and 32.")
      return false
    }

    return true
  }

  const saveChanges = async () => {
    if (!canEdit || !validatePoints()) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      // Delete existing custom values
      await supabase.from("league_team_values").delete().eq("league_id", leagueId)

      // Insert new custom values
      const customValues = teams
        .filter((team) => team.custom_points !== null)
        .map((team) => ({
          league_id: leagueId,
          team_id: team.team_id,
          points_value: team.custom_points!,
        }))

      if (customValues.length > 0) {
        const { error: insertError } = await supabase.from("league_team_values").insert(customValues)

        if (insertError) throw insertError
      }

      setSuccess("Point values updated successfully!")
      setHasChanges(false)
    } catch (error: any) {
      console.error("Error saving point values:", error)
      setError("Failed to save point values. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Warning */}
      {!canEdit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Point values cannot be modified after Week 1 games have started. This ensures fairness for all league
            members.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Team Point Values
          </CardTitle>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetToDefaults}>
                Reset to Defaults
              </Button>
              <Button size="sm" onClick={saveChanges} disabled={!hasChanges || saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {teams.map((team) => (
              <Card key={team.team_id} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={`/abstract-geometric-shapes.png?height=24&width=24&query=${team.nfl_team_code} NFL team logo`}
                      alt={team.team_name}
                      className="w-6 h-6 rounded"
                    />
                    <span className="text-sm font-medium truncate">{team.team_name}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Default:</span>
                      <Badge variant="outline">{team.default_points}</Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Custom:</span>
                      <Input
                        type="number"
                        min="1"
                        max="32"
                        value={team.custom_points || ""}
                        onChange={(e) => {
                          const value = e.target.value ? Number.parseInt(e.target.value) : null
                          if (value !== null) {
                            updateCustomPoints(team.team_id, value)
                          }
                        }}
                        placeholder={team.default_points.toString()}
                        className="h-7 text-xs"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/20 border border-border/50">
            <h4 className="font-semibold mb-2">Point Value Guidelines</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Higher values = more points for picking that team</li>
              <li>• All custom values must be unique (1-32)</li>
              <li>• Leave blank to use default values</li>
              <li>• Changes only allowed before Week 1 starts</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
