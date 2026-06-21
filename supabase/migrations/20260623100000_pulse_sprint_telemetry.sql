-- Pulse-Sprint Protocol + unified domain telemetry (sync_live vs async_pulse)
-- REST-first micro-pulses; no WebSocket requirement for pulse_sessions.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.grid_play_mode as enum ('sync_live', 'async_pulse');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.pulse_channel as enum ('slack', 'msteams', 'web', 'api');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.pulse_session_status as enum (
    'draft', 'active', 'completed', 'archived', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.telemetry_source_type as enum (
    'event', 'team', 'player', 'pulse_session', 'pulse_player', 'program'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Macro events: mark sync live mode (Exitmania / Tabbrain 90-min rooms)
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists play_mode public.grid_play_mode not null default 'sync_live';

comment on column public.events.play_mode is
  'sync_live = WebSocket FSM rooms (Exitmania/Tabbrain macro). async_pulse uses pulse_sessions instead.';

-- ---------------------------------------------------------------------------
-- pulse_programs — B2B ARR container (year-long org landing, weekly streak)
-- ---------------------------------------------------------------------------

create table if not exists public.pulse_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  title text not null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'archived')),
  landing_config jsonb not null default '{}'::jsonb,
  streak_interval_days integer not null default 7 check (streak_interval_days between 1 and 30),
  default_duration_minutes integer not null default 10 check (default_duration_minutes between 5 and 30),
  content_envelope jsonb not null default '{}'::jsonb,
  booking_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists pulse_programs_organization_id_idx
  on public.pulse_programs (organization_id, status);

-- ---------------------------------------------------------------------------
-- pulse_sessions — Micro-Pulse rooms (REST-only progress, no permanent WS)
-- ---------------------------------------------------------------------------

create table if not exists public.pulse_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  program_id uuid references public.pulse_programs (id) on delete set null,
  pulse_code text not null,
  title text not null,
  status public.pulse_session_status not null default 'draft',
  play_mode public.grid_play_mode not null default 'async_pulse',
  channel public.pulse_channel not null default 'web',
  duration_minutes integer not null default 10 check (duration_minutes between 5 and 30),
  content_envelope jsonb not null default '{}'::jsonb,
  external_workspace_id text,
  external_channel_id text,
  external_thread_id text,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  booking_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pulse_sessions_pulse_code_format check (pulse_code ~ '^[A-Z0-9-]{4,32}$')
);

create unique index if not exists pulse_sessions_pulse_code_uidx
  on public.pulse_sessions (pulse_code);

create index if not exists pulse_sessions_org_status_idx
  on public.pulse_sessions (organization_id, status, scheduled_at desc);

create unique index if not exists pulse_sessions_org_booking_reference_uidx
  on public.pulse_sessions (organization_id, booking_reference)
  where booking_reference is not null;

-- ---------------------------------------------------------------------------
-- pulse_player_states — Stateless REST snapshots (POST progress, no WS)
-- ---------------------------------------------------------------------------

create table if not exists public.pulse_player_states (
  id uuid primary key default gen_random_uuid(),
  pulse_session_id uuid not null references public.pulse_sessions (id) on delete cascade,
  player_ref text not null,
  display_name text,
  department text,
  region text,
  country text,
  progress_state jsonb not null default '{}'::jsonb,
  metrics_snapshot jsonb not null default '{}'::jsonb,
  score numeric not null default 0,
  streak_count integer not null default 0,
  last_pulse_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pulse_player_states_player_ref_nonempty check (char_length(trim(player_ref)) >= 2),
  unique (pulse_session_id, player_ref)
);

create index if not exists pulse_player_states_session_idx
  on public.pulse_player_states (pulse_session_id, last_pulse_at desc);

-- ---------------------------------------------------------------------------
-- domain_telemetry_metrics — Master analytics (sync + async unified envelope)
-- ---------------------------------------------------------------------------

