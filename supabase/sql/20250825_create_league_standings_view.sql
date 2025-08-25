-- Accurate live league standings view derived from picks+games and optional league_team_values
-- Run this in Supabase SQL editor or via migrations.

begin;

create or replace view public.league_standings as
with pick_results as (
  select
    p.league_id,
    p.user_id,
    p.week,
    p.is_bye,
    p.picked_team_id,
    g.status,
    g.winner_team_id
  from public.picks p
  left join public.games g on g.id = p.game_id
),
per_pick as (
  select
    pr.league_id,
    pr.user_id,
    pr.week,
    case
      when pr.is_bye then 0
      when pr.status = 'final' and pr.winner_team_id is not null and pr.picked_team_id = pr.winner_team_id then 1
      else 0
    end as win_flag,
    case
      when pr.is_bye then 0
      when pr.status = 'final' and pr.winner_team_id is not null and pr.picked_team_id <> pr.winner_team_id then 1
      else 0
    end as loss_flag,
    -- points use league override then team base
    case
      when pr.is_bye then 0
      when pr.status = 'final' and pr.winner_team_id is not null and pr.picked_team_id = pr.winner_team_id then
        coalesce(ltv.points_value, t.points_value, 0)
      else 0
    end as points
  from pick_results pr
  left join public.league_team_values ltv
    on ltv.league_id = pr.league_id and ltv.team_id = pr.picked_team_id
  left join public.teams t on t.id = pr.picked_team_id
),
totals as (
  select
    league_id,
    user_id,
    coalesce(sum(points), 0)::int as total_points,
    coalesce(sum(win_flag), 0)::int as wins,
    coalesce(sum(loss_flag), 0)::int as losses
  from per_pick
  group by league_id, user_id
)
select
  lm.league_id,
  lm.user_id,
  coalesce(prf.display_name, 'Member') as display_name,
  coalesce(t.total_points, 0) as total_points,
  coalesce(t.wins, 0) as wins,
  coalesce(t.losses, 0) as losses,
  coalesce(lms.byes_used, 0) as byes_used,
  rank() over (partition by lm.league_id order by coalesce(t.total_points,0) desc) as rank
from public.league_members lm
left join totals t on t.league_id = lm.league_id and t.user_id = lm.user_id
left join public.league_member_state lms on lms.league_id = lm.league_id and lms.user_id = lm.user_id
left join public.profiles prf on prf.user_id = lm.user_id;

commit;
