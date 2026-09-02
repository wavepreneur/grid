-- Access codes: player-facing tickets (not long URLs).
-- Batch = one booking/event issue. Code = one team door, or one shared event door.

do $$ begin
  create type public.studio_access_kind as enum ('team', 'event_pool');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.studio_access_status as enum ('unused', 'redeemed', 'expired', 'revoked');
exception when duplicate_object then null;
end $$;

create table if not exists public.studio_access_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  game_id uuid references public.studio_games (id) on delete restrict,
  game_version_id uuid references public.studio_game_versions (id) on delete restrict,
  event_id uuid references public.events (id) on delete set null,
  name text not null,
  kind public.studio_access_kind not null default 'team',
  max_activations bigint check (max_activations is null or max_activations > 0),
  used_activations bigint not null default 0 check (used_activations >= 0),
  players_per_team integer not null default 5
    check (players_per_team between 1 and 8),
  valid_from timestamptz,
  valid_until timestamptz,
  booking_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_access_batches_org_idx
  on public.studio_access_batches (organization_id, created_at desc);

create index if not exists studio_access_batches_event_idx
  on public.studio_access_batches (event_id)
  where event_id is not null;

create index if not exists studio_access_batches_booking_idx
  on public.studio_access_batches (organization_id, booking_reference)
  where booking_reference is not null;

create table if not exists public.studio_access_codes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.studio_access_batches (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  kind public.studio_access_kind not null default 'team',
  status public.studio_access_status not null default 'unused',
  event_id uuid references public.events (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  redeemed_at timestamptz,
  last_joined_at timestamptz,
  revoked_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  constraint studio_access_codes_code_format check (code ~ '^[A-Z0-9]{4,10}$')
);

create unique index if not exists studio_access_codes_code_key
  on public.studio_access_codes (code);

create index if not exists studio_access_codes_batch_idx
  on public.studio_access_codes (batch_id);

create index if not exists studio_access_codes_team_idx
  on public.studio_access_codes (team_id)
  where team_id is not null;

create index if not exists studio_access_codes_event_idx
  on public.studio_access_codes (event_id)
  where event_id is not null;

alter table public.events
  add column if not exists access_batch_id uuid
  references public.studio_access_batches (id) on delete set null;

create index if not exists events_access_batch_idx
  on public.events (access_batch_id)
  where access_batch_id is not null;

alter table public.studio_access_batches enable row level security;
alter table public.studio_access_codes enable row level security;
