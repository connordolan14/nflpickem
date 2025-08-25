"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { StandingsTable } from "./standings-table";
import { PointsChart } from "./points-chart";
import { Trophy, Users, Download, Settings } from "lucide-react";
import Link from "next/link";

interface LeagueStandingsProps {
  leagueId: string;
  userId: string;
}

interface LeagueInfo {
  id: string;
  name: string;
  description: string;
  visibility: string;
  member_count: number;
  owner_id: string;
  join_code: string;
}

interface StandingData {
  user_id: string;
  display_name: string;
  total_points: number;
  wins: number;
  losses: number;
  byes_used: number;
  rank: number;
}

export function LeagueStandings({ leagueId, userId }: LeagueStandingsProps) {
  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [standings, setStandings] = useState<StandingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function fetchLeagueData() {
      try {
        // Fetch league info
        const { data: leagueData, error: leagueError } = await supabase
          .from("leagues")
          .select("*")
          .eq("id", leagueId)
          .single();

        if (leagueError) throw leagueError;

        // Get member count
        const { count } = await supabase
          .from("league_members")
          .select("*", { count: "exact", head: true })
          .eq("league_id", leagueId);

        setLeague({ ...leagueData, member_count: count || 0 });
        setIsOwner(leagueData.owner_id === userId);

        // Prefer querying the league_standings view/table directly (RPC may not exist)
        const { data: standingsData, error: standingsError } = await supabase
          .from("league_standings")
          .select(
            "user_id, display_name, total_points, wins, losses, byes_used, rank"
          )
          .eq("league_id", leagueId)
          .order("rank", { ascending: true });

        if (standingsError) throw standingsError;

        if (standingsData && standingsData.length > 0) {
          setStandings(standingsData as unknown as StandingData[]);
        } else {
          // Fallback to members list when there are no computed standings yet
          const { data: membersData, error: membersError } = await supabase
            .from("league_members")
            .select(
              `
              user_id,
              profiles!inner(display_name),
              league_member_state!inner(byes_used)
            `
            )
            .eq("league_id", leagueId);

          if (membersError) throw membersError;

          const seedStandings: StandingData[] = (membersData as any[]).map(
            (member: any, index: number) => {
              const profile = Array.isArray(member.profiles)
                ? member.profiles[0]
                : member.profiles;
              const state = Array.isArray(member.league_member_state)
                ? member.league_member_state[0]
                : member.league_member_state;
              return {
                user_id: member.user_id,
                display_name: profile?.display_name ?? "Member",
                total_points: 0,
                wins: 0,
                losses: 0,
                byes_used: state?.byes_used ?? 0,
                rank: index + 1,
              };
            }
          );

          setStandings(seedStandings);
        }
      } catch (error) {
        console.error("Error fetching league data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLeagueData();

    // Set up real-time subscription for standings updates
    const subscription = supabase
      .channel(`league_${leagueId}_standings`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scores",
          filter: `league_id=eq.${leagueId}`,
        },
        () => fetchLeagueData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "picks",
          filter: `league_id=eq.${leagueId}`,
        },
        () => fetchLeagueData()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [leagueId, userId]);

  const exportToCSV = () => {
    if (!standings.length) return;

    const headers = ["Rank", "Name", "Points", "Wins", "Losses", "Byes Used"];
    const csvContent = [
      headers.join(","),
      ...standings.map((s) =>
        [
          s.rank,
          `"${s.display_name}"`,
          s.total_points,
          s.wins,
          s.losses,
          s.byes_used,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${league?.name || "league"}_standings.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">League not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* League Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground mb-2">
            {league.name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {league.member_count} members
            </div>
            <Badge
              variant={league.visibility === "public" ? "default" : "secondary"}
            >
              {league.visibility}
            </Badge>
            {league.visibility === "private" && (
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                Code: {league.join_code}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/leagues/${leagueId}/picks`}>Make Picks</Link>
          </Button>
          {isOwner && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/leagues/${leagueId}/manage`}>
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Standings Table */}
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-primary" />
            League Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StandingsTable
            standings={standings}
            currentUserId={userId}
            leagueId={leagueId}
          />
        </CardContent>
      </Card>

      {/* Points Progression Chart */}
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle>Points Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <PointsChart standings={standings} leagueId={leagueId} />
        </CardContent>
      </Card>
    </div>
  );
}
