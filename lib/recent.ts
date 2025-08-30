import { supabase } from "./supabase";

export interface RecentPick {
  id: string;
  user_id: string;
  league_id: string;
  week: number;
  picked_team_id: number;
  created_at: string;
  league_name?: string;
  team_name?: string;
}

export interface RecentActivity {
  id: string;
  type: "pick" | "score" | "league_join" | "league_create";
  title: string;
  description: string;
  timestamp: string;
  points?: number;
  week?: number;
  league_name?: string;
  team_name?: string;
}

export async function fetchLatestWeekPicks(
  userId: string
): Promise<RecentPick[]> {
  try {
    // First, get the latest week number for this user
    const { data: latestWeekData, error: weekError } = await supabase
      .from("picks")
      .select("week")
      .eq("user_id", userId)
      .order("week", { ascending: false })
      .limit(1)
      .single();

    if (weekError || !latestWeekData) {
      console.error("Error fetching latest week:", weekError);
      return [];
    }

    const latestWeek = latestWeekData.week;

    // Now fetch all picks for that specific week
    const { data, error } = await supabase
      .from("picks")
      .select("id, user_id, league_id, week, picked_team_id, created_at")
      .eq("user_id", userId)
      .eq("week", latestWeek)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching latest week picks:", error);
      return [];
    }

    // Fetch league and team names separately
    const picksWithDetails = await Promise.all(
      (data || []).map(async (pick: any) => {
        // Get league name
        const { data: leagueData } = await supabase
          .from("leagues")
          .select("name")
          .eq("id", pick.league_id)
          .single();

        // Get team name
        const { data: teamData } = await supabase
          .from("teams")
          .select("display_name")
          .eq("id", pick.picked_team_id)
          .single();

        return {
          id: pick.id,
          user_id: pick.user_id,
          league_id: pick.league_id,
          week: pick.week,
          picked_team_id: pick.picked_team_id,
          created_at: pick.created_at,
          league_name: leagueData?.name || "Unknown League",
          team_name: teamData?.display_name || "Unknown Team",
        };
      })
    );

    return picksWithDetails;
  } catch (error) {
    console.error("Error fetching latest week picks:", error);
    return [];
  }
}

export async function fetchLatestPick(
  userId: string
): Promise<RecentPick | null> {
  try {
    const { data, error } = await supabase
      .from("picks")
      .select("id, user_id, league_id, week, picked_team_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching latest pick:", error);
      return null;
    }

    // Get league name
    const { data: leagueData } = await supabase
      .from("leagues")
      .select("name")
      .eq("id", data.league_id)
      .single();

    // Get team name
    const { data: teamData } = await supabase
      .from("teams")
      .select("display_name")
      .eq("id", data.picked_team_id)
      .single();

    return {
      id: data.id,
      user_id: data.user_id,
      league_id: data.league_id,
      week: data.week,
      picked_team_id: data.picked_team_id,
      created_at: data.created_at,
      league_name: leagueData?.name || "Unknown League",
      team_name: teamData?.display_name || "Unknown Team",
    };
  } catch (error) {
    console.error("Error fetching latest pick:", error);
    return null;
  }
}

export interface JoinedLeague {
  id: string;
  name: string;
  visibility: "public" | "private";
  created_at: string;
  member_since: string;
}

export async function fetchJoinedLeagues(
  userId: string
): Promise<JoinedLeague[]> {
  try {
    console.log("Fetching joined leagues for user:", userId);

    // First, get the league memberships
    const { data: memberships, error: membershipError } = await supabase
      .from("league_members")
      .select("league_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    console.log("Memberships data:", memberships);
    console.log("Membership error:", membershipError);

    if (membershipError) {
      console.error("Error fetching league memberships:", membershipError);
      return [];
    }

    if (!memberships || memberships.length === 0) {
      console.log("No memberships found for user:", userId);
      return [];
    }

    // Get league details for each membership
    const leaguesWithDetails = await Promise.all(
      memberships.map(async (membership: any) => {
        const { data: leagueData, error: leagueError } = await supabase
          .from("leagues")
          .select("id, name, visibility, created_at")
          .eq("id", membership.league_id)
          .single();

        if (leagueError) {
          console.error("Error fetching league details:", leagueError);
          return {
            id: membership.league_id,
            name: "Unknown League",
            visibility: "private" as const,
            created_at: "",
            member_since: membership.created_at,
          };
        }

        return {
          id: membership.league_id,
          name: leagueData?.name || "Unknown League",
          visibility: leagueData?.visibility || "private",
          created_at: leagueData?.created_at || "",
          member_since: membership.created_at,
        };
      })
    );

    return leaguesWithDetails;
  } catch (error) {
    console.error("Error fetching joined leagues:", error);
    return [];
  }
}

export function convertPicksToActivity(picks: RecentPick[]): RecentActivity[] {
  return picks.map((pick) => ({
    id: pick.id,
    type: "pick" as const,
    title: `Week ${pick.week} Pick`,
    description: `Selected ${pick.team_name} in ${pick.league_name}`,
    timestamp: pick.created_at,
    week: pick.week,
    league_name: pick.league_name,
    team_name: pick.team_name,
  }));
}
