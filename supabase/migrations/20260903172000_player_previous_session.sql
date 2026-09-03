-- Keep the previous session visible to Realtime RLS after a device takeover,
-- so the kicked phone still receives the session_id UPDATE.

alter table public.players
  add column if not exists previous_session_id uuid;

create index if not exists players_previous_session_id_idx
  on public.players (previous_session_id)
  where previous_session_id is not null;

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
      and p.left_at is null
      and (
        p.session_id = public.auth_player_session_id()
        or p.previous_session_id = public.auth_player_session_id()
      )
  );
$$;

comment on function public.player_belongs_to_team(uuid) is
  'SECURITY DEFINER helper. Matches current or previous session so a kicked device still sees the team long enough to show the handoff screen.';
