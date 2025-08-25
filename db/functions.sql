-- 1) Trigger helper used by league_member_state
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2) Picks trigger function referenced by t_picks_biu (kept minimal and safe)
CREATE OR REPLACE FUNCTION public.picks_before_insert_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- 3) Lock picks for games that have started
CREATE OR REPLACE FUNCTION public.lock_picks_for_started_games()
RETURNS void
LANGUAGE sql
AS $$
UPDATE public.picks p
SET locked_at = NOW()
FROM public.games g
WHERE p.game_id = g.id
  AND p.locked_at IS NULL
  AND g.kickoff_ts IS NOT NULL
  AND g.kickoff_ts <= NOW();
$$;

-- 4) Upsert games from normalized API payload
-- Expected JSONB array elements:
-- { game_id: bigint, season_year: int, week: int|null, home_code: text, away_code: text, kickoff_ts: iso8601, status: 'scheduled'|'live'|'final', winner_code: text|null }
CREATE OR REPLACE FUNCTION public.api_upsert_games(games jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  g jsonb;
  v_game_id bigint;
  v_season_year int;
  v_week int;
  v_home_code text;
  v_away_code text;
  v_kickoff timestamptz;
  v_status text;
  v_winner_code text;
  v_season_id bigint;
  v_home_id bigint;
  v_away_id bigint;
  v_winner_id bigint;
BEGIN
  FOR g IN SELECT jsonb_array_elements(games)
  LOOP
    v_game_id     := NULLIF(g->>'game_id','')::bigint;
    v_season_year := NULLIF(g->>'season_year','')::int;
    v_week        := NULLIF(g->>'week','')::int;
    v_home_code   := NULLIF(g->>'home_code','');
    v_away_code   := NULLIF(g->>'away_code','');
    v_kickoff     := (g->>'kickoff_ts')::timestamptz;
    v_status      := COALESCE(g->>'status','scheduled');
    v_winner_code := NULLIF(g->>'winner_code','');

    IF v_game_id IS NULL OR v_season_year IS NULL OR v_home_code IS NULL OR v_away_code IS NULL OR v_kickoff IS NULL THEN
      CONTINUE;
    END IF;

    -- Ensure season
    SELECT id INTO v_season_id FROM public.seasons WHERE year = v_season_year;
    IF v_season_id IS NULL THEN
      INSERT INTO public.seasons (year, is_active) VALUES (v_season_year, false) RETURNING id INTO v_season_id;
    END IF;

    -- Ensure teams for this season
    SELECT id INTO v_home_id FROM public.teams WHERE season_id = v_season_id AND nfl_team_code = v_home_code;
    IF v_home_id IS NULL THEN
      INSERT INTO public.teams (season_id, nfl_team_code, display_name)
      VALUES (v_season_id, v_home_code, v_home_code)
      RETURNING id INTO v_home_id;
    END IF;

    SELECT id INTO v_away_id FROM public.teams WHERE season_id = v_season_id AND nfl_team_code = v_away_code;
    IF v_away_id IS NULL THEN
      INSERT INTO public.teams (season_id, nfl_team_code, display_name)
      VALUES (v_season_id, v_away_code, v_away_code)
      RETURNING id INTO v_away_id;
    END IF;

    v_winner_id := NULL;
    IF v_winner_code IS NOT NULL THEN
      SELECT id INTO v_winner_id FROM public.teams
      WHERE season_id = v_season_id AND nfl_team_code = v_winner_code;
    END IF;

    -- Normalize status to fit CHECK constraint
    IF v_status NOT IN ('scheduled','live','final') THEN
      IF v_status IN ('NS','TBD','PST','NOT STARTED','SCHEDULED') THEN v_status := 'scheduled';
      ELSIF v_status IN ('1H','2H','OT','LIVE','INP','HT','Q1','Q2','Q3','Q4') THEN v_status := 'live';
      ELSIF v_status IN ('FT','AOT','ENDED','FINAL','FINISHED') THEN v_status := 'final';
      ELSE v_status := 'scheduled';
      END IF;
    END IF;

    INSERT INTO public.games (id, season_id, week, home_team_id, away_team_id, kickoff_ts, status, winner_team_id)
    VALUES (v_game_id, v_season_id, v_week, v_home_id, v_away_id, v_kickoff, v_status, v_winner_id)
    ON CONFLICT (id) DO UPDATE
      SET season_id      = EXCLUDED.season_id,
          week           = EXCLUDED.week,
          home_team_id   = EXCLUDED.home_team_id,
          away_team_id   = EXCLUDED.away_team_id,
          kickoff_ts     = EXCLUDED.kickoff_ts,
          status         = EXCLUDED.status,
          winner_team_id = EXCLUDED.winner_team_id;
  END LOOP;
END;
$$;

-- 5) Calculate weekly scores for final games, per league/user/week
CREATE OR REPLACE FUNCTION public.calculate_scores_for_final_games()
RETURNS void
LANGUAGE sql
AS $$
WITH final_picks AS (
  SELECT p.league_id, p.user_id, p.season_id, p.week, p.picked_team_id, p.game_id
  FROM public.picks p
  JOIN public.games g ON g.id = p.game_id
  WHERE g.status = 'final'
),
scored AS (
  SELECT
    fp.league_id, fp.user_id, fp.season_id, fp.week, fp.game_id,
    CASE
      WHEN g.winner_team_id = fp.picked_team_id
        THEN COALESCE(ltv.points_value, t.points_value, 1)
      ELSE 0
    END::int AS points
  FROM final_picks fp
  JOIN public.games g ON g.id = fp.game_id
  LEFT JOIN public.league_team_values ltv
    ON ltv.league_id = fp.league_id AND ltv.team_id = fp.picked_team_id
  LEFT JOIN public.teams t ON t.id = fp.picked_team_id
),
agg AS (
  SELECT league_id, user_id, season_id, week, SUM(points)::int AS total_points
  FROM scored
  GROUP BY league_id, user_id, season_id, week
)
INSERT INTO public.scores (league_id, user_id, season_id, week, points, detail)
SELECT a.league_id, a.user_id, a.season_id, a.week, a.total_points,
       jsonb_build_object('calculated_at', NOW())
FROM agg a
ON CONFLICT (league_id, user_id, week) DO UPDATE
SET points = EXCLUDED.points,
    detail = EXCLUDED.detail;
$$;