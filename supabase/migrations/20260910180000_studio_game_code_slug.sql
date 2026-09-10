-- Partner game codes are short A–Z / 2–9 keys, not title slugs.
-- Keep old lowercase hyphen slugs valid.

alter table public.studio_games
  drop constraint if exists studio_games_slug_format;

alter table public.studio_games
  add constraint studio_games_slug_format
  check (slug ~ '^[A-Za-z0-9-]{2,64}$');
