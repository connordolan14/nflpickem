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
  const [seasonLoading, setSeasonLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        if (seasonId == null) {
          const s = await fetchCurrentSeasonId(supabase)
          if (!cancelled) setSeasonId(s)
        }
        await fetchWeekData()
      } catch (err) {
        console.error('Season init error', err)
      } finally {
        if (!cancelled) setSeasonLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, userId, currentWeek])

  const fetchWeekData = async () => {
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

      if (seasonId != null) {
        gamesQuery = gamesQuery.eq("season_id", seasonId)
      }

      const { data: gamesData, error: gamesError } = await gamesQuery

      if (gamesError) throw gamesError

      // Transform games data
      const transformedGames: GameData[] =
        gamesData?.map((game) => ({
          id: game.id,
          week: game.week,
          home_team_id: game.home_team_id,
          away_team_id: game.away_team_id,
          home_team: game.home_team.display_name,
          home_code: game.home_team.nfl_team_code,
          away_team: game.away_team.display_name,
          away_code: game.away_team.nfl_team_code,
          home_points: game.home_team.points_value,
          away_points: game.away_team.points_value,
          kickoff_ts: game.kickoff_ts,
          status: game.status,
          winner_team_id: game.winner_team_id,
        })) || []

      setGames(transformedGames)

      // Fetch existing picks for this week
      let picksQuery = supabase
        .from("picks")
        .select("*")
        .eq("league_id", leagueId)
        .eq("user_id", userId)
        .eq("week", currentWeek)
      if (seasonId != null) {
        picksQuery = picksQuery.eq("season_id", seasonId)
      }
      const { data: picksData, error: picksError } = await picksQuery

      if (picksError) throw picksError

      setPicks(picksData || [])
      setSelectedTeams(picksData?.map((pick) => pick.picked_team_id) || [])
      setUsingBye(picksData?.some((pick) => pick.is_bye) || false)

      // Fetch all used teams for the season
      let usedTeamsQuery = supabase
        .from("picks")
        .select("picked_team_id, week")
        .eq("league_id", leagueId)
        .eq("user_id", userId)
        .neq("week", currentWeek)
      if (seasonId != null) {
        usedTeamsQuery = usedTeamsQuery.eq("season_id", seasonId)
      }
      const { data: usedTeamsData, error: usedError } = await usedTeamsQuery

      if (usedError) throw usedError

      setUsedTeams(
        usedTeamsData?.map((pick) => ({
          team_id: pick.picked_team_id,
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

    setSelectedTeams((prev) => {
      if (prev.includes(teamId)) {
        // Deselect team
        return prev.filter((id) => id !== teamId)
      } else if (prev.length < 2) {
        // Select team
        return [...prev, teamId]
      } else {
        // Replace oldest selection
        return [prev[1], teamId]
      }
    })
  }

  const handleByeWeek = () => {
    if (byesUsed >= 4) return

    setUsingBye(!usingBye)
    if (!usingBye) {
      setSelectedTeams([])
    }
  }

  const isTeamUsed = (teamId: string) => {
    return usedTeams.some((used) => used.team_id === teamId)
  }

  const isGameLocked = (gameId: string) => {
    const game = games.find((g) => g.id === gameId)
    if (!game) return false
    return new Date(game.kickoff_ts) < new Date()
  }

  const getUsedWeek = (teamId: string) => {
    return usedTeams.find((used) => used.team_id === teamId)?.week
  }

  const canSubmit = () => {
    return usingBye || selectedTeams.length === 2
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

      // Delete existing picks for this week (scoped by season)
      await supabase
        .from("picks")
        .delete()
        .eq("league_id", leagueId)
        .eq("user_id", userId)
        .eq("week", currentWeek)
        .eq("season_id", effectiveSeasonId)

    if (usingBye) {
        // Insert bye week pick
        const { error: byeError } = await supabase.from("picks").insert({
          league_id: Number(leagueId),
          user_id: userId,
      season_id: effectiveSeasonId,
          week: currentWeek,
          game_id: null,
          picked_team_id: null,
          slot_number: null,
          is_bye: true,
          source: 'auto_bye',
        })

        if (byeError) throw byeError

        // Update byes used
        const { error: stateError } = await supabase
          .from("league_member_state")
          .update({ byes_used: byesUsed + 1 })
          .eq("league_id", leagueId)
          .eq("user_id", userId)

        if (stateError) throw stateError
      } else {
        // Insert team picks
    const pickInserts = selectedTeams.map((teamId, index) => {
          const game = games.find((g) => g.home_team_id === teamId || g.away_team_id === teamId)
          return {
            league_id: Number(leagueId),
            user_id: userId,
      season_id: effectiveSeasonId,
            week: currentWeek,
            game_id: game?.id != null ? Number(game.id) : null,
            picked_team_id: Number(teamId),
            slot_number: index + 1,
            is_bye: false,
          }
        })

        const { error: picksError } = await supabase.from("picks").insert(pickInserts)

        if (picksError) throw picksError
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
          />

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
