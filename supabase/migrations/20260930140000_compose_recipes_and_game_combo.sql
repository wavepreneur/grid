-- Named compose recipes (L2 + L3 + surface) and unique thin-game combos.
-- L1 cities attach to a recipe; re-run only inserts missing (l1, l2, l3) rows.
-- @see docs/GRID_LAYER_MODEL.md

create table if not exists public.studio_compose_recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  layer2_pack_id uuid references public.studio_layer_packs (id) on delete set null,
  layer3_pack_id uuid references public.studio_layer_packs (id) on delete set null,
  surface text not null default 'outdoor'
    check (surface in ('outdoor', 'indoor', 'online')),
  language text not null default 'de',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_compose_recipes_org_idx
  on public.studio_compose_recipes (organization_id, updated_at desc);

comment on table public.studio_compose_recipes is
  'Reusable L2+L3+surface bundle. Compose attaches many L1 city packs without cloning mission/team content.';

alter table public.studio_games
  add column if not exists compose_recipe_id uuid
    references public.studio_compose_recipes (id) on delete set null;

create index if not exists studio_games_compose_recipe_idx
  on public.studio_games (compose_recipe_id)
  where compose_recipe_id is not null;

-- Legacy games without packs stay unconstrained (all FKs null).
create unique index if not exists studio_games_layer_combo_key
  on public.studio_games (organization_id, layer1_pack_id, layer2_pack_id, layer3_pack_id)
  nulls not distinct
  where layer1_pack_id is not null
     or layer2_pack_id is not null
     or layer3_pack_id is not null;

comment on column public.studio_games.compose_recipe_id is
  'Optional recipe that created this thin game. Swap L2/L3 on the recipe updates these FKs.';

alter table public.studio_compose_recipes enable row level security;
