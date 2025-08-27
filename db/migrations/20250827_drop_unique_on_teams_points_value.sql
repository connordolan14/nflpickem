-- Allow duplicate default point values for teams
-- Safe to run multiple times

begin;

-- Drop the UNIQUE constraint if it exists
alter table if exists public.teams
  drop constraint if exists teams_points_value_unique;

-- Some setups may have created a unique index with the same name; drop it if present
drop index if exists public.teams_points_value_unique;

-- Optional: keep a non-unique index to speed up reads on points_value
create index if not exists teams_points_value_idx on public.teams(points_value);

commit;
