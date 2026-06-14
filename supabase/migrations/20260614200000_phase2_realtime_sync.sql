-- =============================================================================
-- GRID Phase 2: Realtime State-Engine & Sync
-- Run in Supabase SQL Editor after Phase 1 migration.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Sync event log (append-only, Realtime-friendly)
-- ---------------------------------------------------------------------------

create table if not exists public.team_sync_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  sequence bigint generated always as identity,
  event_type text not null,
  level integer,
  payload jsonb not null default '{}'::jsonb,
  actor_player_id uuid references public.players (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint team_sync_events_event_type_check check (
    event_type in (
      'game_started',
      'level_completed',
      'modal_cleared',
      'game_finished'
    )
  )
);

create index if not exists team_sync_events_team_sequence_idx
  on public.team_sync_events (team_id, sequence desc);

create index if not exists team_sync_events_team_created_idx
  on public.team_sync_events (team_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Session-scoped JWT helper for Zero-Auth Realtime (Phase 2)
-- ---------------------------------------------------------------------------

create or replace function public.auth_player_session_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'session_id', '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- RLS: authenticated players read their team via session_id JWT claim
-- (Writes remain service_role via Next.js Server Actions)
-- ---------------------------------------------------------------------------

drop policy if exists teams_player_session_select on public.teams;
create policy teams_player_session_select
  on public.teams
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.players p
      where p.team_id = teams.id
        and p.session_id = public.auth_player_session_id()
        and p.left_at is null
    )
  );

drop policy if exists players_teammates_select on public.players;
create policy players_teammates_select
  on public.players
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.players me
      where me.team_id = players.team_id
        and me.session_id = public.auth_player_session_id()
        and me.left_at is null
    )
  );

drop policy if exists team_sync_events_player_session_select on public.team_sync_events;
create policy team_sync_events_player_session_select
  on public.team_sync_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.players p
      where p.team_id = team_sync_events.team_id
        and p.session_id = public.auth_player_session_id()
        and p.left_at is null
    )
  );

alter table public.team_sync_events enable row level security;

drop policy if exists team_sync_events_service_role_all on public.team_sync_events;
create policy team_sync_events_service_role_all
  on public.team_sync_events
  for all
  to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.team_sync_events;
exception
  when duplicate_object then null;
end $$;

-- REPLICA IDENTITY FULL helps Realtime deliver complete row payloads on UPDATE.
alter table public.teams replica identity full;
alter table public.players replica identity full;

comment on table public.team_sync_events is
  'Append-only team state events for Realtime sync. Not the B2B events table.';
comment on column public.team_sync_events.event_type is
  'Sync event type. Analytics in Phase 4 use interaction_logs separately.';
