-- =============================================================================
-- Team Lead (Navigator) — transferable GPS role on teams.navigator_player_id
-- =============================================================================

alter table public.teams
  add column if not exists navigator_player_id uuid;

alter table public.teams
  drop constraint if exists teams_navigator_player_id_fkey;

alter table public.teams
  add constraint teams_navigator_player_id_fkey
  foreign key (navigator_player_id)
  references public.players (id)
  on delete set null;

update public.teams t
set navigator_player_id = t.captain_player_id
where t.navigator_player_id is null
  and t.captain_player_id is not null;

create index if not exists teams_navigator_player_id_idx
  on public.teams (navigator_player_id)
  where navigator_player_id is not null;

drop view if exists public.team_lobby_snapshot;

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
  count(p.id) filter (where p.left_at is null) as active_player_count,
  coalesce(
    json_agg(
      json_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'is_captain', p.is_captain,
        'role', p.role,
        'is_navigator', p.id = t.navigator_player_id,
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

comment on column public.teams.navigator_player_id is
  'Transferable Team Lead for GPS checkpoints. Independent from captain_player_id.';
