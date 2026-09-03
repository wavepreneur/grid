-- Organizer Event-Portal: unguessable token, no login.
-- Used by Exitmania (and later Tabbrain) as the booked-event config link.

alter table public.events
  add column if not exists portal_token text;

update public.events
set portal_token = replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
where portal_token is null;

alter table public.events
  alter column portal_token set default encode(gen_random_bytes(24), 'hex');

alter table public.events
  alter column portal_token set not null;

create unique index if not exists events_portal_token_key
  on public.events (portal_token);

comment on column public.events.portal_token is
  'Secret organizer token for /portal/{token}. Duration, GPS and entry-quiz overrides. Not a player invite.';