create table if not exists public.domain_telemetry_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  play_mode public.grid_play_mode not null,
  metric_key text not null,
  metric_value numeric,
  source_type public.telemetry_source_type not null,
  source_id uuid not null,
  event_id uuid references public.events (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  pulse_session_id uuid references public.pulse_sessions (id) on delete set null,
  pulse_player_state_id uuid references public.pulse_player_states (id) on delete set null,
  department text,
  region text,
  country text,
  telemetry_envelope jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists domain_telemetry_metrics_org_recorded_idx
  on public.domain_telemetry_metrics (organization_id, recorded_at desc);

create index if not exists domain_telemetry_metrics_play_mode_key_idx
  on public.domain_telemetry_metrics (organization_id, play_mode, metric_key, recorded_at desc);

create index if not exists domain_telemetry_metrics_department_idx
  on public.domain_telemetry_metrics (organization_id, department, recorded_at desc)
  where department is not null;

-- ---------------------------------------------------------------------------
-- Unified telemetry envelope (documented contract — both play modes)
-- ---------------------------------------------------------------------------
--
-- telemetry_envelope / content_envelope JSON shape (schema_version 1):
-- {
--   "schema_version": 1,
--   "play_mode": "sync_live" | "async_pulse",
--   "blueprint_slug": "exitmania" | "tabbrain" | "pulse",
--   "archetype": "ASYMMETRIC_INFORMANT" | "TIME_DECAY_SPRINT" | "COOPERATIVE_COLLECTIVE" | "PULSE_SPRINT",
--   "duration_minutes": 90 | 10,
--   "channel": "slack" | "msteams" | "web" | "api" | null,
--   "content_config": { ... },
--   "route_override": { ... },
--   "performance": {
--     "stress_index": 0.0-1.0,           -- sync macro stress (90 min)
--     "collaboration_streak": 0.0-1.0,   -- async micro pulse cadence
--     "intelligence_score_delta": number  -- stress_index - streak baseline
--   }
-- }

comment on table public.pulse_programs is
  'B2B ARR program container: org landing + recurring weekly micro-pulses.';

comment on table public.pulse_sessions is
  'Micro-Pulse room (default 10 min). Progress via REST POST only — no permanent WebSocket.';

comment on table public.pulse_player_states is
  'Stateless player progress snapshots for async pulses (Slack/Teams/web).';

comment on table public.domain_telemetry_metrics is
  'Master analytics: consolidates sync_live (FSM/WebSocket) and async_pulse (REST) under one envelope.';

-- ---------------------------------------------------------------------------
-- RLS — service role only (same pattern as events/audit_logs)
-- ---------------------------------------------------------------------------

alter table public.pulse_programs enable row level security;
alter table public.pulse_sessions enable row level security;
alter table public.pulse_player_states enable row level security;
alter table public.domain_telemetry_metrics enable row level security;

drop policy if exists pulse_programs_service_role_all on public.pulse_programs;
create policy pulse_programs_service_role_all
  on public.pulse_programs for all to service_role
  using (true) with check (true);

drop policy if exists pulse_sessions_service_role_all on public.pulse_sessions;
create policy pulse_sessions_service_role_all
  on public.pulse_sessions for all to service_role
  using (true) with check (true);

drop policy if exists pulse_player_states_service_role_all on public.pulse_player_states;
create policy pulse_player_states_service_role_all
  on public.pulse_player_states for all to service_role
  using (true) with check (true);

drop policy if exists domain_telemetry_metrics_service_role_all on public.domain_telemetry_metrics;
create policy domain_telemetry_metrics_service_role_all
  on public.domain_telemetry_metrics for all to service_role
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists pulse_programs_set_updated_at on public.pulse_programs;
create trigger pulse_programs_set_updated_at
before update on public.pulse_programs
for each row execute function public.set_updated_at();

drop trigger if exists pulse_sessions_set_updated_at on public.pulse_sessions;
create trigger pulse_sessions_set_updated_at
before update on public.pulse_sessions
for each row execute function public.set_updated_at();

drop trigger if exists pulse_player_states_set_updated_at on public.pulse_player_states;
create trigger pulse_player_states_set_updated_at
before update on public.pulse_player_states
for each row execute function public.set_updated_at();
