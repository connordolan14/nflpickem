-- Allow bye rows in picks by relaxing NOT NULLs and adding a safety unique constraint
-- Run this in your Supabase SQL editor or migrations

begin;

-- 1) Allow bye rows (is_bye = true) to store NULL game_id and picked_team_id
alter table public.picks
  alter column game_id drop not null,
  alter column picked_team_id drop not null;

-- 2) Ensure only one bye row per user/week (still allow up to 2 game picks via slot_number)
create unique index if not exists ux_picks_single_bye_per_week
  on public.picks (league_id, user_id, season_id, week)
  where is_bye = true;

-- 3) Optional: tighten slot_number for byes (leave NULL)
-- No change needed; existing check allows NULL as it only enforces 1 or 2 when provided.

commit;
