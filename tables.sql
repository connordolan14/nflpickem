create table public.games (
  id bigint not null,
  season_id bigint not null,
  week integer null,
  home_team_id bigint null,
  away_team_id bigint null,
  kickoff_ts timestamp with time zone null,
  status text not null default 'scheduled'::text,
  winner_team_id bigint null,
  constraint games_pkey primary key (id),
  constraint games_home_team_id_fkey foreign KEY (home_team_id) references teams (id) on delete RESTRICT,
  constraint games_winner_team_id_fkey foreign KEY (winner_team_id) references teams (id) on delete RESTRICT,
  constraint games_season_id_fkey foreign KEY (season_id) references seasons (id) on delete RESTRICT,
  constraint games_away_team_id_fkey foreign KEY (away_team_id) references teams (id) on delete RESTRICT,
  constraint games_status_check check (
    (
      status = any (
        array['scheduled'::text, 'live'::text, 'final'::text]
      )
    )
  ),
  constraint games_home_away_diff check (
    (
      (home_team_id is null)
      or (away_team_id is null)
      or (home_team_id <> away_team_id)
    )
  ),
  constraint games_winner_is_participant check (
    (
      (winner_team_id is null)
      or (winner_team_id = home_team_id)
      or (winner_team_id = away_team_id)
    )
  )
) TABLESPACE pg_default;

create index IF not exists games_season_week_idx on public.games using btree (season_id, week) TABLESPACE pg_default;

create index IF not exists games_kickoff_idx on public.games using btree (kickoff_ts) TABLESPACE pg_default;

create index IF not exists games_status_idx on public.games using btree (status) TABLESPACE pg_default;


create table public.league_member_state (
  id bigserial not null,
  league_id bigint not null,
  user_id uuid not null,
  byes_used integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint league_member_state_pkey primary key (id),
  constraint league_member_state_league_id_user_id_key unique (league_id, user_id),
  constraint league_member_state_league_id_fkey foreign KEY (league_id) references leagues (id) on delete CASCADE,
  constraint league_member_state_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint league_member_state_byes_used_check check (
    (
      (byes_used >= 0)
      and (byes_used <= 4)
    )
  )
) TABLESPACE pg_default;

create index IF not exists lms_idx on public.league_member_state using btree (league_id, user_id) TABLESPACE pg_default;

create trigger t_lms_updated BEFORE
update on league_member_state for EACH row
execute FUNCTION set_current_timestamp_updated_at ();

create table public.league_team_values (
  id bigserial not null,
  league_id bigint null,
  team_id bigint null,
  points_value integer not null,
  created_at timestamp with time zone null default now(),
  constraint league_team_values_pkey primary key (id),
  constraint league_team_values_league_id_team_id_key unique (league_id, team_id),
  constraint league_team_values_league_id_fkey foreign KEY (league_id) references leagues (id) on delete CASCADE,
  constraint league_team_values_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_league_team_values_league_id on public.league_team_values using btree (league_id) TABLESPACE pg_default;

create table public.leagues (
  id bigserial not null,
  name text not null,
  visibility text not null default 'private'::text,
  owner_id uuid not null,
  season_id bigint not null,
  join_code text null,
  rules_json jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  description text null,
  constraint leagues_pkey primary key (id),
  constraint leagues_owner_id_fkey foreign KEY (owner_id) references auth.users (id) on delete CASCADE,
  constraint leagues_season_id_fkey foreign KEY (season_id) references seasons (id) on delete RESTRICT,
  constraint leagues_visibility_check check (
    (
      visibility = any (array['public'::text, 'private'::text])
    )
  )
) TABLESPACE pg_default;

create unique INDEX IF not exists leagues_join_code_uq on public.leagues using btree (join_code) TABLESPACE pg_default;

create index IF not exists leagues_season_idx on public.leagues using btree (season_id) TABLESPACE pg_default;

create table public.picks (
  id bigserial not null,
  league_id bigint not null,
  user_id uuid not null,
  season_id bigint not null,
  week integer not null,
  game_id bigint not null,
  picked_team_id bigint not null,
  source text not null default 'user'::text,
  created_at timestamp with time zone not null default now(),
  locked_at timestamp with time zone null,
  slot_number integer null,
  is_bye boolean null default false,
  constraint picks_pkey primary key (id),
  constraint picks_league_id_user_id_game_id_key unique (league_id, user_id, game_id),
  constraint picks_season_id_fkey foreign KEY (season_id) references seasons (id) on delete RESTRICT,
  constraint picks_league_id_fkey foreign KEY (league_id) references leagues (id) on delete CASCADE,
  constraint picks_picked_team_id_fkey foreign KEY (picked_team_id) references teams (id),
  constraint picks_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint picks_source_check check (
    (
      source = any (
        array[
          'user'::text,
          'auto_bye'::text,
          'forfeit'::text,
          'admin'::text
        ]
      )
    )
  ),
  constraint picks_week_check check (
    (
      (week >= 1)
      and (week <= 18)
    )
  ),
  constraint picks_slot_number_check check ((slot_number = any (array[1, 2])))
) TABLESPACE pg_default;

create index IF not exists picks_week_idx on public.picks using btree (league_id, user_id, week) TABLESPACE pg_default;

create index IF not exists picks_team_idx on public.picks using btree (league_id, user_id, picked_team_id) TABLESPACE pg_default;

create unique INDEX IF not exists ux_user_team_once_per_season on public.picks using btree (league_id, user_id, season_id, picked_team_id) TABLESPACE pg_default
where
  (source = any (array['user'::text, 'admin'::text]));

create index IF not exists idx_picks_user_league_week on public.picks using btree (user_id, league_id, week) TABLESPACE pg_default;

create index IF not exists idx_picks_league_week on public.picks using btree (league_id, week) TABLESPACE pg_default;

create trigger t_picks_biu BEFORE INSERT
or
update on picks for EACH row
execute FUNCTION picks_before_insert_update ();

create table public.profiles (
  user_id uuid not null,
  display_name text not null,
  created_at timestamp with time zone not null default now(),
  avatar_url text null,
  constraint profiles_pkey primary key (user_id),
  constraint profiles_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.scores (
  id bigserial not null,
  league_id bigint not null,
  user_id uuid not null,
  season_id bigint not null,
  week integer not null,
  points integer not null,
  detail jsonb not null,
  created_at timestamp with time zone not null default now(),
  constraint scores_pkey primary key (id),
  constraint scores_league_id_user_id_week_key unique (league_id, user_id, week),
  constraint scores_league_id_fkey foreign KEY (league_id) references leagues (id) on delete CASCADE,
  constraint scores_season_id_fkey foreign KEY (season_id) references seasons (id) on delete RESTRICT,
  constraint scores_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists scores_week_idx on public.scores using btree (league_id, week) TABLESPACE pg_default;

create index IF not exists idx_scores_league_user on public.scores using btree (league_id, user_id) TABLESPACE pg_default;

create table public.seasons (
  id bigserial not null,
  year integer not null,
  is_active boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint seasons_pkey primary key (id),
  constraint seasons_year_key unique (year)
) TABLESPACE pg_default;

create table public.teams (
  id bigserial not null,
  season_id bigint not null,
  nfl_team_code text not null,
  display_name text not null,
  points_value integer not null default 0,
  logo text null,
  constraint teams_pkey primary key (id),
  constraint teams_points_value_unique unique (points_value),
  constraint teams_season_id_nfl_team_code_key unique (season_id, nfl_team_code),
  constraint teams_season_id_fkey foreign KEY (season_id) references seasons (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists teams_season_idx on public.teams using btree (season_id) TABLESPACE pg_default;