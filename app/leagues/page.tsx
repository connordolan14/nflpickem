"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { useAuth } from "@/lib/auth"
import { supabase, type League } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Users, Search, Calendar, ArrowRight, Loader2, Lock, Globe2, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type LeagueRow = League & {
  description: string | null
  league_members?: { count: number }[]
}

interface Season {
  id: number
  year: number
  is_active: boolean
}

export default function LeaguesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  // UI state
  const [tab, setTab] = useState<"all" | "mine">("all")
  const [q, setQ] = useState("")
  const [seasonId, setSeasonId] = useState<number | "all">("all")
  const [sort, setSort] = useState<"popular" | "newest" | "name">("popular")
  const [page, setPage] = useState(0)

  // Data state
  const [seasons, setSeasons] = useState<Season[]>([])
  const [leagues, setLeagues] = useState<LeagueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [joiningId, setJoiningId] = useState<string | null>(null)
  // Private join by code
  const [joinCode, setJoinCode] = useState("")
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState("")
  const [joinOpen, setJoinOpen] = useState(false)

  const pageSize = 9

  // Derived
  const activeSeason = useMemo(() => seasons.find((s) => s.is_active), [seasons])

  useEffect(() => {
    let cancelled = false
    async function loadSeasons() {
      try {
        const { data, error } = await supabase
          .from("seasons")
          .select("id, year, is_active")
          .order("year", { ascending: false })
        if (error) throw error
        if (cancelled) return
        setSeasons(data || [])
        if (data && data.length && activeSeason == null) {
          const active = data.find((s) => s.is_active)
          if (active) setSeasonId(active.id)
        }
      } catch (e) {
        console.error("Failed to load seasons", e)
      }
    }
    loadSeasons()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadLeagues() {
      setLoading(true)
      setError("")
      try {
        if (tab === "mine") {
          if (!user) {
            setLeagues([])
            setLoading(false)
            return
          }
          // My leagues via membership
          let query = supabase
            .from("league_members")
            .select(
              `
              leagues!inner(*, league_members(count))
            `
            )
            .eq("user_id", user.id)

          if (seasonId !== "all") query = query.eq("leagues.season_id", seasonId)
          if (q.trim()) query = query.ilike("leagues.name", `%${q.trim()}%`)

          const from = page * pageSize
          const to = from + pageSize - 1
          query = query.range(from, to)

          const { data, error } = await query
          if (error) throw error
          if (cancelled) return
          const rows: LeagueRow[] =
            data?.map((r: any) => ({
              ...(r.leagues as LeagueRow),
            })) || []
          setLeagues(sortLeagues(rows, sort))
        } else {
          // All = public discovery
          let query = supabase
            .from("leagues")
            .select(
              `
              *,
              league_members(count)
            `
            )
            .eq("visibility", "public")

          if (seasonId !== "all") query = query.eq("season_id", seasonId)
          if (q.trim()) query = query.ilike("name", `%${q.trim()}%`)

          const from = page * pageSize
          const to = from + pageSize - 1
          query = query.range(from, to)

          const { data, error } = await query
          if (error) throw error
          if (cancelled) return
          setLeagues(sortLeagues((data as LeagueRow[]) || [], sort))
        }
      } catch (e: any) {
        console.error("Failed to load leagues", e)
        if (!cancelled) setError("Failed to load leagues. Please try again.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadLeagues()
    return () => {
      cancelled = true
    }
  }, [tab, q, seasonId, sort, page, user])

  const sortLeagues = (rows: LeagueRow[], how: typeof sort) => {
    const withCount = rows.map((l) => ({
      ...l,
      _member_count: l.league_members?.[0]?.count || 0,
    }))
    if (how === "name") return withCount.sort((a, b) => a.name.localeCompare(b.name))
    if (how === "newest") return withCount.sort((a, b) => (b as any).created_at?.localeCompare?.((a as any).created_at) || 0)
    // popular
    return withCount.sort((a, b) => (b as any)._member_count - (a as any)._member_count)
  }

  const handleJoin = async (league: LeagueRow) => {
    if (!user) {
      router.push("/auth")
      return
    }
    setJoiningId(league.id)
    setError("")
    try {
      // If already a member, just go
      const { data: existing } = await supabase
        .from("league_members")
        .select("id")
        .eq("league_id", league.id)
        .eq("user_id", user.id)
        .maybeSingle?.() ?? { data: null }

      if (existing) {
        router.push(`/leagues/${league.id}`)
        return
      }

      // Public leagues: join directly
      if (league.visibility === "public") {
        const { error: memberError } = await supabase.from("league_members").insert({
          league_id: league.id,
          user_id: user.id,
          role: "member",
        })
        if (memberError) throw memberError

        const { error: stateError } = await supabase.from("league_member_state").insert({
          league_id: league.id,
          user_id: user.id,
          byes_used: 0,
        })
        if (stateError) throw stateError

        router.push(`/leagues/${league.id}`)
        return
      }

      // Private leagues: send to code page
      router.push("/leagues/join")
    } catch (e: any) {
      console.error("Join failed", e)
      setError("Failed to join league. Please try again.")
    } finally {
      setJoiningId(null)
    }
  }

  const resetPaging = () => setPage(0)

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      router.push("/auth")
      return
    }
    if (!joinCode.trim() || joinCode.trim().length !== 6) return
    setCodeLoading(true)
    setCodeError("")
    try {
      const code = joinCode.trim().toUpperCase()
      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .select("id, name, visibility")
        .eq("join_code", code)
        .single()

      if (leagueError || !league) {
        setCodeError("Invalid join code. Please check and try again.")
        return
      }

      const { data: existing } = await supabase
        .from("league_members")
        .select("id")
        .eq("league_id", league.id)
        .eq("user_id", user.id)
        .maybeSingle?.() ?? { data: null }

      if (existing) {
        router.push(`/leagues/${league.id}`)
        return
      }

      const { error: memberError } = await supabase.from("league_members").insert({
        league_id: league.id,
        user_id: user.id,
        role: "member",
      })
      if (memberError) throw memberError

      const { error: stateError } = await supabase.from("league_member_state").insert({
        league_id: league.id,
        user_id: user.id,
        byes_used: 0,
      })
      if (stateError) throw stateError

      router.push(`/leagues/${league.id}`)
    } catch (err: any) {
      console.error("Join by code failed", err)
      setCodeError("Failed to join league. Please try again.")
    } finally {
      setCodeLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <section className="mb-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-2">Explore Leagues</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join public communities or manage your private competitions. Search, filter, and jump into the action.
            </p>
          </div>
        </section>

        {/* Controls */}
        <Card className="backdrop-blur-sm bg-card/80 border-border/50 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
              <div className="flex-1 flex items-center gap-2">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leagues by name"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value)
                      resetPaging()
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select
                  value={String(seasonId)}
                  onValueChange={(v) => {
                    setSeasonId(v === "all" ? "all" : Number(v))
                    resetPaging()
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All seasons</SelectItem>
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.year} {s.is_active ? "(active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="name">Name A–Z</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => setJoinOpen(true)}>
                  <Lock className="h-4 w-4 mr-2" /> Join by Code
                </Button>

                <Button asChild>
                  <Link href="/leagues/create">
                    <Plus className="h-4 w-4 mr-2" /> Create League
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <Tabs value={tab} onValueChange={(v: any) => { setTab(v); resetPaging() }}>
                <TabsList>
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/30"
                  >
                    All Leagues
                  </TabsTrigger>
                  <TabsTrigger
                    value="mine"
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/30"
                  >
                    My Leagues
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Main content (full width after moving Join by Code to modal) */}
        <div>
          <div>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Results */}
            <section>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: pageSize }).map((_, i) => (
                    <Card key={i} className="h-40 animate-pulse bg-muted/30 border-border/50" />
                  ))}
                </div>
              ) : leagues.length === 0 ? (
                <Card className="backdrop-blur-sm bg-card/80 border-border/50">
                  <CardHeader>
                    <CardTitle>No leagues found</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Try adjusting your filters or create a new league to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map((league) => (
                    <LeagueCard
                      key={league.id}
                      league={league}
            onJoin={() => handleJoin(league)}
            openJoinModal={() => setJoinOpen(true)}
                      joining={joiningId === league.id}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!loading && leagues.length > 0 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {page + 1}</span>
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Join by Code Modal */}
        <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
          <DialogContent className="backdrop-blur-sm bg-card/95 border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center"><Lock className="h-5 w-5 mr-2 text-primary" /> Join a Private League</DialogTitle>
              <DialogDescription>Enter the 6-character code you received from a league owner.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                await handleJoinByCode(e)
                // If no error, close modal
                // Simple heuristic: close when not loading and no codeError after a tick
                setTimeout(() => {
                  if (!codeError) setJoinOpen(false)
                }, 50)
              }}
              className="space-y-3"
            >
              <Label htmlFor="joinCodeModal">Private code</Label>
              <Input
                id="joinCodeModal"
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="bg-input/50 backdrop-blur-sm font-mono tracking-wider text-center"
              />
              {codeError && (
                <Alert variant="destructive">
                  <AlertDescription>{codeError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button type="submit" disabled={codeLoading || joinCode.length !== 6}>
                  {codeLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining...</>) : "Join"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  )
}

function LeagueCard({
  league,
  onJoin,
  openJoinModal,
  joining,
}: {
  league: LeagueRow
  onJoin: () => void
  openJoinModal: () => void
  joining: boolean
}) {
  const memberCount = league.league_members?.[0]?.count || 0
  const isPublic = league.visibility === "public"
  return (
    <Card className="backdrop-blur-sm bg-card/80 border-border/50 hover:bg-card/90 transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            {league.name}
          </CardTitle>
          <Badge variant={isPublic ? "secondary" : "outline"} className={isPublic ? "bg-primary/10 text-primary border-primary/20" : ""}>
            {isPublic ? (
              <span className="inline-flex items-center"><Globe2 className="h-3.5 w-3.5 mr-1" /> Public</span>
            ) : (
              <span className="inline-flex items-center"><Lock className="h-3.5 w-3.5 mr-1" /> Private</span>
            )}
          </Badge>
        </div>
        {league.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{league.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
          <div className="flex items-center"><Users className="h-4 w-4 mr-1" /> {memberCount} members</div>
          <div className="flex items-center"><Calendar className="h-4 w-4 mr-1" /> Season {String((league as any).season_id)}</div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1 bg-transparent">
            <Link href={`/leagues/${league.id}`}>
              View <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {isPublic ? (
            <Button onClick={onJoin} disabled={joining} className="flex-1">
              {joining ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining...</> : "Join"}
            </Button>
          ) : (
            <Button onClick={openJoinModal} className="flex-1">
              Enter Code
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
