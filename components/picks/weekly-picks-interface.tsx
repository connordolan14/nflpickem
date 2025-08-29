"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { fetchCurrentSeasonId } from "@/lib/season";
import {
  Calendar,
  Target,
  ChevronUp,
  ChevronDown,
  Loader2,
  Users,
} from "lucide-react";
import { GameCard } from "./game-card";
import { PicksSummary } from "./picks-summary";
import { ConfirmationModal } from "./confirmation-modal";
import { Badge } from "../ui/badge";

interface WeeklyPicksInterfaceProps {
  userId: string;
  leagueId?: string; // optional: when provided (from route), prefer and lock selection
}

interface GameData {
  id: string;
  week: number;
  home_team_id: string;
  away_team_id: string;
  home_team: string;
  home_code: string;
  away_team: string;
  away_code: string;
  home_points: number;
  away_points: number;
  kickoff_ts: string;
  status: string;
  winner_team_id: string | null;
  home_logo: string | null;
  away_logo: string | null;
}

interface PickData {
  id: string;
  game_id: string;
  picked_team_id: string;
  slot_number: number;
  is_bye: boolean;
}

interface UsedTeam {
  team_id: string;
  week: number;
}

interface League {
  id: string;
  name: string;
}

interface AllPicksData {
  team_id: string;
  logo: string | null;
  is_bye: boolean;
}

