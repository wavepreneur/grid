-- Layer belongs on game-task link, not on the task library entry.
-- @see docs/GRID_LAYER_MODEL.md

alter table public.studio_game_tasks
  add column if not exists layer smallint not null default 2
    check (layer in (1, 2, 3));

create index if not exists studio_game_tasks_game_layer_order_idx
  on public.studio_game_tasks (game_id, layer, sort_order);

comment on column public.studio_game_tasks.layer is
  'Content layer for this task within the game: 1=geo, 2=mission, 3=bonus';

-- Backfill from task.layer where links exist
update public.studio_game_tasks sg
set layer = coalesce(
  nullif((sg.overrides->>'layer')::int, 0),
  st.layer,
  2
)
from public.studio_tasks st
where st.id = sg.task_id
  and sg.layer = 2;
