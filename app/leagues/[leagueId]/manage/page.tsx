"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState, use as unwrap } from "react"
import { LeagueManagement } from "@/components/management/league-management"
import { Header } from "@/components/layout/header"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

interface ManagePageProps { params: { leagueId: string } | Promise<{ leagueId: string }> }

export default function ManagePage({ params }: ManagePageProps) {
  // @ts-ignore unwrap if promise
  const { leagueId } = typeof (params as any).then === 'function' ? unwrap(params as Promise<{leagueId:string}>) : (params as {leagueId:string})
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth")
      return
    }

    if (user) {
      checkAuthorization()
    }
  }, [user, authLoading, router, leagueId])

  const checkAuthorization = async () => {
    try {
      // Check if user is league owner
      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("owner_id")
  .eq("id", leagueId)
        .single()

      if (leagueError) throw leagueError

      if (leagueData.owner_id === user?.id) {
        setIsAuthorized(true)
        setLoading(false)
        return
      }

      // Check if user has admin role
      const { data: memberData, error: memberError } = await supabase
        .from("league_members")
        .select("role")
  .eq("league_id", leagueId)
        .eq("user_id", user?.id)
        .single()

      if (memberError) throw memberError

      setIsAuthorized(memberData.role === "admin")
    } catch (error) {
      console.error("Error checking authorization:", error)
      setIsAuthorized(false)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Checking permissions...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You don't have permission to manage this league. Only league owners and administrators can access this
                page.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
      <Header />
      <main className="container mx-auto px-4 py-8">
  <LeagueManagement leagueId={leagueId} userId={user.id} />
      </main>
    </div>
  )
}
