-- Play surfaces: indoor stations (Layer 1) + online content_context
-- @see docs/GRID_LAYER_MODEL.md § Surfaces / Indoor-Stationen

-- ---------------------------------------------------------------------------
-- 1) studio_tasks.content_context: allow "online"
-- ---------------------------------------------------------------------------

alter table public.studio_tasks
  drop constraint if exists studio_tasks_content_context_check;

alter table public.studio_tasks
  add constraint studio_tasks_content_context_check
  check (content_context in ('outdoor', 'indoor', 'online', 'any'));

comment on column public.studio_tasks.content_context is
  'Surface filter: outdoor | indoor | online | any. Used with events.content_config.content_mode.';

-- ---------------------------------------------------------------------------
-- 2) local_stations — city/venue Layer-1 indoor (codes replace GPS)
-- ---------------------------------------------------------------------------

create table if not exists public.local_stations (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  global_level_id uuid not null references public.global_levels (id) on delete cascade,
  name text not null,
  place text not null default '',
  code text not null,
  kind text not null default 'logic'
    check (kind in ('puzzle', 'search', 'logic', 'team', 'finale')),
  minutes integer check (minutes is null or minutes between 1 and 180),
  points integer check (points is null or points between 0 and 10000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (city_id, global_level_id),
  unique (city_id, code)
);

create index if not exists local_stations_city_id_idx
  on public.local_stations (city_id);

create index if not exists local_stations_global_level_id_idx
  on public.local_stations (global_level_id);

drop trigger if exists local_stations_set_updated_at on public.local_stations;
create trigger local_stations_set_updated_at
before update on public.local_stations
for each row execute function public.set_updated_at();

alter table public.local_stations enable row level security;

drop policy if exists local_stations_service_role_all on public.local_stations;
create policy local_stations_service_role_all
  on public.local_stations for all to service_role
  using (true) with check (true);

drop policy if exists local_stations_public_read on public.local_stations;
create policy local_stations_public_read
  on public.local_stations for select to authenticated, anon
  using (true);

comment on table public.local_stations is
  'City-specific indoor stations + codes (Layer 1 indoor). Joined with global_levels like local_waypoints.';
