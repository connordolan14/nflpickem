"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { fetchCurrentSeasonId } from "@/lib/season"
import { Calendar, Target, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { GameCard } from "./game-card"
import { PicksSummary } from "./picks-summary"
import { ConfirmationModal } from "./confirmation-modal"

interface WeeklyPicksInterfaceProps {
  leagueId: string
  userId: string
}

interface GameData {
  id: string
  week: number
  home_team_id: string
  away_team_id: string
  home_team: string
  home_code: string
  away_team: string
  away_code: string
  home_points: number
  away_points: number
  kickoff_ts: string
  status: string
  winner_team_id: string | null
}

interface PickData {
  id: string
  game_id: string
  picked_team_id: string
  slot_number: number
  is_bye: boolean
}

interface UsedTeam {
  team_id: string
  week: number
}

export function WeeklyPicksInterface({ leagueId, userId }: WeeklyPicksInterfaceProps) {
  const [currentWeek, setCurrentWeek] = useState(1)
  const [games, setGames] = useState<GameData[]>([])
  const [picks, setPicks] = useState<PickData[]>([])
  const [usedTeams, setUsedTeams] = useState<UsedTeam[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [byesUsed, setByesUsed] = useState(0)
  const [usingBye, setUsingBye] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState("")
  const [showGames, setShowGames] = useState(true)
  const [seasonId, setSeasonId] = useState<number | null>(null)
  const [seasonYear, setSeasonYear] = useState<number | null>(null)
  const [seasonLoading, setSeasonLoading] = useState(true)

  const normalizeId = (v: any): string => (v == null ? "" : String(v))

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        let sid = seasonId
        let syear = seasonYear

        if (sid == null) {
          sid = await fetchCurrentSeasonId(supabase)
          if (!cancelled) setSeasonId(sid)
        }
        if (syear == null && sid != null) {
          const { data: srow } = await supabase.from('seasons').select('year').eq('id', sid).single()
          if (srow?.year && !cancelled) {
            syear = srow.year as number
            setSeasonYear(syear)
          }
        }

        // Fetch using the computed sid/syear to avoid state update race on first load
        if (sid != null) {
          await fetchWeekData({ seasonIdOverride: sid, seasonYearOverride: syear })
        }
      } catch (err) {
        console.error('Season init error', err)
        // Do not surface an error yet; page will retry when user changes week
      } finally {
        if (!cancelled) {
          setSeasonLoading(false)
          // Ensure we don't stay stuck on the loader if we couldn't fetch
          setLoading(false)
        }
      }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, userId, currentWeek])

  // Also react to seasonId/seasonYear being filled later to trigger a fetch without week change
  useEffect(() => {
    if (seasonId != null && !loading && !seasonLoading) {
      // fire and forget; effect above also handles
      fetchWeekData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId, seasonYear])

  const fetchWeekData = async (opts?: { seasonIdOverride?: number | null; seasonYearOverride?: number | null }) => {
    const sid = opts?.seasonIdOverride ?? seasonId
    const syear = opts?.seasonYearOverride ?? seasonYear
    if (sid == null) {
      // Season not ready yet; defer without raising error so first render isn't noisy
      return
    }
    setLoading(true)
    setError("")

    try {
      // Fetch games for the week
      let gamesQuery = supabase
        .from("games")
        .select(`
          *,
          home_team:teams!games_home_team_id_fkey(display_name, nfl_team_code, points_value),
          away_team:teams!games_away_team_id_fkey(display_name, nfl_team_code, points_value)
        `)
        .eq("week", currentWeek)
        .order("kickoff_ts")

      if (sid != null) {
        gamesQuery = gamesQuery.eq("season_id", sid)
      }

      // Exclude preseason: anything before Sep 1 of the season year (only if year known)
      if (syear != null) {
        const sep1 = new Date(Date.UTC(syear, 8, 1, 0, 0, 0)) // month is 0-indexed; 8 = Sep
        gamesQuery = gamesQuery.gte('kickoff_ts', sep1.toISOString())
      }

      const { data: gamesData, error: gamesError } = await gamesQuery

      if (gamesError) throw gamesError

  // Transform games data
      const transformedGames: GameData[] =
        gamesData?.map((game) => ({
          id: normalizeId(game.id),
          week: game.week,
          home_team_id: normalizeId(game.home_team_id),
          away_team_id: normalizeId(game.away_team_id),
          home_team: game.home_team.display_name,
          home_code: game.home_team.nfl_team_code,
          away_team: game.away_team.display_name,
          away_code: game.away_team.nfl_team_code,
          home_points: game.home_team.points_value,
          away_points: game.away_team.points_value,
          kickoff_ts: game.kickoff_ts,
          status: game.status,
          winner_team_id: game.winner_team_id != null ? normalizeId(game.winner_team_id) : null,
        })) || []

      setGames(transformedGames)

      // Fetch existing picks for this week
      let picksQuery = supabase
        .from("picks")
        .select("*")
        .eq("league_id", leagueId)
        .eq("user_id", userId)
        .eq("week", currentWeek)
      if (sid != null) {
        picksQuery = picksQuery.eq("season_id", sid)
      }
      const { data: picksData, error: picksError } = await picksQuery

      if (picksError) throw picksError

      setPicks(picksData || [])
      // Initialize selectedTeams with only UNLOCKED existing picks (editable)
      const lockedIds = new Set(
        transformedGames.filter((g) => new Date(g.kickoff_ts) < new Date()).map((g) => g.id),
      )
      const initialEditable = (picksData || [])
        .filter((p) => !p.is_bye && !lockedIds.has(normalizeId(p.game_id)))
        .map((p) => normalizeId(p.picked_team_id))
      setSelectedTeams(initialEditable)
      setUsingBye(picksData?.some((pick) => pick.is_bye) || false)

      // Fetch all used teams for the season
      let usedTeamsQuery = supabase
        .from("picks")
        .select("picked_team_id, week")
        .eq("league_id", leagueId)
        .eq("user_id", userId)
        .neq("week", currentWeek)
      if (sid != null) {
        usedTeamsQuery = usedTeamsQuery.eq("season_id", sid)
      }
      const { data: usedTeamsData, error: usedError } = await usedTeamsQuery

      if (usedError) throw usedError

      setUsedTeams(
        usedTeamsData?.map((pick) => ({
          team_id: normalizeId(pick.picked_team_id),
          week: pick.week,
        })) || [],
      )

      // Fetch byes used
      const { data: memberState, error: stateError } = await supabase
        .from("league_member_state")
        .select("byes_used")
        .eq("league_id", leagueId)
        .eq("user_id", userId)
        .single()

      if (stateError) throw stateError

      setByesUsed(memberState?.byes_used || 0)
    } catch (error: any) {
      console.error("Error fetching week data:", error)
      setError("Failed to load week data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleTeamSelect = (teamId: string, gameId: string) => {
    if (usingBye) return
    if (isTeamUsed(teamId) || isGameLocked(gameId)) return

  const slots = pickSlotsRemaining()
    if (slots <= 0) return

    setSelectedTeams((prev) => {
      if (prev.includes(teamId)) {
        // Deselect team
        return prev.filter((id) => id !== teamId)
      }
      if (prev.length < slots) {
        // Add if we still have free editable slots
        return [...prev, teamId]
      }
      // Replace the oldest editable selection but keep size <= slots
      if (slots === 1) return [teamId]
      const trimmed = prev.slice(prev.length - (slots - 1))
      return [...trimmed, teamId]
    })
  }

  const handleByeWeek = () => {
    if (byesUsed >= 4) return
  const capacity = editableCapacity()
    const alreadyBye = hasExistingByeThisWeek()
  // Can't enable bye if no capacity left or a bye already exists this week
  if (!usingBye && (capacity <= 0 || alreadyBye)) return

    setUsingBye(!usingBye)
    if (!usingBye) {
      setSelectedTeams([])
    }
  }

  const isTeamUsed = (teamId: string) => {
    return usedTeams.some((used) => used.team_id === teamId)
  }

  const isGameLocked = (gameId: string | number) => {
    const gid = normalizeId(gameId)
    const game = games.find((g) => g.id === gid)
    // If the game isn't in local cache, treat as locked to be safe
    if (!game) return true
    return new Date(game.kickoff_ts) < new Date()
  }

  const getUsedWeek = (teamId: string) => {
    return usedTeams.find((used) => used.team_id === teamId)?.week
  }

  const getLockedPicks = () => picks.filter((p) => !p.is_bye && isGameLocked(p.game_id))

  const hasExistingByeThisWeek = () => picks.some((p) => p.is_bye)

  const editableCapacity = () => {
    const lockedCount = getLockedPicks().length
    const existingBye = hasExistingByeThisWeek() ? 1 : 0
    return Math.max(0, 2 - lockedCount - existingBye)
  }

  const pickSlotsRemaining = () => {
    const capacity = editableCapacity()
    // Count available non-used team choices among unlocked games
    const availableTeams = new Set<string>()
    for (const g of games) {
      if (!isGameLocked(g.id)) {
        if (!isTeamUsed(g.home_team_id)) availableTeams.add(g.home_team_id)
        if (!isTeamUsed(g.away_team_id)) availableTeams.add(g.away_team_id)
      }
    }
    return Math.max(0, Math.min(capacity, availableTeams.size))
  }

  const canSubmit = () => {
  const capacity = editableCapacity()
  const slots = pickSlotsRemaining()
  const canAddBye = usingBye && !hasExistingByeThisWeek() && capacity > 0
  const canAddPicks = Math.min(selectedTeams.length, slots) > 0
    // Submit only if there is at least one change possible
    return canAddBye || canAddPicks
  }

  const handleSubmit = async () => {
    if (!canSubmit()) return

    setSubmitting(true)
    setError("")

    try {
      // Ensure we have a seasonId before proceeding
      let effectiveSeasonId = seasonId
      if (effectiveSeasonId == null) {
        effectiveSeasonId = await fetchCurrentSeasonId(supabase)
        setSeasonId(effectiveSeasonId)
      }

      // Determine locked vs unlocked picks for this week
      const lockedPicks = getLockedPicks()
      const existingBye = hasExistingByeThisWeek()
      const unlockedPickIds = picks
        .filter((p) => p.is_bye || !isGameLocked(p.game_id))
        .map((p) => p.id)

      // Delete only UNLOCKED picks (safe if empty)
      if (unlockedPickIds.length > 0) {
        await supabase
          .from("picks")
          .delete()
          .in("id", unlockedPickIds)
          .eq("league_id", leagueId)
          .eq("user_id", userId)
          .eq("week", currentWeek)
          .eq("season_id", effectiveSeasonId)
      }

      // How many slots are free after preserving locked picks and any existing bye
      let slots = Math.max(0, 2 - lockedPicks.length - (existingBye ? 1 : 0))

      // If user toggled bye ON and there is capacity and no existing bye, insert one
      if (usingBye && !existingBye && slots > 0) {
        const { error: byeError } = await supabase.from("picks").insert({
          league_id: Number(leagueId),
          user_id: userId,
          season_id: effectiveSeasonId,
          week: currentWeek,
          game_id: null,
          picked_team_id: null,
          slot_number: null,
          is_bye: true,
          source: "auto_bye",
        })
        if (byeError) {
          console.error("Bye insert failed:", byeError)
          setError(
            byeError.message?.includes("null")
              ? "Database is blocking BYE rows (game_id/picked_team_id NOT NULL). Apply the provided migration to allow byes."
              : `Failed to use bye: ${byeError.message || "Unknown error"}`,
          )
          throw byeError
        }

        // increment byes_used only when adding a new bye
        const { error: stateError } = await supabase
          .from("league_member_state")
          .update({ byes_used: byesUsed + 1 })
          .eq("league_id", leagueId)
          .eq("user_id", userId)
        if (stateError) throw stateError

        slots -= 1
      }

      // Insert team picks for remaining open slots, skipping teams already locked-in this week
      if (slots > 0 && selectedTeams.length > 0) {
    const lockedTeamIds = new Set(lockedPicks.map((p) => normalizeId(p.picked_team_id)))
        const teamsToInsert = selectedTeams
          .filter((tid) => !lockedTeamIds.has(tid))
          .filter((tid) => {
      const game = games.find((g) => g.home_team_id === tid || g.away_team_id === tid)
            return game && !isGameLocked(game.id)
          })
          .slice(0, slots)

        // Respect existing locked slot numbers when assigning new ones
        const usedSlotNums = new Set<number>(
          lockedPicks.map((p) => (typeof p.slot_number === 'number' ? p.slot_number : null)).filter(Boolean) as number[],
        )
        const nextSlot = () => {
          for (const s of [1, 2]) {
            if (!usedSlotNums.has(s)) {
              usedSlotNums.add(s)
              return s
            }
          }
          return null
        }

        const pickInserts = teamsToInsert.map((teamId) => {
          const game = games.find((g) => g.home_team_id === teamId || g.away_team_id === teamId)
          const slotNum = nextSlot()
          return {
            league_id: Number(leagueId),
            user_id: userId,
            season_id: effectiveSeasonId,
            week: currentWeek,
            game_id: game?.id != null ? Number(game.id) : null,
            picked_team_id: Number(teamId),
            slot_number: slotNum,
            is_bye: false,
          }
        }).filter((row) => row.slot_number != null)

        if (pickInserts.length > 0) {
          const { error: picksError } = await supabase.from("picks").insert(pickInserts)
          if (picksError) throw picksError
        }
      }

      // If there was an existing bye and the user turned bye OFF this submission, decrement byes_used
      if (existingBye && !usingBye) {
        const newByes = Math.max(0, byesUsed - 1)
        const { error: decError } = await supabase
          .from("league_member_state")
          .update({ byes_used: newByes })
          .eq("league_id", leagueId)
          .eq("user_id", userId)
        if (decError) throw decError
      }

      // Refresh data
      await fetchWeekData()
      setShowConfirmation(false)
    } catch (error: any) {
      console.error("Error submitting picks:", error)
      setError("Failed to submit picks. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading picks interface...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground">Make Your Picks</h1>
          <p className="text-muted-foreground">Select 2 teams for Week {currentWeek} or use a bye week</p>
        </div>
        <Select value={currentWeek.toString()} onValueChange={(value) => setCurrentWeek(Number.parseInt(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
              <SelectItem key={week} value={week.toString()}>
                Week {week}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Games */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="backdrop-blur-sm bg-card/80 border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary" />
                  Week {currentWeek} Games
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowGames(!showGames)}>
                  {showGames ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {showGames && (
              <CardContent className="space-y-3">
                {games.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No games available for Week {currentWeek}</p>
                ) : (
                  games.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      selectedTeams={selectedTeams}
                      usedTeams={usedTeams}
                      onTeamSelect={handleTeamSelect}
                      disabled={usingBye}
                    />
                  ))
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right Column - Picks Summary */}
        <div className="space-y-4">
          <PicksSummary
            selectedTeams={selectedTeams}
            games={games}
            usingBye={usingBye}
            byesUsed={byesUsed}
            onByeWeek={handleByeWeek}
            currentWeek={currentWeek}
            lockedPicks={(picks || [])
              .filter((p) => !p.is_bye && isGameLocked(p.game_id))
              .map((p) => {
                const g = games.find(
                  (gm) => gm.home_team_id === normalizeId(p.picked_team_id) || gm.away_team_id === normalizeId(p.picked_team_id),
                )
                const isHome = g?.home_team_id === normalizeId(p.picked_team_id)
                return {
                  team_id: normalizeId(p.picked_team_id),
                  name: isHome ? g?.home_team || "Team" : g?.away_team || "Team",
                  code: isHome ? g?.home_code || "" : g?.away_code || "",
                  points: isHome ? g?.home_points || 0 : g?.away_points || 0,
                }
              })}
            remainingSlots={pickSlotsRemaining()}
          />

      {pickSlotsRemaining() === 0 && !hasExistingByeThisWeek() && (
            <Alert>
              <AlertDescription>
        All games for Week {currentWeek} have started or finished. You can no longer make team picks this week.
        If you still have bye weeks remaining, you can use one instead.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={!canSubmit() || submitting || seasonLoading}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Submit Picks
              </>
            )}
          </Button>
        </div>
      </div>

      <ConfirmationModal
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        selectedTeams={selectedTeams}
        games={games}
        usingBye={usingBye}
        currentWeek={currentWeek}
        onConfirm={handleSubmit}
  loading={submitting || seasonLoading}
      />
    </div>
  )
}
