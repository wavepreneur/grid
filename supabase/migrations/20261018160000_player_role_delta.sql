-- Fourth play role. Compare via role::text so this file can run in one transaction.
alter type public.grid_player_role add value if not exists 'delta';

-- First Beta keeps teams.beta_player_id; later Betas must not overwrite it.
create or replace function public.sync_team_beta_reference()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'beta' and new.left_at is null then
    update public.teams
    set beta_player_id = new.id, updated_at = now()
    where id = new.team_id
      and (beta_player_id is null or beta_player_id = new.id);
  end if;

  if old.role = 'beta' and new.left_at is not null and old.left_at is null then
    update public.teams
    set beta_player_id = null, updated_at = now()
    where id = new.team_id and beta_player_id = new.id;
  end if;

  return new;
end;
$$;

create or replace view public.team_lobby_snapshot as
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
        'is_beta', p.role::text = 'beta',
        'is_gamma', p.role::text = 'gamma',
        'is_delta', p.role::text = 'delta',
        'archetype_role',
          case
            when p.is_captain or p.role::text = 'alpha' then 'alpha'
            when p.role::text = 'beta' then 'beta'
            when p.role::text = 'delta' then 'delta'
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
