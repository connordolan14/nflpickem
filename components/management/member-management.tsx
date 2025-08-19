"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Users, UserMinus, Crown, Copy, RefreshCw, AlertTriangle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface MemberManagementProps {
  leagueId: string
  league: any
  onLeagueUpdate: () => void
}

interface MemberData {
  user_id: string
  role: string
  created_at: string
  profiles: {
    display_name: string
    avatar_url: string | null
  }
}

export function MemberManagement({ leagueId, league, onLeagueUpdate }: MemberManagementProps) {
  const [members, setMembers] = useState<MemberData[]>([])
  const [loading, setLoading] = useState(true)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [newJoinCode, setNewJoinCode] = useState("")
  const [generatingCode, setGeneratingCode] = useState(false)

  useEffect(() => {
    fetchMembers()
  }, [leagueId])

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("league_members")
        .select(`
          user_id,
          role,
          created_at,
          profiles!inner(display_name, avatar_url)
        `)
        .eq("league_id", leagueId)
        .order("created_at")

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error("Error fetching members:", error)
    } finally {
      setLoading(false)
    }
  }

  const removeMember = async (userId: string) => {
    if (userId === league.owner_id) return // Can't remove owner

    setRemovingMember(userId)
    try {
      // Remove from league_members
      const { error: memberError } = await supabase
        .from("league_members")
        .delete()
        .eq("league_id", leagueId)
        .eq("user_id", userId)

      if (memberError) throw memberError

      // Remove from league_member_state
      const { error: stateError } = await supabase
        .from("league_member_state")
        .delete()
        .eq("league_id", leagueId)
        .eq("user_id", userId)

      if (stateError) throw stateError

      // Remove picks (optional - you might want to keep for historical data)
      const { error: picksError } = await supabase
        .from("picks")
        .delete()
        .eq("league_id", leagueId)
        .eq("user_id", userId)

      if (picksError) throw picksError

      await fetchMembers()
    } catch (error) {
      console.error("Error removing member:", error)
    } finally {
      setRemovingMember(null)
    }
  }

  const transferOwnership = async (newOwnerId: string) => {
    try {
      const { error } = await supabase.from("leagues").update({ owner_id: newOwnerId }).eq("id", leagueId)

      if (error) throw error

      // Update roles
      await supabase
        .from("league_members")
        .update({ role: "member" })
        .eq("league_id", leagueId)
        .eq("user_id", league.owner_id)

      await supabase
        .from("league_members")
        .update({ role: "admin" })
        .eq("league_id", leagueId)
        .eq("user_id", newOwnerId)

      onLeagueUpdate()
      await fetchMembers()
    } catch (error) {
      console.error("Error transferring ownership:", error)
    }
  }

  const generateNewJoinCode = async () => {
    setGeneratingCode(true)
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const { error } = await supabase.from("leagues").update({ join_code: newCode }).eq("id", leagueId)

      if (error) throw error

      setNewJoinCode(newCode)
      onLeagueUpdate()
    } catch (error) {
      console.error("Error generating new join code:", error)
    } finally {
      setGeneratingCode(false)
    }
  }

  const copyJoinCode = () => {
    navigator.clipboard.writeText(league.join_code)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Join Code Management */}
      {league.visibility === "private" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Join Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="joinCode">Current Join Code:</Label>
              <div className="flex items-center gap-2">
                <Input id="joinCode" value={league.join_code} readOnly className="font-mono text-center w-24" />
                <Button variant="outline" size="sm" onClick={copyJoinCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={generateNewJoinCode} disabled={generatingCode}>
                {generatingCode ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Generate New Code
              </Button>
              {newJoinCode && (
                <Alert className="flex-1">
                  <AlertDescription>
                    New join code generated: <strong>{newJoinCode}</strong>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            League Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {member.profiles.avatar_url ? (
                      <img
                        src={member.profiles.avatar_url || "/placeholder.svg"}
                        alt={member.profiles.display_name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-semibold">
                        {member.profiles.display_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{member.profiles.display_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={member.user_id === league.owner_id ? "default" : "secondary"}>
                    {member.user_id === league.owner_id ? "Owner" : member.role}
                  </Badge>

                  {member.user_id === league.owner_id ? (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Crown className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to transfer ownership of this league to{" "}
                              <strong>{member.profiles.display_name}</strong>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => transferOwnership(member.user_id)}>
                              Transfer Ownership
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={removingMember === member.user_id}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove <strong>{member.profiles.display_name}</strong> from this
                              league? This will delete all their picks and scores.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMember(member.user_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove Member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Warning:</strong> Removing members will permanently delete their picks and scores. Transferring
          ownership cannot be undone.
        </AlertDescription>
      </Alert>
    </div>
  )
}
