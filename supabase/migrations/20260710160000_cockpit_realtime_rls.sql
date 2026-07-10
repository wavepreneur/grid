-- Cockpit operator Realtime: read teams/players for one event via signed JWT claim.

create or replace function public.auth_cockpit_event_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'cockpit_event_id', '')::uuid;
$$;

drop policy if exists teams_cockpit_event_select on public.teams;
create policy teams_cockpit_event_select
  on public.teams
  for select
  to authenticated
  using (event_id = public.auth_cockpit_event_id());

drop policy if exists players_cockpit_event_select on public.players;
create policy players_cockpit_event_select
  on public.players
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.teams t
      where t.id = players.team_id
        and t.event_id = public.auth_cockpit_event_id()
    )
  );

comment on function public.auth_cockpit_event_id() is
  'JWT claim for operator cockpit Realtime — scoped to a single event_id.';
