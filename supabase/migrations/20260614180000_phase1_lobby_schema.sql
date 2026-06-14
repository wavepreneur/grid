-- =============================================================================
-- GRID Phase 1: Zero-Auth Lobby & Team-Setup
-- Run in Supabase SQL Editor (Dashboard) or via: supabase db push
-- =============================================================================
-- Design notes:
--   • players have NO auth.users FK (Zero-Auth for participants)
--   • events.created_by is optional (B2B admin auth comes later)
--   • teams.join_code enables multi-team events (10k+ scale)
--   • JSONB extension columns prepare Phase 3 without premature tables
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.grid_event_status as enum (
    'draft',
    'lobby',
    'active',
    'completed',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.grid_team_status as enum (
    'setup',      -- captain configuring team size/name/metadata
    'lobby',      -- waiting for members / countdown
    'playing',
    'finished',
    'disbanded'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1) events — B2B game instances (one company run / one game session)
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),

  -- Optional until admin dashboard + Supabase Auth for B2B users exist
  created_by uuid references auth.users (id) on delete set null,

  title text not null,
  organization_name text,

  -- Public entry point: /join/{invite_code}
  invite_code text not null,

  status public.grid_event_status not null default 'draft',

  -- Capacity controls (null max_teams = unlimited)
  max_teams integer check (max_teams is null or max_teams > 0),
  max_players_per_team integer not null default 8
    check (max_players_per_team between 1 and 8),

  -- Phase 1: auto-start lobby after 3 minutes (captain can start earlier)
  lobby_auto_start_seconds integer not null default 180
    check (lobby_auto_start_seconds > 0),

  scheduled_start_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,

  -- Phase 3 extension points (custom routes / content overrides per event)
  content_config jsonb not null default '{}'::jsonb,
  route_override jsonb not null default '{}'::jsonb,

  settings jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_invite_code_format check (invite_code ~ '^[A-Z0-9]{6,12}$')
);

create unique index if not exists events_invite_code_key
  on public.events (invite_code);

create index if not exists events_status_idx
  on public.events (status);

create index if not exists events_created_by_idx
  on public.events (created_by)
  where created_by is not null;

-- ---------------------------------------------------------------------------
-- 2) teams — groups of 1–8 players within an event
-- ---------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,

  -- Teammate entry point after captain setup: /join/{invite_code}?team={join_code}
  join_code text not null,

  name text not null,
  max_size integer not null check (max_size between 1 and 8),

  -- HR metadata selected by captain (Phase 4 aggregates via team_id)
  department text,
  region text,
  metadata jsonb not null default '{}'::jsonb,

  status public.grid_team_status not null default 'setup',

  lobby_opened_at timestamptz,
  lobby_auto_start_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,

  -- Phase 2 extension (game sync state lives here)
  current_level integer not null default 0 check (current_level >= 0),
  game_state jsonb not null default '{}'::jsonb,

  -- Set after captain player row is created
  captain_player_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint teams_join_code_format check (join_code ~ '^[A-Z0-9]{4,8}$')
);

create unique index if not exists teams_join_code_key
  on public.teams (join_code);

create index if not exists teams_event_id_idx
  on public.teams (event_id);

create index if not exists teams_event_status_idx
  on public.teams (event_id, status);

create index if not exists teams_lobby_auto_start_idx
  on public.teams (lobby_auto_start_at)
  where status = 'lobby' and lobby_auto_start_at is not null;

-- ---------------------------------------------------------------------------
-- 3) players — anonymous / pseudonymous participants (NO auth.users)
-- ---------------------------------------------------------------------------

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,

  -- Client-held session credential (localStorage). NOT Supabase Auth.
  session_id uuid not null default gen_random_uuid(),

  display_name text not null,
  is_captain boolean not null default false,

  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,

  -- Phase 4: set when pseudonym is scrubbed post-event
  anonymized_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint players_display_name_length check (char_length(display_name) between 2 and 32),
  constraint players_display_name_trim check (display_name = btrim(display_name))
);

alter table public.teams
  drop constraint if exists teams_captain_player_id_fkey;

alter table public.teams
  add constraint teams_captain_player_id_fkey
  foreign key (captain_player_id)
  references public.players (id)
  on delete set null;

create unique index if not exists players_session_id_key
  on public.players (session_id);

