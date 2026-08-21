-- GRID Studio tenancy: project membership + role foundation
-- Future roles: operator/editor/viewer with product + studio capability flags.
-- admin = full control over GRID for that organization.

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- admin | operator | editor | viewer (operator/editor/viewer enforced later)
  role text not null default 'admin'
    check (role in ('admin', 'operator', 'editor', 'viewer')),
  -- Product access (GRID Studio / Cockpit / Data)
  can_access_studio boolean not null default true,
  can_access_cockpit boolean not null default true,
  can_access_data boolean not null default true,
  -- GRID Studio capabilities (tasks / games / tickets)
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

comment on table public.organization_members is
  'Maps auth users to organizations (projects). admin = full GRID control. Other roles + flags reserved for future RBAC.';

comment on column public.organization_members.role is
  'admin: full control. Future: operator (studio+cockpit+data), editor (studio create), viewer (read).';

-- Helper: upsert admin membership for an email on Exitmania + Tabbrain
create or replace function public.ensure_studio_admin_for_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  org record;
begin
  select id into uid
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;

  if uid is null then
    raise notice 'ensure_studio_admin_for_email: no auth.users row for %', p_email;
    return;
  end if;

  for org in
    select id from public.organizations where slug in ('exitmania', 'tabbrain')
  loop
    insert into public.organization_members (
      organization_id,
      user_id,
      role,
      can_access_studio,
      can_access_cockpit,
      can_access_data,
      can_manage_tasks,
      can_manage_games,
      can_manage_tickets
    )
    values (org.id, uid, 'admin', true, true, true, true, true, true)
    on conflict (organization_id, user_id) do update set
      role = excluded.role,
      can_access_studio = true,
      can_access_cockpit = true,
      can_access_data = true,
      can_manage_tasks = true,
      can_manage_games = true,
      can_manage_tickets = true,
      updated_at = now();
  end loop;
end;
$$;

revoke all on function public.ensure_studio_admin_for_email(text) from public;
grant execute on function public.ensure_studio_admin_for_email(text) to service_role;

-- Seed known Dervis identities (no-op if user missing)
select public.ensure_studio_admin_for_email('dk@kineticpillar.co');
select public.ensure_studio_admin_for_email('dervis.kilic@gmail.com');
