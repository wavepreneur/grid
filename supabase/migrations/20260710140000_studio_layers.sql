-- GRID Studio — Layer model (content architecture)
-- @see docs/GRID_LAYER_MODEL.md

-- studio_tasks: layer assignment
alter table public.studio_tasks
  add column if not exists layer smallint not null default 2
    check (layer in (1, 2, 3));

alter table public.studio_tasks
  add column if not exists content_context text not null default 'any'
    check (content_context in ('outdoor', 'indoor', 'any'));

alter table public.studio_tasks
  add column if not exists role_assignment text not null default 'team'
    check (role_assignment in ('alpha', 'beta', 'gamma', 'team', 'none'));

create index if not exists studio_tasks_layer_idx
  on public.studio_tasks (layer, content_context)
  where is_active = true;

comment on column public.studio_tasks.layer is
  'Content layer: 1=geo/env, 2=global mission, 3=bonus/roles';

comment on column public.studio_tasks.content_context is
  'Outdoor/indoor applicability for runtime profile switching';

comment on column public.studio_tasks.role_assignment is
  'Layer 3 role routing: alpha/beta/gamma/team/none';

-- studio_games: layer profile
alter table public.studio_games
  add column if not exists active_layers smallint[] not null default '{1,2,3}'
    check (cardinality(active_layers) >= 1);

alter table public.studio_games
  add column if not exists runtime_profiles jsonb not null default '{
    "default_mode": "outdoor",
    "indoor_one_click": true,
    "profiles": {
      "outdoor": { "active_layers": [1, 2, 3], "layer_3_context": "any" },
      "indoor": {
        "active_layers": [2, 3],
        "layer_1_fallback": "indoor_defaults",
        "layer_3_context": "indoor"
      }
    }
  }'::jsonb;

comment on column public.studio_games.active_layers is
  'Which content layers this game uses (combinable: 1,2,3)';

comment on column public.studio_games.runtime_profiles is
  'Outdoor/indoor runtime switching — layer activation and fallbacks';

-- Heuristic backfill: tasks with city_slug → layer 1 candidate
update public.studio_tasks
set layer = 1
where city_slug is not null
  and layer = 2
  and coalesce(content->>'answer_type', '') = 'choice';
