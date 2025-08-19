"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { MemberManagement } from "./member-management"
import { LeagueSettings } from "./league-settings"
import { PointValuesManagement } from "./point-values-management"
import { LeagueStatistics } from "./league-statistics"
import { Settings, Users, DollarSign, BarChart3 } from "lucide-react"

interface LeagueManagementProps {
  leagueId: string
  userId: string
}

interface LeagueData {
  id: string
  name: string
  description: string
  visibility: string
  owner_id: string
  join_code: string
  rules_json: any
}

export function LeagueManagement({ leagueId, userId }: LeagueManagementProps) {
  const [league, setLeague] = useState<LeagueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [canEditPoints, setCanEditPoints] = useState(true)

  useEffect(() => {
    fetchLeagueData()
    checkPointsEditability()
  }, [leagueId])

  const fetchLeagueData = async () => {
    try {
      const { data, error } = await supabase.from("leagues").select("*").eq("id", leagueId).single()

      if (error) throw error
      setLeague(data)
    } catch (error) {
      console.error("Error fetching league data:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkPointsEditability = async () => {
    try {
      // Check if any Week 1 games are completed
      const { count, error } = await supabase
        .from("games")
        .select("*", { count: "exact", head: true })
        .eq("week", 1)
        .eq("status", "completed")

      if (error) throw error
      setCanEditPoints((count || 0) === 0)
    } catch (error) {
      console.error("Error checking points editability:", error)
      setCanEditPoints(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!league) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">League not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-serif text-foreground mb-2">League Management</h1>
        <p className="text-muted-foreground">Manage settings and members for "{league.name}"</p>
      </div>

      {/* Management Tabs */}
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardContent className="p-0">
          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="points" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Point Values
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Statistics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="p-6">
              <MemberManagement leagueId={leagueId} league={league} onLeagueUpdate={fetchLeagueData} />
            </TabsContent>

            <TabsContent value="settings" className="p-6">
              <LeagueSettings league={league} onLeagueUpdate={fetchLeagueData} />
            </TabsContent>

            <TabsContent value="points" className="p-6">
              <PointValuesManagement leagueId={leagueId} canEdit={canEditPoints} />
            </TabsContent>

            <TabsContent value="stats" className="p-6">
              <LeagueStatistics leagueId={leagueId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
