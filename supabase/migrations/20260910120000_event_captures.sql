-- Team photo / video captures for an event. Gallery is portal-token only.
-- Storage paths are unguessable; the bucket is public so Instagram can load the URL.

create table if not exists public.event_captures (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id uuid references public.players (id) on delete set null,
  level_number integer not null,
  kind text not null check (kind in ('photo', 'video', 'augmented_photo')),
  storage_path text not null,
  public_url text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists event_captures_event_idx
  on public.event_captures (event_id, created_at desc);

create index if not exists event_captures_team_idx
  on public.event_captures (team_id);

comment on table public.event_captures is
  'Player photo/video submissions. Read via service role + portal token, never anon.';

alter table public.event_captures enable row level security;

drop policy if exists event_captures_service_role_all on public.event_captures;
create policy event_captures_service_role_all
  on public.event_captures for all to service_role
  using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-captures',
  'event-captures',
  true,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do nothing;

drop policy if exists "event_captures_public_read" on storage.objects;
create policy "event_captures_public_read"
  on storage.objects for select
  using (bucket_id = 'event-captures');

drop policy if exists "event_captures_service_upload" on storage.objects;
create policy "event_captures_service_upload"
  on storage.objects for insert
  with check (bucket_id = 'event-captures');

drop policy if exists "event_captures_service_update" on storage.objects;
create policy "event_captures_service_update"
  on storage.objects for update
  using (bucket_id = 'event-captures');

drop policy if exists "event_captures_service_delete" on storage.objects;
create policy "event_captures_service_delete"
  on storage.objects for delete
  using (bucket_id = 'event-captures');
