-- Named reusable Layer packs: L1 city, L2 mission, L3 team.
-- Games compose by FK — duplicating a game does not copy Layer 2/3 content.
-- @see docs/GRID_LAYER_MODEL.md

create table if not exists public.studio_layer_packs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  layer smallint not null check (layer in (1, 2, 3)),
  slug text not null,
  name text not null,
  description text not null default '',
  city_slug text,
  language text not null default 'de',
  translations jsonb not null default '{}'::jsonb,
  slot_count integer not null default 0 check (slot_count >= 0 and slot_count <= 40),
  created_from_pack_id uuid references public.studio_layer_packs (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint studio_layer_packs_slug_format check (slug ~ '^[a-z0-9-]{2,64}$')
);

create unique index if not exists studio_layer_packs_org_layer_slug_key
  on public.studio_layer_packs (organization_id, layer, slug);

create index if not exists studio_layer_packs_org_layer_city_idx
  on public.studio_layer_packs (organization_id, layer, city_slug)
  where is_active = true;

create index if not exists studio_layer_packs_org_layer_name_idx
  on public.studio_layer_packs (organization_id, layer, name);

comment on table public.studio_layer_packs is
  'Reusable layer packs: 1=city geo/quiz, 2=global mission, 3=team bonuses. Games snap three packs together.';

comment on column public.studio_layer_packs.city_slug is
  'Layer 1 only — city library key. Same pack docks onto any Layer-2 mission.';

create table if not exists public.studio_layer_pack_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.studio_layer_packs (id) on delete cascade,
  task_id uuid not null references public.studio_tasks (id) on delete restrict,
  sort_order integer not null default 0,
  overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_layer_pack_items_pack_sort_idx
  on public.studio_layer_pack_items (pack_id, sort_order);

comment on table public.studio_layer_pack_items is
  'Ordered tasks in a layer pack. Layer 1 overrides hold GPS/station; Layer 3 holds bind_slot/role/when.';

alter table public.studio_games
  add column if not exists layer1_pack_id uuid
    references public.studio_layer_packs (id) on delete set null;

alter table public.studio_games
  add column if not exists layer2_pack_id uuid
    references public.studio_layer_packs (id) on delete set null;

alter table public.studio_games
  add column if not exists layer3_pack_id uuid
    references public.studio_layer_packs (id) on delete set null;

create index if not exists studio_games_layer1_pack_idx
  on public.studio_games (layer1_pack_id)
  where layer1_pack_id is not null;

create index if not exists studio_games_layer2_pack_idx
  on public.studio_games (layer2_pack_id)
  where layer2_pack_id is not null;

create index if not exists studio_games_layer3_pack_idx
  on public.studio_games (layer3_pack_id)
  where layer3_pack_id is not null;

comment on column public.studio_games.layer1_pack_id is
  'Optional Layer-1 city pack. Null = legacy studio_game_tasks for this layer.';
comment on column public.studio_games.layer2_pack_id is
  'Optional Layer-2 mission pack. Shared across cities — never clone per city.';
comment on column public.studio_games.layer3_pack_id is
  'Optional Layer-3 team pack. Shared across cities.';

alter table public.studio_layer_packs enable row level security;
alter table public.studio_layer_pack_items enable row level security;
