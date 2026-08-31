-- Fast start + lead transfer: same Realtime path as in-game answers.

alter table public.team_sync_events
  drop constraint if exists team_sync_events_event_type_check;

alter table public.team_sync_events
  add constraint team_sync_events_event_type_check check (
    event_type in (
      'game_started',
      'level_completed',
      'modal_cleared',
      'game_finished',
      'captain_transferred',
      'content_ready'
    )
  );

comment on column public.team_sync_events.event_type is
  'Realtime fan-out: start, answers, lead transfer, content ready.';
