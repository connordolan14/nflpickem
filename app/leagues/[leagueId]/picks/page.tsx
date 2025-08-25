"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, use as unwrap } from "react"
import { WeeklyPicksInterface } from "@/components/picks/weekly-picks-interface"
import { Header } from "@/components/layout/header"

interface PicksPageProps {
  // In latest Next.js, params may be delivered as a Promise to client components
  params: { leagueId: string } | Promise<{ leagueId: string }>
}

export default function PicksPage({ params }: PicksPageProps) {
  // Unwrap params if it's a promise (forward compatible) – React.use() experimental alias imported as unwrap
  // @ts-ignore – unwrap handles both object and promise at runtime
  const { leagueId } = typeof (params as any).then === 'function' ? unwrap(params as Promise<{leagueId:string}>) : (params as {leagueId:string})
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading picks...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
      <Header />
      <main className="container mx-auto px-4 py-8">
  <WeeklyPicksInterface leagueId={leagueId} userId={user.id} />
      </main>
    </div>
  )
}
