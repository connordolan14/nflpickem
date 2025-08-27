-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.games (
  id bigint NOT NULL,
  season_id bigint NOT NULL,
  week integer,
  home_team_id bigint,
  away_team_id bigint,
  kickoff_ts timestamp with time zone,
  status text NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'live'::text, 'final'::text])),
  winner_team_id bigint,
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES public.teams(id),
  CONSTRAINT games_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES public.teams(id),
  CONSTRAINT games_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id),
  CONSTRAINT games_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id)
);
CREATE TABLE public.league_member_state (
  id bigint NOT NULL DEFAULT nextval('league_member_state_id_seq'::regclass),
  league_id bigint NOT NULL,
  user_id uuid NOT NULL,
  byes_used integer NOT NULL DEFAULT 0 CHECK (byes_used >= 0 AND byes_used <= 4),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT league_member_state_pkey PRIMARY KEY (id),
  CONSTRAINT league_member_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT league_member_state_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id)
);
CREATE TABLE public.league_members (
  id bigint NOT NULL DEFAULT nextval('league_members_id_seq'::regclass),
  league_id bigint NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['member'::text, 'admin'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT league_members_pkey PRIMARY KEY (id),
  CONSTRAINT league_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT league_members_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id),
  CONSTRAINT league_members_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
);
CREATE TABLE public.league_team_values (
  id bigint NOT NULL DEFAULT nextval('league_team_values_id_seq'::regclass),
  league_id bigint,
  team_id bigint,
  points_value integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT league_team_values_pkey PRIMARY KEY (id),
  CONSTRAINT league_team_values_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT league_team_values_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id)
);
CREATE TABLE public.leagues (
  id bigint NOT NULL DEFAULT nextval('leagues_id_seq'::regclass),
  name text NOT NULL,
  visibility text NOT NULL DEFAULT 'private'::text CHECK (visibility = ANY (ARRAY['public'::text, 'private'::text])),
  owner_id uuid NOT NULL,
  season_id bigint NOT NULL,
  join_code text,
  rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  CONSTRAINT leagues_pkey PRIMARY KEY (id),
  CONSTRAINT leagues_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT leagues_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id)
);
CREATE TABLE public.picks (
  id bigint NOT NULL DEFAULT nextval('picks_id_seq'::regclass),
  league_id bigint NOT NULL,
  user_id uuid NOT NULL,
  season_id bigint NOT NULL,
  week integer NOT NULL CHECK (week >= 1 AND week <= 18),
  game_id bigint,
  picked_team_id bigint,
  source text NOT NULL DEFAULT 'user'::text CHECK (source = ANY (ARRAY['user'::text, 'auto_bye'::text, 'forfeit'::text, 'admin'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  locked_at timestamp with time zone,
  slot_number integer CHECK (slot_number = ANY (ARRAY[1, 2])),
  is_bye boolean DEFAULT false,
  CONSTRAINT picks_pkey PRIMARY KEY (id),
  CONSTRAINT picks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT picks_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id),
  CONSTRAINT picks_picked_team_id_fkey FOREIGN KEY (picked_team_id) REFERENCES public.teams(id),
  CONSTRAINT picks_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id),
  CONSTRAINT picks_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id)
);
CREATE TABLE public.profiles (
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  avatar_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.scores (
  id bigint NOT NULL DEFAULT nextval('scores_id_seq'::regclass),
  league_id bigint NOT NULL,
  user_id uuid NOT NULL,
  season_id bigint NOT NULL,
  week integer NOT NULL,
  points integer NOT NULL,
  detail jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT scores_pkey PRIMARY KEY (id),
  CONSTRAINT scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT scores_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id),
  CONSTRAINT scores_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id)
);
CREATE TABLE public.seasons (
  id bigint NOT NULL DEFAULT nextval('seasons_id_seq'::regclass),
  year integer NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT seasons_pkey PRIMARY KEY (id)
);
CREATE TABLE public.teams (
  id bigint NOT NULL DEFAULT nextval('teams_id_seq'::regclass),
  season_id bigint NOT NULL,
  nfl_team_code text NOT NULL,
  display_name text NOT NULL,
  points_value integer NOT NULL DEFAULT 0 UNIQUE,
  logo text,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id)
);