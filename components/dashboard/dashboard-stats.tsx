"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Trophy, Users, Calendar, Target } from "lucide-react";

interface DashboardStatsProps {
  userId: string;
}

interface Stats {
  totalLeagues: number;
  currentWeek: number;
  totalPoints: number;
  pendingPicks: number;
}

export function DashboardStats({ userId }: DashboardStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalLeagues: 0,
    currentWeek: 1,
    totalPoints: 0,
    pendingPicks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Get total leagues
        const { data: leagues, error: leaguesError } = await supabase
          .from("league_members")
          .select("league_id")
          .eq("user_id", userId);

        if (leaguesError) throw leaguesError;

        // Get total points across all leagues
        const { data: scores, error: scoresError } = await supabase
          .from("scores")
          .select("points")
          .eq("user_id", userId);

        if (scoresError) throw scoresError;

        const totalPoints =
          scores?.reduce((sum, score) => sum + (score.points || 0), 0) || 0;

        // Get pending picks (simplified - would need current week logic)
        const { data: picks, error: picksError } = await supabase
          .from("picks")
          .select("id")
          .eq("user_id", userId)
          .eq("week", 1); // This would be current week

        if (picksError) throw picksError;

        setStats({
          totalLeagues: leagues?.length || 0,
          currentWeek: 1, // This would be calculated based on current date
          totalPoints,
          pendingPicks: Math.max(
            0,
            (leagues?.length || 0) * 2 - (picks?.length || 0)
          ),
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [userId]);

  const statCards = [
    {
      title: "Total Leagues",
      value: stats.totalLeagues,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Current Week",
      value: stats.currentWeek,
      icon: Calendar,
      color: "text-primary",
    },
    {
      title: "Total Points",
      value: stats.totalPoints,
      icon: Trophy,
      color: "text-primary",
    },
    {
      title: "Pending Picks",
      value: stats.pendingPicks,
      icon: Target,
      color: "text-primary",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card
            key={i}
            className="backdrop-blur-sm bg-card/80 border-border/50"
          >
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card
          key={index}
          className="backdrop-blur-sm bg-card/80 border-border/50 hover:bg-card/90 transition-all"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
