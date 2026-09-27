-- Deleting a Studio game must also drop its ticket batches (codes cascade from the batch).
alter table public.studio_access_batches
  drop constraint if exists studio_access_batches_game_id_fkey;

alter table public.studio_access_batches
  add constraint studio_access_batches_game_id_fkey
  foreign key (game_id) references public.studio_games (id) on delete cascade;

alter table public.studio_access_batches
  drop constraint if exists studio_access_batches_game_version_id_fkey;

alter table public.studio_access_batches
  add constraint studio_access_batches_game_version_id_fkey
  foreign key (game_version_id) references public.studio_game_versions (id) on delete set null;
