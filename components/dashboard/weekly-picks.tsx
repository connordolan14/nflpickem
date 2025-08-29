"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Target, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

interface WeeklyPicksProps {
  userId: string;
}

interface PickStatus {
  league_id: string;
  league_name: string;
  picks_made: number;
  picks_needed: number;
  deadline: string;
  name: string;
}

export function WeeklyPicks({ userId }: WeeklyPicksProps) {
  const [pickStatuses, setPickStatuses] = useState<PickStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek] = useState(1); // This would be calculated based on current date

  useEffect(() => {
    async function fetchWeeklyPicks() {
      try {
        // Get user's leagues
        const { data: leagues, error: leaguesError } = await supabase
          .from("league_members")
          .select(
            `
            league_id,
            leagues!inner (
              id,
              name
            )
          `
          )
          .eq("user_id", userId);

        if (leaguesError) throw leaguesError;

        // Get picks for current week
        const { data: picks, error: picksError } = await supabase
          .from("picks")
          .select("league_id")
          .eq("user_id", userId)
          .eq("week", currentWeek);
        if (picksError) throw picksError;

        // Create pick status for each league
        const statuses: PickStatus[] =
          leagues?.map((league) => {
            const leaguePicks =
              picks?.filter((pick) => pick.league_id === league.league_id) ||
              [];
            return {
              league_id: league.league_id,
              league_name: league.leagues.name,
              picks_made: leaguePicks.length,
              picks_needed: 2, // Always need 2 picks per week
              deadline: "2024-09-15T13:00:00Z", // Mock deadline
            };
          }) || [];

        setPickStatuses(statuses);
      } catch (error) {
        console.error("Error fetching weekly picks:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWeeklyPicks();
  }, [userId, currentWeek]);

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle>This Week's Picks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingPicks = pickStatuses.filter(
    (status) => status.picks_made < status.picks_needed
  );
  const completedPicks = pickStatuses.filter(
    (status) => status.picks_made >= status.picks_needed
  );

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 mr-2 text-primary" />
          Week {currentWeek} Picks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pickStatuses.length === 0 ? (
          <div className="text-center py-6">
            <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No leagues to make picks for.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pending Picks */}
            {pendingPicks.map((status) => (
              <div
                key={status.league_id}
                className="p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">
                    {status.league_name}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {status.picks_made}/{status.picks_needed}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Due: Sun 1:00 PM
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/leagues/${status.league_id}/picks`}>
                      Make Picks
                    </Link>
                  </Button>
                </div>
              </div>
            ))}

            {/* Completed Picks */}
            {completedPicks.map((status) => (
              <div
                key={status.league_id}
                className="p-3 rounded-lg border border-border/50 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">
                    {status.league_name}
                  </h4>
                  <Badge variant="default" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Picks submitted for Week {currentWeek}
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/leagues/${status.league_id}/picks`}>
                      View Picks
                    </Link>
                  </Button>
                </div>
              </div>
            ))}

            {pendingPicks.length === 0 && completedPicks.length > 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                All picks completed for Week {currentWeek}!
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