create index if not exists players_team_id_idx
  on public.players (team_id);

create index if not exists players_team_active_idx
  on public.players (team_id)
  where left_at is null;

-- One active display name per team (case-insensitive)
create unique index if not exists players_team_display_name_active_key
  on public.players (team_id, lower(display_name))
  where left_at is null and anonymized_at is null;

-- Exactly one active captain per team
create unique index if not exists players_one_active_captain_per_team_key
  on public.players (team_id)
  where is_captain = true and left_at is null;

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

create or replace function public.enforce_team_capacity()
returns trigger
language plpgsql
as $$
declare
  active_count integer;
  team_max integer;
  event_max integer;
begin
  if tg_op = 'UPDATE' and new.left_at is not null and old.left_at is null then
    return new;
  end if;

  if new.left_at is not null then
    return new;
  end if;

  select t.max_size, e.max_players_per_team
  into team_max, event_max
  from public.teams t
  join public.events e on e.id = t.event_id
  where t.id = new.team_id;

  select count(*)::integer
  into active_count
  from public.players p
  where p.team_id = new.team_id
    and p.left_at is null
    and (tg_op = 'INSERT' or p.id <> new.id);

  if active_count >= team_max then
    raise exception 'Team % is full (max % players)', new.team_id, team_max;
  end if;

  if team_max > event_max then
    raise exception 'Team max_size (%) exceeds event max_players_per_team (%)', team_max, event_max;
  end if;

  return new;
end;
$$;

drop trigger if exists players_enforce_team_capacity on public.players;
create trigger players_enforce_team_capacity
before insert or update on public.players
for each row
execute function public.enforce_team_capacity();

create or replace function public.sync_team_captain_reference()
returns trigger
language plpgsql
as $$
begin
  if new.is_captain = true and new.left_at is null then
    update public.teams
    set captain_player_id = new.id,
        updated_at = now()
    where id = new.team_id;
  end if;

  return new;
end;
$$;

drop trigger if exists players_sync_team_captain on public.players;
create trigger players_sync_team_captain
after insert or update of is_captain, left_at on public.players
for each row
execute function public.sync_team_captain_reference();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
before update on public.teams
for each row
execute function public.set_updated_at();

drop trigger if exists players_set_updated_at on public.players;
create trigger players_set_updated_at
before update on public.players
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (Phase 1: locked down; access via Next.js service role)
-- Phase 2 will add session-scoped Realtime policies.
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;

drop policy if exists events_service_role_all on public.events;
create policy events_service_role_all
  on public.events
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists teams_service_role_all on public.teams;
create policy teams_service_role_all
  on public.teams
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists players_service_role_all on public.players;
create policy players_service_role_all
  on public.players
  for all
  to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Realtime (Phase 2 prep — safe to enable now)
-- ---------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.teams;
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.players;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Helpful view for lobby UI (optional)
-- ---------------------------------------------------------------------------

create or replace view public.team_lobby_snapshot as
select
  t.id as team_id,
  t.event_id,
  t.join_code,
  t.name as team_name,
  t.max_size,
  t.department,
  t.region,
  t.status as team_status,
  t.lobby_opened_at,
  t.lobby_auto_start_at,
  t.captain_player_id,
  count(p.id) filter (where p.left_at is null) as active_player_count,
  coalesce(
    json_agg(
      json_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'is_captain', p.is_captain,
        'joined_at', p.joined_at
      )
      order by p.joined_at
    ) filter (where p.left_at is null),
    '[]'::json
  ) as players
from public.teams t
left join public.players p on p.team_id = t.id
group by t.id;

comment on table public.events is
  'B2B game instance. invite_code is the public event entry slug.';
comment on table public.teams is
  'Player group (1-8). join_code lets teammates enter the captain lobby.';
comment on table public.players is
  'Zero-Auth participant. session_id is the client credential, not auth.users.';
comment on column public.players.session_id is
  'UUID stored client-side (localStorage). Used to re-identify the player without Supabase Auth.';
comment on column public.events.content_config is
  'Phase 3: per-event content template references and settings.';
comment on column public.events.route_override is
  'Phase 3: admin-defined GPS points and quiz overrides for this event.';
comment on column public.teams.metadata is
  'Phase 4: extensible HR-safe metadata copied into interaction logs.';
