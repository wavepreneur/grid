-- Fix infinite recursion in Phase 2 player RLS policies.
-- The players SELECT policy must not query players directly inside its own policy.

create or replace function public.player_belongs_to_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.players p
    where p.team_id = p_team_id
      and p.session_id = public.auth_player_session_id()
      and p.left_at is null
  );
$$;

drop policy if exists teams_player_session_select on public.teams;
create policy teams_player_session_select
  on public.teams
  for select
  to authenticated
  using (public.player_belongs_to_team(id));

drop policy if exists players_teammates_select on public.players;
create policy players_teammates_select
  on public.players
  for select
  to authenticated
  using (public.player_belongs_to_team(team_id));

drop policy if exists team_sync_events_player_session_select on public.team_sync_events;
create policy team_sync_events_player_session_select
  on public.team_sync_events
  for select
  to authenticated
  using (public.player_belongs_to_team(team_id));

comment on function public.player_belongs_to_team(uuid) is
  'SECURITY DEFINER helper to avoid recursive RLS when checking Zero-Auth session membership.';
