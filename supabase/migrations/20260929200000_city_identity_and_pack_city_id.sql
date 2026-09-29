-- City identity is Exitmania cities.id (stored as source_city_id).
-- Slug/name are labels and may change. Game join remains studio_games.slug.
-- @see docs/GRID_LAYER_MODEL.md

alter table public.cities
  add column if not exists source_city_id uuid;

alter table public.cities
  add column if not exists name_en text;

alter table public.cities
  add column if not exists slug_en text;

create unique index if not exists cities_org_source_city_id_key
  on public.cities (organization_id, source_city_id)
  where source_city_id is not null;

comment on column public.cities.source_city_id is
  'Exitmania cities.id — stable city identity. slug/name/slug_en/name_en are labels only.';

alter table public.studio_layer_packs
  add column if not exists city_id uuid
    references public.cities (id) on delete set null;

create index if not exists studio_layer_packs_city_id_idx
  on public.studio_layer_packs (city_id)
  where city_id is not null;

comment on column public.studio_layer_packs.city_id is
  'Layer 1 only. GRID cities.id (backed by Exitmania source_city_id). Not a slug.';

comment on column public.studio_layer_packs.city_slug is
  'Denormalized current slug for search. May change. Identity is city_id.';

comment on column public.studio_games.slug is
  'Stable GRID game code. Exitmania games.grid_content_pack_slug stores this. Never derived from the title.';
