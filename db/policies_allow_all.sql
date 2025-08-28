-- Toggle ON: Add allow-all policies for specific Unrestricted tables
-- (league_members, picks, teams) so the Supabase UI stops marking them as Unrestricted.
-- These policies keep behavior open while RLS is enabled.

-- Picks
DROP POLICY IF EXISTS "picks_allow_all" ON public.picks;
CREATE POLICY "picks_allow_all"
ON public.picks
FOR ALL
USING (true)
WITH CHECK (true);

-- Teams
DROP POLICY IF EXISTS "teams_allow_all" ON public.teams;
CREATE POLICY "teams_allow_all"
ON public.teams
FOR ALL
USING (true)
WITH CHECK (true);

-- League members
DROP POLICY IF EXISTS "league_members_allow_all" ON public.league_members;
CREATE POLICY "league_members_allow_all"
ON public.league_members
FOR ALL
USING (true)
WITH CHECK (true);
