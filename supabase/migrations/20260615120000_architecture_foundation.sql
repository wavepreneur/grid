-- =============================================================================
-- GRID Architecture Foundation
-- Multi-tenancy, scalable content (global_levels + local_waypoints), audit_logs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.grid_player_role as enum ('captain', 'solver', 'navigator');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.grid_device_type as enum ('mobile', 'desktop', 'unknown');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 1) organizations — tenant root
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  theme_config jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organizations_slug_format check (slug ~ '^[a-z0-9-]{2,64}$')
);

insert into public.organizations (slug, name, theme_config)
values (
  'exitmania',
  'Exitmania',
  '{
    "accent": "#00f0ff",
    "accentMuted": "#00f0ff33",
    "background": "#0a0a0f",
    "surface": "#12121a",
    "border": "#2a2a3a",
    "text": "#ffffff",
    "textMuted": "#9ca3af"
  }'::jsonb
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 2) cities — per-organization city catalog
-- ---------------------------------------------------------------------------

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  name text not null,
  country text not null default 'DE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cities_slug_format check (slug ~ '^[a-z0-9-]{2,64}$'),
  unique (organization_id, slug)
);

insert into public.cities (organization_id, slug, name, country)
select o.id, 'berlin', 'Berlin', 'DE'
from public.organizations o
where o.slug = 'exitmania'
on conflict (organization_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- 3) global_levels — universal story/puzzle dictionary (NO organization_id)
-- ---------------------------------------------------------------------------

create table if not exists public.global_levels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  level_number integer not null check (level_number between 1 and 99),
  content jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint global_levels_slug_format check (slug ~ '^[a-z0-9-]{3,64}$')
);

create index if not exists global_levels_level_number_idx
  on public.global_levels (level_number)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- 4) local_waypoints — city-specific GPS + intro text only
-- ---------------------------------------------------------------------------

create table if not exists public.local_waypoints (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  global_level_id uuid not null references public.global_levels (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  radius_meters integer not null default 80 check (radius_meters between 10 and 500),
  intro_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (city_id, global_level_id)
);

create index if not exists local_waypoints_city_id_idx
  on public.local_waypoints (city_id);

-- ---------------------------------------------------------------------------
-- 5) Tenant columns on events + teams
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists organization_id uuid references public.organizations (id);

alter table public.events
  add column if not exists city_id uuid references public.cities (id);

alter table public.events
  add column if not exists booking_reference text;

alter table public.teams
  add column if not exists organization_id uuid references public.organizations (id);

-- Backfill default tenant + Berlin city
update public.events e
set
  organization_id = o.id,
  city_id = c.id,
  content_config = case
    when coalesce(e.content_config, '{}'::jsonb) = '{}'::jsonb
      then jsonb_build_object('city_slug', 'berlin')
    when e.content_config ? 'template_slug'
      and not (e.content_config ? 'city_slug')
      then e.content_config || jsonb_build_object('city_slug', 'berlin')
    else e.content_config
  end
from public.organizations o
cross join public.cities c
where o.slug = 'exitmania'
  and c.slug = 'berlin'
  and c.organization_id = o.id
  and e.organization_id is null;

update public.teams t
set organization_id = e.organization_id
from public.events e
where e.id = t.event_id
  and t.organization_id is null
  and e.organization_id is not null;

alter table public.events
  alter column organization_id set not null;

alter table public.teams
  alter column organization_id set not null;

create index if not exists events_organization_id_idx on public.events (organization_id);
create index if not exists events_city_id_idx on public.events (city_id);
create index if not exists teams_organization_id_idx on public.teams (organization_id);

-- ---------------------------------------------------------------------------
-- 6) Player roles + device type
-- ---------------------------------------------------------------------------

alter table public.players
  add column if not exists role public.grid_player_role not null default 'solver';

alter table public.players
  add column if not exists device_type public.grid_device_type not null default 'unknown';

update public.players
set role = 'captain'
where is_captain = true and left_at is null and role = 'solver';

-- ---------------------------------------------------------------------------
-- 7) audit_logs — Phase 4 data engine
-- ---------------------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  player_id uuid references public.players (id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_organization_id_idx
  on public.audit_logs (organization_id, created_at desc);

create index if not exists audit_logs_event_id_idx
  on public.audit_logs (event_id, created_at desc)
  where event_id is not null;

create index if not exists audit_logs_team_id_idx
  on public.audit_logs (team_id, created_at desc)
  where team_id is not null;

-- ---------------------------------------------------------------------------
-- 8) Seed global_levels + local_waypoints from route_templates (Berlin demo)
-- ---------------------------------------------------------------------------

do $$
declare
  berlin_city_id uuid;
  level_row jsonb;
  level_num integer;
  gl_id uuid;
  gl_slug text;
  gl_content jsonb;
  loc jsonb;
