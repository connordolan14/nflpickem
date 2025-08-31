"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { Settings, Save, Loader2 } from "lucide-react"

interface LeagueSettingsProps {
  league: any
  onLeagueUpdate: () => void
}

export function LeagueSettings({ league, onLeagueUpdate }: LeagueSettingsProps) {
  const [formData, setFormData] = useState({
    name: league.name || "",
    description: league.description || "",
    visibility: league.visibility === "public",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const { error: updateError } = await supabase
        .from("leagues")
        .update({
          name: formData.name,
          description: formData.description,
          visibility: formData.visibility ? "public" : "private",
        })
        .eq("id", league.id)
        .eq("owner_id", league.owner_id) // Security check

      if (updateError) throw updateError

      setSuccess("League settings updated successfully!")
      onLeagueUpdate()
    } catch (error: any) {
      console.error("Error updating league settings:", error)
      setError("Failed to update league settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            League Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">League Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter league name"
                maxLength={50}
                required
              />
              <p className="text-xs text-muted-foreground">{formData.name.length}/50 characters</p>
            </div>

      

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="visibility">Public League</Label>
                <p className="text-sm text-muted-foreground">Allow anyone to find and join this league</p>
              </div>
              <Switch
                id="visibility"
                checked={formData.visibility}
                onCheckedChange={(checked) => setFormData({ ...formData, visibility: checked })}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
            <h4 className="font-semibold mb-2">League Rules</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Pick 2 teams per week</li>
              <li>• Each team can only be picked once per season</li>
              <li>• Maximum 4 bye weeks allowed</li>
              <li>• Picks lock at game kickoff time</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
            <h4 className="font-semibold mb-2">Scoring System</h4>
            <p className="text-sm text-muted-foreground">
              Points are awarded based on team values (1-32 points). Custom point values can be set before Week 1
              begins.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
