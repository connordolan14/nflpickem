"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { fetchCurrentSeasonId } from "@/lib/season"
import { Loader2, Users, Lock, Globe, Settings } from "lucide-react"
import { TeamPointsCustomizer } from "./team-points-customizer"

interface LeagueCreationFormProps {
  userId: string
}

interface NFLTeam {
  id: string
  nfl_team_code: string
  display_name: string
  points_value: number
}

export function LeagueCreationForm({ userId }: LeagueCreationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<NFLTeam[]>([])
  const [error, setError] = useState("")
  const [step, setStep] = useState(1)
  const [seasonId, setSeasonId] = useState<number | null>(null)
  const [seasonLoading, setSeasonLoading] = useState(true)
  const [seasonError, setSeasonError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    visibility: "private" as "public" | "private",
    useCustomPoints: false,
    customTeamValues: {} as Record<string, number>,
  })

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const [teamsRes, season] = await Promise.all([
          supabase
            .from("teams")
            .select("id, nfl_team_code, display_name, points_value")
            .order("display_name"),
          fetchCurrentSeasonId(supabase),
        ])

        if (cancelled) return
        if (teamsRes.error) throw teamsRes.error
        const data = teamsRes.data || []
        setTeams(data)
        const defaultValues: Record<string, number> = {}
        data.forEach((team) => {
          defaultValues[team.id] = team.points_value
        })
        setFormData((prev) => ({ ...prev, customTeamValues: defaultValues }))
        setSeasonId(season)
      } catch (err: any) {
        if (cancelled) return
        console.error("Initialization error:", err)
        setSeasonError(err.message || "Failed to resolve current season")
        setError((prev) => prev || "Failed to load NFL teams. Please try again.")
      } finally {
        if (!cancelled) setSeasonLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("League name is required")
      return false
    }
    if (formData.name.length > 50) {
      setError("League name must be 50 characters or less")
      return false
    }

    if (formData.useCustomPoints) {
      const values = Object.values(formData.customTeamValues)
      const uniqueValues = new Set(values)
      if (values.length !== uniqueValues.size) {
        setError("All team point values must be unique")
        return false
      }
      if (values.some((v) => v < 1 || v > 32)) {
        setError("Team point values must be between 1 and 32")
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError("")

    try {
      // Create league
      if (seasonLoading) {
        setError("Season still loading. Please wait.")
        return
      }
      if (seasonId == null) {
        setError(seasonError || "Season unavailable; cannot create league.")
        return
      }

      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          visibility: formData.visibility,
          owner_id: userId,
          season_id: seasonId,
          join_code: formData.visibility === "private" ? generateJoinCode() : null,
          rules_json: {
            picks_per_week: 2,
            max_byes: 4,
            use_custom_points: formData.useCustomPoints,
          },
        })
        .select()
        .single()

      if (leagueError) throw leagueError

      // Add creator as admin member
      const { error: memberError } = await supabase.from("league_members").insert({
        league_id: league.id,
        user_id: userId,
        role: "admin",
      })

      if (memberError) throw memberError

      // Initialize member state
      const { error: stateError } = await supabase.from("league_member_state").insert({
        league_id: league.id,
        user_id: userId,
        byes_used: 0,
      })

      if (stateError) throw stateError

      // Insert custom team values if specified
      if (formData.useCustomPoints) {
        const teamValueInserts = Object.entries(formData.customTeamValues).map(([teamId, pointsValue]) => ({
          league_id: league.id,
          team_id: teamId,
          points_value: pointsValue,
        }))

        const { error: valuesError } = await supabase.from("league_team_values").insert(teamValueInserts)

        if (valuesError) throw valuesError
      }

      // Redirect to league page
      router.push(`/leagues/${league.id}`)
    } catch (error: any) {
      console.error("Error creating league:", error)
      setError(error.message || "Failed to create league. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const updateCustomTeamValue = (teamId: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      customTeamValues: {
        ...prev.customTeamValues,
        [teamId]: value,
      },
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {seasonLoading && (
        <Alert>
          <AlertDescription>Loading current season...</AlertDescription>
        </Alert>
      )}
      {!seasonLoading && seasonId == null && (
        <Alert variant="destructive">
          <AlertDescription>{seasonError || "Unable to determine current season."}</AlertDescription>
        </Alert>
      )}
      {/* Step 1: Basic Information */}
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">League Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter league name"
              maxLength={50}
              className="bg-input/50 backdrop-blur-sm"
              required
            />
            <p className="text-xs text-muted-foreground">{formData.name.length}/50 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your league..."
              className="bg-input/50 backdrop-blur-sm"
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>League Visibility</Label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="visibility"
                  checked={formData.visibility === "public"}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, visibility: checked ? "public" : "private" }))
                  }
                />
                <Label htmlFor="visibility" className="flex items-center">
                  {formData.visibility === "public" ? (
                    <>
                      <Globe className="h-4 w-4 mr-1 text-primary" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-1 text-accent" />
                      Private
                    </>
                  )}
                </Label>
              </div>
              <Badge variant="outline" className="text-xs">
                {formData.visibility === "public" ? "Anyone can join" : "Invite only"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Team Point Values */}
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2 text-primary" />
            Team Point Values
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={formData.useCustomPoints ? "custom" : "default"}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, useCustomPoints: value === "custom" }))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="default" id="default" />
              <Label htmlFor="default">Use default NFL team values</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom">Customize point values for this league</Label>
            </div>
          </RadioGroup>

          {formData.useCustomPoints && (
            <div className="mt-6">
              <TeamPointsCustomizer
                teams={teams}
                values={formData.customTeamValues}
                onValueChange={updateCustomTeamValue}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating League...
            </>
          ) : (
            "Create League"
          )}
        </Button>
      </div>
    </form>
  )
}
