import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function mapStatus(raw?: string): "scheduled" | "live" | "final" {
  const s = (raw || "").toUpperCase();
  if (["NS", "TBD", "PST", "NOT STARTED", "SCHEDULED"].includes(s)) return "scheduled";
  if (["1H", "2H", "OT", "LIVE", "INP", "HT", "Q1", "Q2", "Q3", "Q4"].includes(s)) return "live";
  if (["FT", "AOT", "ENDED", "FINAL", "FINISHED"].includes(s)) return "final";
  return "scheduled";
}

serve(async () => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  // 1) Fetch & upsert games every 10 minutes between 10–23 UTC
  if (utcHour >= 10 && utcHour <= 23 && minute % 10 === 0) {
    try {
      const res = await fetch("https://api-sports.io/nfl/v1/games", {
        headers: { "x-apisports-key": Deno.env.get("API_SPORTS_KEY")! },
      });
      const data = await res.json();

      const normalized = Array.isArray(data?.response) ? data.response.map((g: any) => {
        // Try to read from different possible API shapes
        const gameId = g?.id ?? g?.game?.id ?? g?.fixture?.id;
        const seasonYear = g?.season ?? g?.league?.season ?? g?.league?.year;
        const week = g?.week ?? g?.week?.number ?? g?.league?.round;
        const homeCode = g?.teams?.home?.code ?? g?.teams?.home?.name;
        const awayCode = g?.teams?.away?.code ?? g?.teams?.away?.name;
        const kickoffIso = g?.date ?? g?.fixture?.date;
        const statusRaw = g?.status?.short ?? g?.status ?? g?.fixture?.status?.short ?? g?.fixture?.status?.long;

        // Winner determination best-effort
        let winnerCode: string | null = null;
        const hWinner = g?.scores?.home?.winner ?? g?.score?.home?.winner;
        const aWinner = g?.scores?.away?.winner ?? g?.score?.away?.winner;
        const hPoints = g?.scores?.home?.total ?? g?.score?.home ?? g?.scores?.home?.points;
        const aPoints = g?.scores?.away?.total ?? g?.score?.away ?? g?.scores?.away?.points;

        if (hWinner === true) winnerCode = homeCode ?? null;
        else if (aWinner === true) winnerCode = awayCode ?? null;
        else if (typeof hPoints === "number" && typeof aPoints === "number") {
          if (hPoints > aPoints) winnerCode = homeCode ?? null;
          else if (aPoints > hPoints) winnerCode = awayCode ?? null;
        }

        return {
          game_id: gameId ? Number(gameId) : null,
          season_year: seasonYear ? Number(seasonYear) : null,
          week: week ? Number(String(week).replace(/\D/g, "") || "0") : null,
          home_code: homeCode || null,
          away_code: awayCode || null,
          kickoff_ts: kickoffIso || null,
          status: mapStatus(statusRaw),
          winner_code: winnerCode,
        };
      }).filter((x: any) =>
        x.game_id && x.season_year && x.home_code && x.away_code && x.kickoff_ts
      ) : [];

      if (normalized.length > 0) {
        const { error } = await supabase.rpc("api_upsert_games", { games: normalized });
        if (error) console.error("api_upsert_games error:", error);
      }
    } catch (e) {
      console.error("Fetch/upsert games failed:", e);
    }
  }

  // 2) Lock picks for started games (every minute)
  {
    const { error } = await supabase.rpc("lock_picks_for_started_games");
    if (error) console.error("lock_picks_for_started_games error:", error);
  }

  // 3) Calculate scores for final games (every 5 minutes)
  if (minute % 5 === 0) {
    const { error } = await supabase.rpc("calculate_scores_for_final_games");
    if (error) console.error("calculate_scores_for_final_games error:", error);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});