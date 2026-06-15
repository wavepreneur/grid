-- Bump when operator changes route_override / content — clients refetch without manual reload.

alter table public.events
  add column if not exists content_revision bigint not null default 1;

comment on column public.events.content_revision is
  'Incremented on route_override changes. Game clients poll and hot-reload content.';
