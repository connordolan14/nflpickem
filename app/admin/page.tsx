"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Trophy,
  TrendingUp,
  Activity,
  Shield,
  Plus,
  Trash2,
  Edit,
  Eye,
  Calendar,
  Target,
  Award,
  Settings,
} from "lucide-react";
import { TeamsDefaultsAdmin } from "@/components/admin/teams-defaults";

interface Profile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

interface League {
  id: string;
  name: string;
  visibility: "public" | "private";
  owner_id: string;
  season_id: number;
  join_code: string | null;
  rules_json: any;
  description: string | null;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalLeagues: 0,
    activeLeagues: 0,
    totalPicks: 0,
    totalGames: 0,
    revenue: 0,
    growthRate: 0,
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth");
        return;
      }
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error || profile?.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(true);
      setAuthChecked(true);
      // Now safe to load admin data
      fetchProfiles();
      fetchLeagues();
      fetchStats();
    };
    init();
  }, [router]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching profiles:", error);
        return;
      }

      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const fetchLeagues = async () => {
    try {
      const { data, error } = await supabase
        .from("leagues")
        .select(
          "id, name, visibility, owner_id, season_id, join_code, rules_json, description, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching leagues:", error);
        return;
      }

      setLeagues(data || []);
    } catch (error) {
      console.error("Error fetching leagues:", error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch total leagues
      const { count: totalLeagues } = await supabase
        .from("leagues")
        .select("*", { count: "exact", head: true });

      // Fetch total picks
      const { count: totalPicks } = await supabase
        .from("picks")
        .select("*", { count: "exact", head: true });

      // Fetch total games
      const { count: totalGames } = await supabase
        .from("games")
        .select("*", { count: "exact", head: true });

      // Calculate active users (users who have made picks in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeUsersData } = await supabase
        .from("picks")
        .select("user_id")
        .gte("created_at", thirtyDaysAgo.toISOString());

      // Get unique active users
      const activeUsers = activeUsersData
        ? new Set(activeUsersData.map((pick) => pick.user_id)).size
        : 0;

      // Calculate active leagues (leagues with picks in the last 30 days)
      const { data: activeLeaguesData } = await supabase
        .from("picks")
        .select("league_id")
        .gte("created_at", thirtyDaysAgo.toISOString());

      // Get unique active leagues
      const activeLeagues = activeLeaguesData
        ? new Set(activeLeaguesData.map((pick) => pick.league_id)).size
        : 0;

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalLeagues: totalLeagues || 0,
        activeLeagues: activeLeagues || 0,
        totalPicks: totalPicks || 0,
        totalGames: totalGames || 0,
        revenue: 0, // This would need to be calculated based on your business logic
        growthRate: 0, // This would need to be calculated based on historical data
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Checking permissions...</div>
        </div>
      </div>
    );
  }

  if (loading && isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading admin dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your NFL Pick Two application and monitor system performance
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full  grid-cols-2 sm:grid-cols-4  bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200"
          >
            Users
          </TabsTrigger>
          <TabsTrigger
            value="leagues"
            className="data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-200"
          >
            Leagues
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
          >
            Default Team points
          </TabsTrigger>

        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalUsers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{stats.growthRate}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Leagues
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeLeagues}</div>
                {/* <p className="text-xs text-muted-foreground">
                  {stats.totalLeagues} total leagues
                </p> */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Picks
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalPicks.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalGames} games this season
                </p>
              </CardContent>
            </Card>

            {/* <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats.revenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card> */}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  profiles.map((profile) => (
                    <div
                      key={profile.user_id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={profile.display_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{profile.display_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Joined{" "}
                            {new Date(profile.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Active</Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leagues" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>League Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leagues.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leagues found (Total: {leagues.length})
                  </div>
                ) : (
                  leagues.map((league) => (
                    <div
                      key={league.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">
                            {league.name || "Unnamed League"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {league.visibility} • Created{" "}
                            {new Date(league.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            league.visibility === "public"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {league.visibility}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="settings" className="space-y-6">
          <TeamsDefaultsAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}
