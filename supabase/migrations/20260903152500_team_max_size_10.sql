-- Team capacity: 10 people per team (was 8).

alter table public.events drop constraint if exists events_max_players_per_team_check;
alter table public.events
  add constraint events_max_players_per_team_check
  check (max_players_per_team between 1 and 10);

alter table public.teams drop constraint if exists teams_max_size_check;
alter table public.teams
  add constraint teams_max_size_check
  check (max_size between 1 and 10);

alter table public.studio_access_batches drop constraint if exists studio_access_batches_players_per_team_check;
alter table public.studio_access_batches
  add constraint studio_access_batches_players_per_team_check
  check (players_per_team between 1 and 10);