export function WeeklyPicksInterface({ userId, leagueId }: WeeklyPicksInterfaceProps) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(
    null
  );
  // Only set the initial league selection once (prefer route league if provided)
  const initialLeagueSet = useRef(false);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [picks, setPicks] = useState<PickData[]>([]);
  const [usedTeams, setUsedTeams] = useState<UsedTeam[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [byesUsed, setByesUsed] = useState(0);
  const [usingBye, setUsingBye] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [seasonYear, setSeasonYear] = useState<number | null>(null);
  const [allPicks, setAllPicks] = useState<Map<number, AllPicksData[]>>(
    new Map()
  );

  const normalizeId = (v: any): string => (v == null ? "" : String(v));

  useEffect(() => {
    const fetchLeagues = async () => {
      const { data: memberEntries, error: memberError } = await supabase
        .from("league_members")
        .select("league_id")
        .eq("user_id", userId);

      if (memberError || !memberEntries) {
        console.error("Error fetching user leagues:", memberError);
        return;
      }

      const leagueIds = memberEntries.map((m) => m.league_id);
      if (leagueIds.length === 0) {
        setLeagues([]);
        return;
      }

      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("id, name")
        .in("id", leagueIds);

      if (leagueError) {
        console.error("Error fetching leagues:", leagueError);
      } else if (leagueData) {
        // Normalize IDs to strings for Select consistency
        const normalized = (leagueData || []).map((l: any) => ({
          id: String(l.id),
          name: l.name as string,
        })) as League[];
        setLeagues(normalized);
        // Prefer route league only once on initial mount
        if (!initialLeagueSet.current) {
          if (leagueId) {
            setSelectedLeagueId(String(leagueId));
          } else if (normalized.length > 0) {
            setSelectedLeagueId(normalized[0].id);
          }
          initialLeagueSet.current = true;
        }
      }
    };

    fetchLeagues();
  }, [userId, leagueId]);

  // Do NOT re-lock selection on subsequent renders to allow user changes.

  // Reset week-specific state when selected league changes
  useEffect(() => {
    setExpandedWeek(null);
    setGames([]);
    setPicks([]);
    setSelectedTeams([]);
    setByesUsed(0);
    setUsingBye(false);
    setAllPicks(new Map());
  }, [selectedLeagueId]);

  const fetchWeekData = useCallback(
    async (week: number) => {
      if (!selectedLeagueId || !seasonId || !seasonYear) return;

      setLoading(true);
      setError("");

      try {
        const { data: gamesData, error: gamesError } = await supabase
          .from("games")
          .select(
            `
            *,
            home_team:teams!games_home_team_id_fkey(display_name, nfl_team_code, points_value, logo),
            away_team:teams!games_away_team_id_fkey(display_name, nfl_team_code, points_value, logo)
          `
          )
          .eq("week", week)
          .eq("season_id", seasonId)
          .gte(
            "kickoff_ts",
            new Date(Date.UTC(seasonYear, 8, 1, 0, 0, 0)).toISOString()
          )
          .order("kickoff_ts");

        if (gamesError) throw gamesError;

        const transformedGames: GameData[] =
          gamesData?.map((game) => ({
            id: normalizeId(game.id),
            week: game.week,
            home_team_id: normalizeId(game.home_team_id),
            away_team_id: normalizeId(game.away_team_id),
            home_team: game.home_team.display_name,
            home_code: game.home_team.nfl_team_code,
            home_logo: game.home_team.logo,
            away_team: game.away_team.display_name,
            away_code: game.away_team.nfl_team_code,
            away_logo: game.away_team.logo,
            home_points: game.home_team.points_value,
            away_points: game.away_team.points_value,
            kickoff_ts: game.kickoff_ts,
            status: game.status,
            winner_team_id:
              game.winner_team_id != null
                ? normalizeId(game.winner_team_id)
                : null,
          })) || [];
        setGames(transformedGames);

        const { data: picksData, error: picksError } = await supabase
          .from("picks")
          .select("*")
          .eq("league_id", Number(selectedLeagueId))
          .eq("user_id", userId)
          .eq("week", week)
          .eq("season_id", seasonId);

        if (picksError) throw picksError;

        setPicks(picksData || []);
        const lockedIds = new Set(
          transformedGames
            .filter((g) => new Date(g.kickoff_ts) < new Date())
            .map((g) => g.id)
        );
        const initialEditable = (picksData || [])
          .filter((p) => !p.is_bye && !lockedIds.has(normalizeId(p.game_id)))
          .map((p) => normalizeId(p.picked_team_id));
        setSelectedTeams(initialEditable);
        setUsingBye(picksData?.some((pick) => pick.is_bye) || false);

        const { data: usedTeamsData, error: usedError } = await supabase
          .from("picks")
          .select("picked_team_id, week")
          .eq("league_id", Number(selectedLeagueId))
          .eq("user_id", userId)
          .eq("season_id", seasonId)
          .neq("week", week);

        if (usedError) throw usedError;
        setUsedTeams(
          usedTeamsData?.map((pick) => ({
            team_id: normalizeId(pick.picked_team_id),
            week: pick.week,
          })) || []
        );

        const { data: memberState, error: stateError } = await supabase
          .from("league_member_state")
          .select("byes_used")
          .eq("league_id", Number(selectedLeagueId))
          .eq("user_id", userId)
          .single();

        if (stateError) throw stateError;
        setByesUsed(memberState?.byes_used || 0);
      } catch (error: any) {
        console.error("Error fetching week data:", error);
        setError("Failed to load week data. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [selectedLeagueId, userId, seasonId, seasonYear]
  );

  useEffect(() => {
    const initSeason = async () => {
      const sid = await fetchCurrentSeasonId(supabase);
      setSeasonId(sid);
      if (sid) {
        const { data: srow } = await supabase
          .from("seasons")
          .select("year")
          .eq("id", sid)
          .single();
        if (srow?.year) {
          setSeasonYear(srow.year);
        }
      }
    };
    initSeason();
  }, []);

  useEffect(() => {
    const fetchAllPicks = async () => {
      if (!selectedLeagueId || !seasonId) return;

      const { data, error } = await supabase
        .from("picks")
        .select("week, picked_team_id, is_bye, teams(logo)")
        .eq("league_id", Number(selectedLeagueId))
        .eq("user_id", userId)
        .eq("season_id", seasonId);

      if (error) {
        console.error("Error fetching all picks summary:", error);
        return;
      }

      const picksByWeek = new Map<number, AllPicksData[]>();
      for (const pick of data || []) {
        if (!picksByWeek.has(pick.week)) {
          picksByWeek.set(pick.week, []);
        }
        picksByWeek.get(pick.week)?.push({
          team_id: normalizeId(pick.picked_team_id),
          logo: pick.is_bye ? null : (pick.teams as any)?.logo,
          is_bye: pick.is_bye,
        });
      }
      setAllPicks(picksByWeek);
    };
    fetchAllPicks();
  }, [selectedLeagueId, seasonId, userId]);

  useEffect(() => {
    if (expandedWeek !== null) {
      fetchWeekData(expandedWeek);

    }
  }, [expandedWeek, fetchWeekData]);

  const handleToggleWeek = (week: number) => {
    const newWeek = expandedWeek === week ? null : week;
    setExpandedWeek(newWeek);
    if (newWeek !== null) {
      setGames([]);
      setPicks([]);
      setSelectedTeams([]);
    }
  };

  const isTeamUsed = (teamId: string) => {
    return usedTeams.some((used) => used.team_id === teamId);
  };

  const isGameLocked = (gameId: string | number) => {
    const gid = normalizeId(gameId);
    const game = games.find((g) => g.id === gid);
    if (!game) return true;
    return new Date(game.kickoff_ts) < new Date();
  };

  const getLockedPicks = () =>
    picks.filter((p) => !p.is_bye && isGameLocked(p.game_id));

  const hasExistingByeThisWeek = () => picks.some((p) => p.is_bye);

  const editableCapacity = () => {
    const lockedCount = getLockedPicks().length;
    const existingBye = hasExistingByeThisWeek() ? 1 : 0;
    return Math.max(0, 2 - lockedCount - existingBye);
  };

  const pickSlotsRemaining = () => {
    const capacity = editableCapacity();
    const availableTeams = new Set<string>();
    for (const g of games) {
      if (!isGameLocked(g.id)) {
        if (!isTeamUsed(g.home_team_id)) availableTeams.add(g.home_team_id);
        if (!isTeamUsed(g.away_team_id)) availableTeams.add(g.away_team_id);
      }
    }
    return Math.max(0, Math.min(capacity, availableTeams.size));
  };

  const handleTeamSelect = (teamId: string, gameId: string) => {
    if (usingBye || isTeamUsed(teamId) || isGameLocked(gameId)) return;
    const slots = pickSlotsRemaining();
    if (slots <= 0 && !selectedTeams.includes(teamId)) return;

    setSelectedTeams((prev) => {
      let updated;
      if (prev.includes(teamId)) {
        updated = prev.filter((id) => id !== teamId);
      } else if (prev.length < slots) {
        updated = [...prev, teamId];
      } else if (slots === 1) {
        updated = [teamId];
      } else {
        const trimmed = prev.slice(prev.length - (slots - 1));
        updated = [...trimmed, teamId];
      }

      // Update allPicks for the current week to always reflect selectedTeams (max 2)
      if (expandedWeek !== null) {
        setAllPicks((prevMap) => {
          const newMap = new Map(prevMap);
          // Build picks for this week from updated selectedTeams
          const picksForWeek = updated.slice(0, 2).map((tid) => {
            const game = games.find(
              (g) => g.home_team_id === tid || g.away_team_id === tid
            );
            const logo =
              game?.home_team_id === tid
                ? game?.home_logo
                : game?.away_team_id === tid
                ? game?.away_logo
                : null;
            return {
              team_id: tid,
              logo,
              is_bye: false,
            };
          });
          newMap.set(expandedWeek, picksForWeek);
          return newMap;
        });
      }

      return updated;
    });
  };

  const handleByeWeek = () => {
    if (byesUsed >= 4) return;
    const capacity = editableCapacity();
    const alreadyBye = hasExistingByeThisWeek();
    if (!usingBye && (capacity <= 0 || alreadyBye)) return;

    setUsingBye(!usingBye);
    if (!usingBye) {
      setSelectedTeams([]);
    }
  };

  const canSubmit = () => {
    const capacity = editableCapacity();
    const slots = pickSlotsRemaining();
    const canAddBye = usingBye && !hasExistingByeThisWeek() && capacity > 0;
    const canAddPicks = Math.min(selectedTeams.length, slots) > 0;
    return canAddBye || canAddPicks;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || !expandedWeek) return;

    setSubmitting(true);
    setError("");

    try {
      const lockedPicks = getLockedPicks();
      const existingBye = hasExistingByeThisWeek();
      const unlockedPickIds = picks
        .filter((p) => p.is_bye || !isGameLocked(p.game_id))
        .map((p) => p.id);

      if (unlockedPickIds.length > 0) {
        await supabase.from("picks").delete().in("id", unlockedPickIds);
      }

      let slots = Math.max(0, 2 - lockedPicks.length - (existingBye ? 1 : 0));

      if (usingBye && !existingBye && slots > 0) {
        await supabase.from("picks").insert({
          league_id: Number(selectedLeagueId),
          user_id: userId,
          season_id: seasonId,
          week: expandedWeek,
          is_bye: true,
        });
        await supabase
          .from("league_member_state")
          .update({ byes_used: byesUsed + 1 })
          .eq("league_id", Number(selectedLeagueId))
          .eq("user_id", userId);
        slots -= 1;
      }

      if (slots > 0 && selectedTeams.length > 0) {
        const lockedTeamIds = new Set(
          lockedPicks.map((p) => normalizeId(p.picked_team_id))
        );
        const teamsToInsert = selectedTeams
          .filter((tid) => !lockedTeamIds.has(tid))
          .slice(0, slots);

        const pickInserts = teamsToInsert.map((teamId) => {
          const game = games.find(
            (g) => g.home_team_id === teamId || g.away_team_id === teamId
          );
          return {
            league_id: Number(selectedLeagueId),
            user_id: userId,
            season_id: seasonId,
            week: expandedWeek,
            game_id: game ? Number(game.id) : null,
            picked_team_id: Number(teamId),
            is_bye: false,
          };
        });

        if (pickInserts.length > 0) {
          await supabase.from("picks").insert(pickInserts);
        }
      }

      if (existingBye && !usingBye) {
        await supabase
          .from("league_member_state")
          .update({ byes_used: Math.max(0, byesUsed - 1) })
          .eq("league_id", Number(selectedLeagueId))
          .eq("user_id", userId);
      }

      await fetchWeekData(expandedWeek);
      setShowConfirmation(false);
    } catch (error: any) {
      console.error("Error submitting picks:", error);
      setError("Failed to submit picks. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground">
            Make Your Picks
          </h1>
          <p className="text-muted-foreground">
            Select a league and manage your weekly picks.
          </p>
        </div>
        <div className="w-64">
          <Select
            onValueChange={(val) => setSelectedLeagueId(val)}
            value={selectedLeagueId ?? undefined}
            disabled={leagues.length === 0}
          >
            <SelectTrigger>
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select a league" />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((league) => (
                <SelectItem key={league.id} value={league.id}>
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => {
          const picksForWeek = allPicks.get(week);
          const isExpanded = expandedWeek === week;

          return (
            <Card
              key={week}
              className="backdrop-blur-sm bg-card/50 border-border/50"
            >
              <CardHeader
                className="flex flex-row items-center justify-between cursor-pointer p-4"
                onClick={() => handleToggleWeek(week)}
              >
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold">Week {week}</h2>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground hidden sm:inline">
                      Your Picks:
                    </p>
                    {picksForWeek && picksForWeek.length > 0 ? (
                      <div className="flex items-center space-x-1">
                        {picksForWeek.map((pick) =>
                          pick.is_bye ? (
                            <Badge key="bye" variant="outline">
                              BYE
                            </Badge>
                          ) : (
                            <img
                              key={pick.team_id}
                              src={pick.logo || "/placeholder-logo.svg"}
                              alt="picked team logo"
                              className="sm:w-16 sm:h-16 w-8 h-8 object-contain"
                            />
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Not picked
                      </p>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-4 border-t border-border/50">
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {games.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8 md:col-span-2">
                            No games available for Week {week}
                          </p>
                        ) : (
                          games.map((game, index) => (
                            <GameCard
                              key={game.id}
                              game={game}
                              gameIndex={index}
                              selectedTeams={selectedTeams}
                              usedTeams={usedTeams}
                              onTeamSelect={handleTeamSelect}
                              disabled={usingBye}
                            />
                          ))
                        )}
                      </div>
                      <div className="space-y-4">
                        <PicksSummary
                          selectedTeams={selectedTeams}
                          games={games}
                          usingBye={usingBye}
                          byesUsed={byesUsed}
                          onByeWeek={handleByeWeek}
                          currentWeek={week}
                          lockedPicks={(picks || [])
                            .filter(
                              (p) => !p.is_bye && isGameLocked(p.game_id)
                            )
                            .map((p) => {
                              const g = games.find(
                                (gm) =>
                                  gm.home_team_id ===
                                    normalizeId(p.picked_team_id) ||
                                  gm.away_team_id ===
                                    normalizeId(p.picked_team_id)
                              );
                              const isHome =
                                g?.home_team_id ===
                                normalizeId(p.picked_team_id);
                              return {
                                team_id: normalizeId(p.picked_team_id),
                                name: isHome
                                  ? g?.home_team || "Team"
                                  : g?.away_team || "Team",
                                code: isHome
                                  ? g?.home_code || ""
                                  : g?.away_code || "",
                                points: isHome
                                  ? g?.home_points || 0
                                  : g?.away_points || 0,
                              };
                            })}
                          remainingSlots={pickSlotsRemaining()}
                        />
                        {error && (
                          <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}
                        <Button
                          onClick={() => setShowConfirmation(true)}
                          disabled={!canSubmit() || submitting}
                          className="w-full bg-primary hover:bg-primary/90"
                          size="lg"
                        >
                          {submitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Target className="mr-2 h-4 w-4" />
                          )}
                          Submit Picks for Week {week}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <ConfirmationModal
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        selectedTeams={selectedTeams}
        games={games}
        usingBye={usingBye}
        currentWeek={expandedWeek || 0}
        onConfirm={handleSubmit}
        loading={submitting}
      />
    </div>
  );
}

      