-- Paste into Supabase SQL Editor (GridOS) if `db push` is unavailable.
-- Creates organization_members + admin memberships for Dervis on Exitmania + Tabbrain.

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'admin'
    check (role in ('admin', 'operator', 'editor', 'viewer')),
  can_access_studio boolean not null default true,
  can_access_cockpit boolean not null default true,
  can_access_data boolean not null default true,
  can_manage_tasks boolean not null default true,
  can_manage_games boolean not null default true,
  can_manage_tickets boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_members_user_idx
  on public.organization_members (user_id);

create index if not exists organization_members_org_idx
  on public.organization_members (organization_id);

-- dk@kineticpillar.co
insert into public.organization_members (
  organization_id, user_id, role,
  can_access_studio, can_access_cockpit, can_access_data,
  can_manage_tasks, can_manage_games, can_manage_tickets
)
select o.id, '27b0d6e2-2341-4895-a8e6-5a3bf1cfd05f'::uuid, 'admin',
  true, true, true, true, true, true
from public.organizations o
where o.slug in ('exitmania', 'tabbrain')
on conflict (organization_id, user_id) do update set
  role = 'admin',
  can_access_studio = true,
  can_access_cockpit = true,
  can_access_data = true,
  can_manage_tasks = true,
  can_manage_games = true,
  can_manage_tickets = true,
  updated_at = now();

-- dervis.kilic@gmail.com (aktueller Login)
insert into public.organization_members (
  organization_id, user_id, role,
  can_access_studio, can_access_cockpit, can_access_data,
  can_manage_tasks, can_manage_games, can_manage_tickets
)
select o.id, 'c2a7efad-0c11-43c4-9ac1-c9e629144bd5'::uuid, 'admin',
  true, true, true, true, true, true
from public.organizations o
where o.slug in ('exitmania', 'tabbrain')
on conflict (organization_id, user_id) do update set
  role = 'admin',
  can_access_studio = true,
  can_access_cockpit = true,
  can_access_data = true,
  can_manage_tasks = true,
  can_manage_games = true,
  can_manage_tickets = true,
  updated_at = now();
