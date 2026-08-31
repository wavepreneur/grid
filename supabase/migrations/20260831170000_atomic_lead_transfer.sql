-- Atomic last-write-wins lead transfer.
-- Parallel demote+promote hit players_one_active_captain_per_team_key and
-- rolled the DB back while the UI had already switched via broadcast.

alter table public.teams
  add column if not exists lead_seq bigint not null default 0;

comment on column public.teams.lead_seq is
  'Monotonic lead-transfer clock. Newer client seq wins; stale in-flight requests are ignored.';

create or replace function public.transfer_team_lead(
  p_team_id uuid,
  p_actor_id uuid,
  p_target_id uuid,
  p_seq bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_captain uuid;
  v_seq bigint;
  v_actor_active boolean;
  v_target_active boolean;
  v_actor_is_lead boolean;
  v_previous uuid;
begin
  if p_seq is null then
    p_seq := 0;
  end if;

  select t.captain_player_id, coalesce(t.lead_seq, 0)
    into v_captain, v_seq
  from public.teams t
  where t.id = p_team_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Team nicht gefunden.');
  end if;

  select exists(
    select 1 from public.players
    where id = p_actor_id and team_id = p_team_id and left_at is null
  ) into v_actor_active;

  select exists(
    select 1 from public.players
    where id = p_target_id and team_id = p_team_id and left_at is null
  ) into v_target_active;

  if not v_actor_active then
    return jsonb_build_object('ok', false, 'error', 'Session ungültig.');
  end if;

  if not v_target_active then
    return jsonb_build_object(
      'ok', false,
      'error', 'Zielspieler nicht gefunden oder inaktiv.'
    );
  end if;

  -- Stale in-flight request after a newer tap already committed.
  if p_seq < v_seq then
    return jsonb_build_object(
      'ok', true,
      'ignored', true,
      'captain_id', v_captain,
      'seq', v_seq
    );
  end if;

  select exists(
    select 1 from public.players
    where id = p_actor_id
      and team_id = p_team_id
      and left_at is null
      and (is_captain or role = 'alpha' or v_captain is not distinct from p_actor_id)
  ) into v_actor_is_lead;

  -- Ping-pong: the new lead taps before the previous write is visible.
  if not v_actor_is_lead and p_seq <= v_seq then
    return jsonb_build_object(
      'ok', false,
      'error', 'Nur Alpha kann die Rolle übertragen.'
    );
  end if;

  if p_target_id is not distinct from v_captain then
    update public.teams
    set lead_seq = p_seq, updated_at = now()
    where id = p_team_id;

    return jsonb_build_object(
      'ok', true,
      'noop', true,
      'captain_id', v_captain,
      'seq', p_seq
    );
  end if;

  v_previous := v_captain;

  update public.players
  set is_captain = false, role = 'beta'
  where team_id = p_team_id
    and left_at is null
    and is_captain = true
    and id is distinct from p_target_id;

  update public.players
  set is_captain = true, role = 'alpha'
  where id = p_target_id
    and team_id = p_team_id
    and left_at is null;

  update public.teams
  set
    captain_player_id = p_target_id,
    navigator_player_id = p_target_id,
    beta_player_id = case
      when v_previous is distinct from p_target_id then v_previous
      else beta_player_id
    end,
    lead_seq = p_seq,
    updated_at = now()
  where id = p_team_id;

  return jsonb_build_object(
    'ok', true,
    'captain_id', p_target_id,
    'seq', p_seq,
    'previous_captain_id', v_previous
  );
end;
$$;

revoke all on function public.transfer_team_lead(uuid, uuid, uuid, bigint) from public;
grant execute on function public.transfer_team_lead(uuid, uuid, uuid, bigint) to service_role;
