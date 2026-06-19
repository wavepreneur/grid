-- Alpha / Beta / Gamma — unified migration
-- Uses enum type recreation so alpha/beta/gamma work in ONE transaction
-- (avoids PostgreSQL 55P04 from ALTER TYPE … ADD VALUE + UPDATE in same tx)

drop view if exists public.team_lobby_snapshot;

drop trigger if exists players_sync_team_beta_reference on public.players;
drop trigger if exists players_sync_role_with_captain on public.players;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'grid_player_role'
      and e.enumlabel = 'alpha'
  ) then
    create type public.grid_player_role_new as enum (
      'captain',
      'solver',
      'navigator',
      'alpha',
      'beta',
      'gamma'
    );

    alter table public.players
      alter column role drop default;

    alter table public.players
      alter column role type public.grid_player_role_new
      using role::text::public.grid_player_role_new;

    drop type public.grid_player_role;

    alter type public.grid_player_role_new rename to grid_player_role;

    alter table public.players
      alter column role set default 'gamma'::public.grid_player_role;
  end if;
end;
$$;

alter table public.teams
  add column if not exists beta_player_id uuid;

alter table public.teams
  drop constraint if exists teams_beta_player_id_fkey;

alter table public.teams
  add constraint teams_beta_player_id_fkey
  foreign key (beta_player_id)
  references public.players (id)
  on delete set null;

create index if not exists teams_beta_player_id_idx
  on public.teams (beta_player_id)
  where beta_player_id is not null;

-- Captain = Alpha; legacy captain/solver/navigator map to alpha/gamma
update public.players
set role = 'alpha'::public.grid_player_role
where is_captain = true
  and left_at is null
  and role::text in ('captain', 'solver', 'navigator');

update public.players p
set role = 'gamma'::public.grid_player_role
where p.left_at is null
  and p.is_captain = false
  and p.role::text in ('captain', 'solver', 'navigator');

create or replace function public.sync_player_role_with_captain()
returns trigger
language plpgsql
as $$
begin
  if new.is_captain = true and new.left_at is null then
    new.role := 'alpha';
  elsif new.role = 'alpha' and (new.is_captain = false or new.left_at is not null) then
    new.role := 'gamma';
  elsif new.role = 'captain' and new.left_at is null then
    new.role := case when new.is_captain then 'alpha' else 'gamma' end;
  elsif new.role = 'captain' then
    new.role := 'gamma';
  elsif new.role = 'solver' and new.left_at is null then
    new.role := 'gamma';
  elsif new.role = 'navigator' and new.left_at is null then
    new.role := 'gamma';
  end if;
  return new;
end;
$$;

create or replace function public.sync_team_beta_reference()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'beta' and new.left_at is null then
    update public.teams
    set beta_player_id = new.id, updated_at = now()
    where id = new.team_id;
  end if;

  if old.role = 'beta' and new.left_at is not null and old.left_at is null then
    update public.teams
    set beta_player_id = null, updated_at = now()
    where id = new.team_id and beta_player_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists players_sync_role_with_captain on public.players;
create trigger players_sync_role_with_captain
before insert or update of is_captain, left_at, role on public.players
for each row
execute function public.sync_player_role_with_captain();

drop trigger if exists players_sync_team_beta_reference on public.players;
create trigger players_sync_team_beta_reference
after insert or update of role, left_at on public.players
for each row
execute function public.sync_team_beta_reference();

-- Alpha is also Team Lead (GPS) by default
update public.teams t
set navigator_player_id = t.captain_player_id
where t.navigator_player_id is null
  and t.captain_player_id is not null;

create view public.team_lobby_snapshot as
select
  t.id as team_id,
  t.event_id,
  t.join_code,
  t.name as team_name,
  t.max_size,
  t.department,
  t.region,
  t.status as team_status,
  t.lobby_opened_at,
  t.lobby_auto_start_at,
  t.captain_player_id,
  t.navigator_player_id,
  t.beta_player_id,
  count(p.id) filter (where p.left_at is null) as active_player_count,
  coalesce(
    json_agg(
      json_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'is_captain', p.is_captain,
        'role', p.role,
        'is_navigator', p.id = t.navigator_player_id,
        'is_alpha', p.is_captain or p.role::text = 'alpha',
        'is_beta', p.id = t.beta_player_id or p.role::text = 'beta',
        'is_gamma', p.role::text = 'gamma' or (not p.is_captain and p.id is distinct from t.beta_player_id and p.role::text not in ('beta', 'alpha')),
        'archetype_role',
          case
            when p.is_captain or p.role::text = 'alpha' then 'alpha'
            when p.id = t.beta_player_id or p.role::text = 'beta' then 'beta'
            else 'gamma'
          end,
        'joined_at', p.joined_at,
        'last_seen_at', p.last_seen_at
      )
      order by p.joined_at
    ) filter (where p.left_at is null),
    '[]'::json
  ) as players
from public.teams t
left join public.players p on p.team_id = t.id
group by t.id;

comment on column public.teams.beta_player_id is
  'Beta (Schreibführer): puzzle sheet & notes. One per team when 2+ players.';
