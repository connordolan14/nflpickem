-- Toggle OFF: Remove allow-all policies for Unrestricted tables (league_members, picks, teams)

-- Picks
DROP POLICY IF EXISTS "picks_allow_all" ON public.picks;

-- Teams
DROP POLICY IF EXISTS "teams_allow_all" ON public.teams;

-- League members
DROP POLICY IF EXISTS "league_members_allow_all" ON public.league_members;
