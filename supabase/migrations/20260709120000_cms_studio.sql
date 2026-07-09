-- GRID Studio CMS — games (draft) vs events (live), tasks library, tickets

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.studio_game_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.studio_ticket_mode as enum ('single', 'pool');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.studio_ticket_pool_status as enum ('draft', 'active', 'paused', 'closed');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- studio_tasks — reusable puzzle library (independent of games)
-- ---------------------------------------------------------------------------

create table if not exists public.studio_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  language text not null default 'de' check (language in ('de', 'en')),
  city_slug text,
  game_type text,
  tags text[] not null default '{}',
  content jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint studio_tasks_slug_format check (slug ~ '^[a-z0-9-]{2,64}$')
);

create unique index if not exists studio_tasks_org_slug_key
  on public.studio_tasks (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

create index if not exists studio_tasks_filters_idx
  on public.studio_tasks (organization_id, language, city_slug, game_type)
  where is_active = true;

create index if not exists studio_tasks_tags_gin_idx
  on public.studio_tasks using gin (tags);

-- ---------------------------------------------------------------------------
-- studio_blueprints — system + custom templates (Loquiz-style archetypes)
-- ---------------------------------------------------------------------------

create table if not exists public.studio_blueprints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  accent_color text not null default '#2ee9da',
  icon_key text not null default 'map-pin',
  preset_config jsonb not null default '{}'::jsonb,
  preset_logic jsonb not null default '[]'::jsonb,
  is_system boolean not null default false,
  source_game_id uuid,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint studio_blueprints_slug_format check (slug ~ '^[a-z0-9-]{2,64}$')
);

