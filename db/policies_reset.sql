-- One-shot reset to remove existing policies on core tables and reapply safe, non-recursive policies
-- Run this in the Supabase SQL editor. It relies on plpgsql DO blocks to drop any existing policies.

-- 0) Ensure helper exists (run db/functions.sql separately first if needed)
-- CREATE OR REPLACE FUNCTION public.is_admin() ... (already provided in db/functions.sql)

-- 1) Drop all policies for selected tables
DO $$
DECLARE 
  rec record;
BEGIN
  FOR rec IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','league_members','league_member_state','leagues',
        'picks','games','teams','scores','seasons','league_team_values'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  END LOOP;
END $$;

-- 2) Enable RLS on all
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_member_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_team_values ENABLE ROW LEVEL SECURITY;

-- 3) Reapply minimal, non-recursive policies (baseline functionality first)

-- Profiles: open read, self-only write
CREATE POLICY profiles_select_all
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY profiles_insert_self_only
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_update_self_only
ON public.profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- League members: members of the league or admin can read; insert/delete remain self/admin
DROP POLICY IF EXISTS league_members_select_self_or_admin ON public.league_members;
CREATE POLICY league_members_select_member_or_admin
ON public.league_members FOR SELECT
USING (public.is_member_of_league(league_id) OR public.is_admin());

CREATE POLICY league_members_insert_self_or_admin
ON public.league_members FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY league_members_delete_self_or_admin
ON public.league_members FOR DELETE
USING (user_id = auth.uid() OR public.is_admin());

-- League member state: league members or admin can read; writes stay self/admin
DROP POLICY IF EXISTS league_member_state_select_self_or_admin ON public.league_member_state;
CREATE POLICY league_member_state_select_member_or_admin
ON public.league_member_state FOR SELECT
USING (public.is_member_of_league(league_id) OR public.is_admin());

CREATE POLICY league_member_state_insert_self_or_admin
ON public.league_member_state FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY league_member_state_update_self_or_admin
ON public.league_member_state FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Leagues: open read; writes constrained to owner/admin
CREATE POLICY leagues_select_all
ON public.leagues FOR SELECT
USING (true);

CREATE POLICY leagues_insert_owner_or_admin
ON public.leagues FOR INSERT
WITH CHECK (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY leagues_update_owner_admin
ON public.leagues FOR UPDATE
USING (owner_id = auth.uid() OR public.is_admin())
WITH CHECK (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY leagues_delete_owner_admin
ON public.leagues FOR DELETE
USING (owner_id = auth.uid() OR public.is_admin());

-- Picks: league members or admin can read; writes remain self/admin
DROP POLICY IF EXISTS picks_select_self_or_admin ON public.picks;
CREATE POLICY picks_select_member_or_admin
ON public.picks FOR SELECT
USING (public.is_member_of_league(league_id) OR public.is_admin());

CREATE POLICY picks_insert_self_or_admin
ON public.picks FOR INSERT
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY picks_update_self_or_admin
ON public.picks FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Games: open read
CREATE POLICY games_select_all
ON public.games FOR SELECT
USING (true);

-- Teams: open read; admin-only update (defaults editor)
CREATE POLICY teams_select_all
ON public.teams FOR SELECT
USING (true);
CREATE POLICY teams_update_admin_only
ON public.teams FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Scores: open read (standings)
CREATE POLICY scores_select_all
ON public.scores FOR SELECT
USING (true);

-- Seasons: open read
CREATE POLICY seasons_select_all
ON public.seasons FOR SELECT
USING (true);

-- League team values: open read
CREATE POLICY league_team_values_select_all
ON public.league_team_values FOR SELECT
USING (true);

-- League team values: writes allowed to league owner or admin
DROP POLICY IF EXISTS league_team_values_insert_owner_admin ON public.league_team_values;
CREATE POLICY league_team_values_insert_owner_admin
ON public.league_team_values FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leagues l
    WHERE l.id = league_team_values.league_id
      AND (l.owner_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS league_team_values_update_owner_admin ON public.league_team_values;
CREATE POLICY league_team_values_update_owner_admin
ON public.league_team_values FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.leagues l
    WHERE l.id = league_team_values.league_id
      AND (l.owner_id = auth.uid() OR public.is_admin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leagues l
    WHERE l.id = league_team_values.league_id
      AND (l.owner_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS league_team_values_delete_owner_admin ON public.league_team_values;
CREATE POLICY league_team_values_delete_owner_admin
ON public.league_team_values FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.leagues l
    WHERE l.id = league_team_values.league_id
      AND (l.owner_id = auth.uid() OR public.is_admin())
  )
);
