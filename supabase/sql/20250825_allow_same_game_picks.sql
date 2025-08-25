-- Allow two picks from the same game by the same user in a week
-- 1) Drop the per-game unique constraint
alter table public.picks drop constraint if exists picks_league_id_user_id_game_id_key;

-- 2) Ensure at most two non-bye picks per week by slot uniqueness
create unique index if not exists ux_picks_week_slot_unique
  on public.picks (league_id, user_id, season_id, week, slot_number)
  where is_bye = false and slot_number is not null;

-- (Already present) unique bye per week is handled by ux_picks_single_bye_per_week created earlier.
-- (Already present) unique team per season is enforced by ux_user_team_once_per_season.
