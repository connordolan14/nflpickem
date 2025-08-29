-- RLS policies designed to restore app functionality without recursion.
-- Principles:
--  - Avoid cross-table references inside policies (no EXISTS on other tables)
--  - Use public.is_admin() only on tables other than profiles
--  - Grant sensible INSERT/UPDATE/DELETE for self-owned rows

-- Enable RLS (no-op if already enabled)
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

-- Helper policy: allow admins to do anything on leagues
-- Leagues: SELECT if public, or owner, or admin.
-- INSERT only by owner (self). Update/Delete by owner or admin.
DROP POLICY IF EXISTS "leagues_select_public_owner_admin" ON public.leagues;
CREATE POLICY "leagues_select_public_owner_admin"
ON public.leagues
FOR SELECT
USING (
	visibility = 'public' OR owner_id = auth.uid() OR public.is_admin()
);

-- Also allow selecting leagues where the user is a member (safe: one-way reference)
DROP POLICY IF EXISTS "leagues_select_member" ON public.leagues;
CREATE POLICY "leagues_select_member"
ON public.leagues
FOR SELECT
USING (
	EXISTS (
		SELECT 1 FROM public.league_members lm
		WHERE lm.league_id = leagues.id AND lm.user_id = auth.uid()
	)
);

-- Allow selecting a league by join_code specifically for join flow
DROP POLICY IF EXISTS "leagues_select_by_join_code" ON public.leagues;
CREATE POLICY "leagues_select_by_join_code"
ON public.leagues
FOR SELECT
USING (
	join_code IS NOT NULL AND join_code = current_setting('request.jwt.claim.supabase.claims'::text, true)::jsonb->>'join_code_bypass' OR
	visibility = 'public' OR owner_id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "leagues_insert_owner_only" ON public.leagues;
CREATE POLICY "leagues_insert_owner_only"
ON public.leagues
FOR INSERT
WITH CHECK (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "leagues_update_owner_admin" ON public.leagues;
CREATE POLICY "leagues_update_owner_admin"
ON public.leagues
FOR UPDATE
USING (owner_id = auth.uid() OR public.is_admin())
WITH CHECK (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "leagues_delete_owner_admin" ON public.leagues;
CREATE POLICY "leagues_delete_owner_admin"
ON public.leagues
FOR DELETE
USING (owner_id = auth.uid() OR public.is_admin());

-- (Removed) Non-admin read policy. Add back if you want owner/member access.

-- Optional: restrict inserts/updates for non-admins to their own leagues
-- Uncomment if needed
-- DROP POLICY IF EXISTS "leagues_modify_owner_only" ON public.leagues;
-- CREATE POLICY "leagues_modify_owner_only"
-- ON public.leagues
-- FOR INSERT
-- WITH CHECK (owner_id = auth.uid());
--
-- CREATE POLICY "leagues_update_owner_only"
-- ON public.leagues
-- FOR UPDATE
-- USING (owner_id = auth.uid())
-- WITH CHECK (owner_id = auth.uid());

-- ==============================
-- Admin SELECT for other tables
-- ==============================

-- Picks
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "picks_select_self_or_admin" ON public.picks;
CREATE POLICY "picks_select_self_or_admin"
ON public.picks
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "picks_insert_self_only" ON public.picks;
CREATE POLICY "picks_insert_self_only"
ON public.picks
FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "picks_update_self_or_admin" ON public.picks;
CREATE POLICY "picks_update_self_or_admin"
ON public.picks
FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "picks_delete_self_or_admin" ON public.picks;
CREATE POLICY "picks_delete_self_or_admin"
ON public.picks
FOR DELETE
USING (user_id = auth.uid() OR public.is_admin());

-- Games: public read
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "games_select_all" ON public.games;
CREATE POLICY "games_select_all"
ON public.games
FOR SELECT
USING (true);

-- Teams: public read, admin update
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teams_select_all" ON public.teams;
CREATE POLICY "teams_select_all"
ON public.teams
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "teams_update_admin_only" ON public.teams;
CREATE POLICY "teams_update_admin_only"
ON public.teams
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Avoid recursion: do NOT use is_admin() here. Allow SELECT for all to restore display of names.
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
ON public.profiles
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "profiles_insert_self_only" ON public.profiles;
CREATE POLICY "profiles_insert_self_only"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_self_only" ON public.profiles;
CREATE POLICY "profiles_update_self_only"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- League members
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "league_members_select_self_or_admin" ON public.league_members;
CREATE POLICY "league_members_select_self_or_admin"
ON public.league_members
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "league_members_insert_self_only" ON public.league_members;
CREATE POLICY "league_members_insert_self_only"
ON public.league_members
FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "league_members_delete_self_or_admin" ON public.league_members;
CREATE POLICY "league_members_delete_self_or_admin"
ON public.league_members
FOR DELETE
USING (user_id = auth.uid() OR public.is_admin());

-- League member state
ALTER TABLE public.league_member_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "league_member_state_select_self_or_admin" ON public.league_member_state;
CREATE POLICY "league_member_state_select_self_or_admin"
ON public.league_member_state
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "league_member_state_insert_self_only" ON public.league_member_state;
CREATE POLICY "league_member_state_insert_self_only"
ON public.league_member_state
FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "league_member_state_update_self_or_admin" ON public.league_member_state;
CREATE POLICY "league_member_state_update_self_or_admin"
ON public.league_member_state
FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Scores: public read to restore standings
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scores_select_all" ON public.scores;
CREATE POLICY "scores_select_all"
ON public.scores
FOR SELECT
USING (true);

-- Seasons: public read
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seasons_select_all" ON public.seasons;
CREATE POLICY "seasons_select_all"
ON public.seasons
FOR SELECT
USING (true);

-- League team values: public read
ALTER TABLE public.league_team_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "league_team_values_select_all" ON public.league_team_values;
CREATE POLICY "league_team_values_select_all"
ON public.league_team_values
FOR SELECT
USING (true);
