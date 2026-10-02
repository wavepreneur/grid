-- Product families for city-scaled games (First Profiler, later titles).
-- Admin Studio only — not a customer game builder.

create table if not exists public.studio_collections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists studio_collections_org_idx
  on public.studio_collections (organization_id, name);

comment on table public.studio_collections is
  'Product family for many city games of the same title. Layer-1 instances stay thin; collection groups them in Studio.';

alter table public.studio_games
  add column if not exists collection_id uuid
    references public.studio_collections (id) on delete set null;

create index if not exists studio_games_collection_idx
  on public.studio_games (collection_id)
  where collection_id is not null;

comment on column public.studio_games.collection_id is
  'Product family this city game belongs to (e.g. First Profiler).';

alter table public.studio_compose_recipes
  add column if not exists collection_id uuid
    references public.studio_collections (id) on delete set null;

comment on column public.studio_compose_recipes.collection_id is
  'New city games composed from this recipe inherit this collection.';

alter table public.studio_collections enable row level security;

insert into public.studio_collections (organization_id, slug, name)
select distinct
  g.organization_id,
  'first-profiler',
  'First Profiler'
from public.studio_games g
where g.is_template is not true
  and (
    g.name ilike 'First Profiler%'
    or g.slug like 'fp-%'
    or exists (
      select 1
      from public.studio_compose_recipes r
      where r.id = g.compose_recipe_id
        and r.name ilike '%First Profiler%'
    )
  )
on conflict (organization_id, slug) do nothing;

insert into public.studio_collections (organization_id, slug, name)
select distinct
  r.organization_id,
  'first-profiler',
  'First Profiler'
from public.studio_compose_recipes r
where r.name ilike '%First Profiler%'
on conflict (organization_id, slug) do nothing;

update public.studio_games g
set collection_id = c.id
from public.studio_collections c
where c.organization_id = g.organization_id
  and c.slug = 'first-profiler'
  and g.collection_id is null
  and g.is_template is not true
  and (
    g.name ilike 'First Profiler%'
    or g.slug like 'fp-%'
    or exists (
      select 1
      from public.studio_compose_recipes r
      where r.id = g.compose_recipe_id
        and r.name ilike '%First Profiler%'
    )
  );

update public.studio_compose_recipes r
set collection_id = c.id
from public.studio_collections c
where c.organization_id = r.organization_id
  and c.slug = 'first-profiler'
  and r.collection_id is null
  and r.name ilike '%First Profiler%';
