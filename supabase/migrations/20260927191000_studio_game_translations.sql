-- One Studio game, many locales. Booking locks language; players do not switch.
-- Source strings stay on name/description/farewell_text (game.language).

alter table public.studio_games
  drop constraint if exists studio_games_language_check;

alter table public.studio_games
  add constraint studio_games_language_check
  check (language ~ '^[a-z]{2}$');

alter table public.studio_games
  add column if not exists translations jsonb not null default '{}'::jsonb;
