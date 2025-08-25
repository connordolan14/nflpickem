"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/layout/header"
import { Users, Search, Loader2 } from "lucide-react"

export default function JoinLeaguePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !joinCode.trim()) return

    setLoading(true)
    setError("")

    try {
      // Find league by join code
      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .select("id, name, visibility").eq("join_code", joinCode.trim().toUpperCase()).single()

      if (leagueError || !league) {
        setError("Invalid join code. Please check and try again.")
        return
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from("league_members")
        .select("id")
        .eq("league_id", league.id)
        .eq("user_id", user.id)
        .single()

      if (existingMember) {
        setError("You are already a member of this league.")
        return
      }

      // Add user to league
      const { error: memberError } = await supabase.from("league_members").insert({
        league_id: league.id,
        user_id: user.id,
        role: "member",
      })

      if (memberError) throw memberError

      // Initialize member state
      const { error: stateError } = await supabase.from("league_member_state").insert({
        league_id: league.id,
        user_id: user.id,
        byes_used: 0,
      })

      if (stateError) throw stateError

      // Redirect to league
      router.push(`/leagues/${league.id}`)
    } catch (error: any) {
      console.error("Error joining league:", error)
      setError("Failed to join league. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push("/auth")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold font-serif text-foreground mb-2">Join a League</h1>
            <p className="text-muted-foreground">
              Enter a join code to join a private league or browse public leagues.
            </p>
          </div>

          <div className="space-y-6">
            {/* Join by Code */}
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  Join with Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoinByCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="joinCode">League Join Code</Label>
                    <Input
                      id="joinCode"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Enter 6-character code"
                      maxLength={6}
                      className="bg-input/50 backdrop-blur-sm text-center text-lg font-mono tracking-wider"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ask the league creator for the 6-character join code
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={loading || joinCode.length !== 6} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining League...
                      </>
                    ) : (
                      "Join League"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Browse Public Leagues */}
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2 text-primary" />
                  Browse Public Leagues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Discover and join public leagues that anyone can participate in.
                </p>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <a href="/leagues">Browse All Leagues</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
