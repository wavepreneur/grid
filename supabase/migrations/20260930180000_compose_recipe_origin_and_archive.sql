-- Recipe origin game (Layer 2/3 + Spielinfo source) and archive instead of delete.
-- City games stay; archived recipes cannot spawn new cities.

alter table public.studio_compose_recipes
  add column if not exists origin_game_id uuid references public.studio_games (id) on delete set null,
  add column if not exists archived_at timestamptz;

create index if not exists studio_compose_recipes_origin_idx
  on public.studio_compose_recipes (origin_game_id)
  where origin_game_id is not null;

create index if not exists studio_compose_recipes_active_idx
  on public.studio_compose_recipes (organization_id, updated_at desc)
  where archived_at is null;

comment on column public.studio_compose_recipes.origin_game_id is
  'Hauptspiel of this recipe. Spielinfo and L2/L3 languages are edited there.';
comment on column public.studio_compose_recipes.archived_at is
  'Archived recipes stay linked to existing games but cannot compose new ones.';