begin
  select c.id into berlin_city_id
  from public.cities c
  join public.organizations o on o.id = c.organization_id
  where o.slug = 'exitmania' and c.slug = 'berlin';

  if berlin_city_id is null then
    return;
  end if;

  for level_row in
    select jsonb_array_elements(rt.levels)
    from public.route_templates rt
    where rt.slug = 'default-exitmania'
  loop
    level_num := (level_row->>'level')::integer;
    gl_slug := 'exitmania-l' || level_num::text;

    gl_content := level_row - 'level';
    if level_row ? 'location' then
      gl_content := gl_content - 'location';
    end if;

    insert into public.global_levels (slug, level_number, content)
    values (gl_slug, level_num, gl_content)
    on conflict (slug) do update set
      level_number = excluded.level_number,
      content = excluded.content,
      updated_at = now()
    returning id into gl_id;

    if level_row ? 'location' then
      loc := level_row->'location';
      insert into public.local_waypoints (
        city_id,
        global_level_id,
        lat,
        lng,
        radius_meters,
        intro_text
      )
      values (
        berlin_city_id,
        gl_id,
        (loc->>'lat')::double precision,
        (loc->>'lng')::double precision,
        coalesce((loc->>'radius_meters')::integer, 80),
        level_row->>'description'
      )
      on conflict (city_id, global_level_id) do update set
        lat = excluded.lat,
        lng = excluded.lng,
        radius_meters = excluded.radius_meters,
        intro_text = excluded.intro_text,
        updated_at = now();
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9) Triggers
-- ---------------------------------------------------------------------------

create or replace function public.sync_team_organization_id()
returns trigger
language plpgsql
as $$
begin
  select e.organization_id into new.organization_id
  from public.events e
  where e.id = new.event_id;

  if new.organization_id is null then
    raise exception 'Event % has no organization_id', new.event_id;
  end if;

  return new;
end;
$$;

drop trigger if exists teams_sync_organization_id on public.teams;
create trigger teams_sync_organization_id
before insert on public.teams
for each row
execute function public.sync_team_organization_id();

create or replace function public.sync_player_role_with_captain()
returns trigger
language plpgsql
as $$
begin
  if new.is_captain = true and new.left_at is null then
    new.role := 'captain';
  elsif new.role = 'captain' and (new.is_captain = false or new.left_at is not null) then
    new.role := 'solver';
  end if;
  return new;
end;
$$;

drop trigger if exists players_sync_role_with_captain on public.players;
create trigger players_sync_role_with_captain
before insert or update of is_captain, left_at, role on public.players
for each row
execute function public.sync_player_role_with_captain();

create or replace function public.clear_team_captain_on_leave()
returns trigger
language plpgsql
as $$
begin
  if old.is_captain = true and new.left_at is not null and old.left_at is null then
    update public.teams
    set captain_player_id = null, updated_at = now()
    where id = new.team_id and captain_player_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists players_clear_team_captain_on_leave on public.players;
create trigger players_clear_team_captain_on_leave
after update of left_at on public.players
for each row
execute function public.clear_team_captain_on_leave();

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

drop trigger if exists cities_set_updated_at on public.cities;
create trigger cities_set_updated_at
before update on public.cities
for each row
execute function public.set_updated_at();

drop trigger if exists global_levels_set_updated_at on public.global_levels;
create trigger global_levels_set_updated_at
before update on public.global_levels
for each row
execute function public.set_updated_at();

drop trigger if exists local_waypoints_set_updated_at on public.local_waypoints;
create trigger local_waypoints_set_updated_at
before update on public.local_waypoints
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10) Updated lobby view (includes player role)
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
        'role', p.role,
        'joined_at', p.joined_at
      )
      order by p.joined_at
    ) filter (where p.left_at is null),
    '[]'::json
  ) as players
from public.teams t
left join public.players p on p.team_id = t.id
group by t.id;

-- ---------------------------------------------------------------------------
-- 11) Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.cities enable row level security;
alter table public.global_levels enable row level security;
alter table public.local_waypoints enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists organizations_service_role_all on public.organizations;
create policy organizations_service_role_all
  on public.organizations for all to service_role
  using (true) with check (true);

drop policy if exists cities_service_role_all on public.cities;
create policy cities_service_role_all
  on public.cities for all to service_role
  using (true) with check (true);

drop policy if exists global_levels_service_role_all on public.global_levels;
create policy global_levels_service_role_all
  on public.global_levels for all to service_role
  using (true) with check (true);

drop policy if exists global_levels_public_read on public.global_levels;
create policy global_levels_public_read
  on public.global_levels for select to authenticated, anon
  using (is_active = true);

drop policy if exists local_waypoints_service_role_all on public.local_waypoints;
create policy local_waypoints_service_role_all
  on public.local_waypoints for all to service_role
  using (true) with check (true);

drop policy if exists local_waypoints_public_read on public.local_waypoints;
create policy local_waypoints_public_read
  on public.local_waypoints for select to authenticated, anon
  using (true);

drop policy if exists audit_logs_service_role_all on public.audit_logs;
create policy audit_logs_service_role_all
  on public.audit_logs for all to service_role
  using (true) with check (true);

comment on table public.organizations is
  'Tenant root. Every event/team belongs to exactly one organization.';
comment on table public.global_levels is
  'Universal level content (story, puzzle, media). Shared across all cities.';
comment on table public.local_waypoints is
  'City-specific GPS coordinates and local intro text. Joined with global_levels at runtime.';
comment on table public.audit_logs is
  'Phase 4 interaction stream for analytics and admin forensics.';