create unique index if not exists studio_blueprints_scope_slug_key
  on public.studio_blueprints (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

-- ---------------------------------------------------------------------------
-- studio_games — editable game definitions (never mutate live events directly)
-- ---------------------------------------------------------------------------

create table if not exists public.studio_games (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  blueprint_id uuid references public.studio_blueprints (id) on delete set null,
  slug text not null,
  name text not null,
  logo_url text,
  description text not null default '',
  language text not null default 'de' check (language in ('de', 'en')),
  city_slug text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  gps_enabled boolean not null default false,
  farewell_text text not null default '',
  feature_flags jsonb not null default '{}'::jsonb,
  logic_rules jsonb not null default '[]'::jsonb,
  status public.studio_game_status not null default 'draft',
  published_version_number integer not null default 0,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint studio_games_slug_format check (slug ~ '^[a-z0-9-]{2,64}$'),
  unique (organization_id, slug)
);

create index if not exists studio_games_org_status_idx
  on public.studio_games (organization_id, status);

-- ---------------------------------------------------------------------------
-- studio_game_versions — immutable snapshots (live events bind here)
-- ---------------------------------------------------------------------------

create table if not exists public.studio_game_versions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.studio_games (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  publish_notes text,
  unique (game_id, version_number)
);

create index if not exists studio_game_versions_game_idx
  on public.studio_game_versions (game_id, version_number desc);

-- ---------------------------------------------------------------------------
-- studio_game_tasks — task assignment on a game draft (ordered)
-- ---------------------------------------------------------------------------

create table if not exists public.studio_game_tasks (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.studio_games (id) on delete cascade,
  task_id uuid not null references public.studio_tasks (id) on delete restrict,
  sort_order integer not null default 0 check (sort_order >= 0),
  overrides jsonb not null default '{}'::jsonb,
  unique (game_id, task_id)
);

create index if not exists studio_game_tasks_game_order_idx
  on public.studio_game_tasks (game_id, sort_order);

-- FK: blueprints can reference saved games as templates
alter table public.studio_blueprints
  drop constraint if exists studio_blueprints_source_game_id_fkey;

alter table public.studio_blueprints
  add constraint studio_blueprints_source_game_id_fkey
  foreign key (source_game_id) references public.studio_games (id) on delete set null;

-- ---------------------------------------------------------------------------
-- studio_ticket_pools — capacity & activation (10k+ teams scale)
-- ---------------------------------------------------------------------------

create table if not exists public.studio_ticket_pools (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  game_id uuid not null references public.studio_games (id) on delete restrict,
  game_version_id uuid references public.studio_game_versions (id) on delete restrict,
  name text not null,
  mode public.studio_ticket_mode not null default 'single',
  max_activations bigint check (max_activations is null or max_activations > 0),
  used_activations bigint not null default 0 check (used_activations >= 0),
  max_players_per_activation integer not null default 5
    check (max_players_per_activation between 1 and 8),
  status public.studio_ticket_pool_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_ticket_pools_game_idx
  on public.studio_ticket_pools (game_id, status);

-- ---------------------------------------------------------------------------
-- studio_ticket_activations — each "Spiel starten" click
-- ---------------------------------------------------------------------------

create table if not exists public.studio_ticket_activations (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.studio_ticket_pools (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  player_count integer not null default 1 check (player_count between 1 and 8),
  activated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists studio_ticket_activations_pool_idx
  on public.studio_ticket_activations (pool_id, activated_at desc);

-- ---------------------------------------------------------------------------
-- events — bind live runs to frozen game version
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists studio_game_version_id uuid
  references public.studio_game_versions (id) on delete set null;

alter table public.events
  add column if not exists studio_ticket_pool_id uuid
  references public.studio_ticket_pools (id) on delete set null;

create index if not exists events_studio_game_version_idx
  on public.events (studio_game_version_id)
  where studio_game_version_id is not null;

-- ---------------------------------------------------------------------------
-- Seed system blueprints (Loquiz-inspired archetypes)
-- ---------------------------------------------------------------------------

insert into public.studio_blueprints (
  organization_id, slug, name, description, accent_color, icon_key,
  preset_config, preset_logic, is_system, sort_order
)
select * from (values
  (
    null::uuid, 'quiz', 'Quiz', 'Classic indoor sequential quiz.',
    '#14b8a6', 'quiz',
    '{"gps_enabled": false, "ui_layout": "quiz", "sequential": true}'::jsonb,
    '[]'::jsonb, true, 1
  ),
  (
    null::uuid, 'clue', 'Clue', 'Indoor quiz with clue unlocking.',
    '#64748b', 'clue',
    '{"gps_enabled": false, "ui_layout": "quiz", "clue_unlock": true}'::jsonb,
    '[]'::jsonb, true, 2
  ),
  (
    null::uuid, 'rogain', 'Rogain', 'Simple outdoor activity mode.',
    '#3b82f6', 'rogain',
    '{"gps_enabled": true, "ui_layout": "exitmania", "rogain_scoring": true}'::jsonb,
    '[]'::jsonb, true, 3
  ),
  (
    null::uuid, 'match', 'Match', 'Outdoor: each task can only be solved once globally.',
    '#a855f7', 'match',
    '{"gps_enabled": true, "ui_layout": "exitmania", "consume_on_solve": true}'::jsonb,
    '[]'::jsonb, true, 4
  ),
  (
    null::uuid, 'tour', 'Tour', 'Basic location-based tour.',
    '#eab308', 'tour',
    '{"gps_enabled": true, "ui_layout": "exitmania", "sequential": true}'::jsonb,
    '[]'::jsonb, true, 5
  ),
  (
    null::uuid, 'asymmetric', 'Asymmetric Team', 'Alpha/Beta/Gamma role dynamics (GRID core).',
    '#2ee9da', 'team',
    '{"gps_enabled": true, "ui_layout": "exitmania", "roles": ["alpha","beta","gamma"]}'::jsonb,
    '[]'::jsonb, true, 6
  )
) as v(organization_id, slug, name, description, accent_color, icon_key, preset_config, preset_logic, is_system, sort_order)
where not exists (
  select 1 from public.studio_blueprints b where b.slug = v.slug and b.organization_id is null
);

-- ---------------------------------------------------------------------------
-- RLS — service role for CMS writes (match engine pattern)
-- ---------------------------------------------------------------------------

alter table public.studio_tasks enable row level security;
alter table public.studio_blueprints enable row level security;
alter table public.studio_games enable row level security;
alter table public.studio_game_versions enable row level security;
alter table public.studio_game_tasks enable row level security;
alter table public.studio_ticket_pools enable row level security;
alter table public.studio_ticket_activations enable row level security;
