-- =============================================================================
-- GRID Phase 3: Location & Content Layer (Exitmania Engine)
-- =============================================================================

create table if not exists public.route_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text,
  description text,
  levels jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint route_templates_slug_format check (slug ~ '^[a-z0-9-]{3,64}$')
);

create unique index if not exists route_templates_slug_key
  on public.route_templates (slug);

alter table public.route_templates enable row level security;

drop policy if exists route_templates_service_role_all on public.route_templates;
create policy route_templates_service_role_all
  on public.route_templates
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists route_templates_public_read on public.route_templates;
create policy route_templates_public_read
  on public.route_templates
  for select
  to authenticated, anon
  using (true);

drop trigger if exists route_templates_set_updated_at on public.route_templates;
create trigger route_templates_set_updated_at
before update on public.route_templates
for each row
execute function public.set_updated_at();

comment on table public.route_templates is
  'Standard Exitmania route libraries. Events override via events.route_override JSONB.';
comment on column public.events.content_config is
  'Phase 3: { "template_slug": "default-exitmania", ... }';
comment on column public.events.route_override is
  'Phase 3: partial level overrides, e.g. { "levels": { "2": { "location": {...} } } }';

-- Default 10-level demo template (Berlin mix: GPS, digital, quiz)
insert into public.route_templates (slug, name, city, description, levels)
values (
  'default-exitmania',
  'Exitmania Standard (Demo)',
  'Berlin',
  'Demo-Route mit GPS-, Digital- und Quiz-Levels.',
  $json$[
    {
      "level": 1,
      "type": "digital",
      "title": "Mission Briefing",
      "description": "Willkommen bei Exitmania. Eure Mission beginnt digital — kein GPS nötig.",
      "answer": "start"
    },
    {
      "level": 2,
      "type": "gps",
      "title": "Checkpoint Brandenburger Tor",
      "description": "Begibt euch zum Brandenburger Tor. Scannt den Ort, wenn ihr im Radius seid.",
      "location": { "lat": 52.516275, "lng": 13.377704, "radius_meters": 80 }
    },
    {
      "level": 3,
      "type": "quiz",
      "title": "Bonus: Team-Wissen",
      "description": "Welche Metrik ist für Teambuilding-Events am wichtigsten?",
      "options": [
        { "id": "a", "label": "Anzahl Selfies" },
        { "id": "b", "label": "Zusammenarbeit & Kommunikation" },
        { "id": "c", "label": "Wer zuletzt kommt, gewinnt" }
      ],
      "correct_option_id": "b"
    },
    {
      "level": 4,
      "type": "gps",
      "title": "Checkpoint Museumsinsel",
      "description": "Findet den nächsten Punkt an der Museumsinsel.",
      "location": { "lat": 52.516932, "lng": 13.401899, "radius_meters": 80 }
    },
    {
      "level": 5,
      "type": "digital",
      "title": "Codewort",
      "description": "Löst das Rätsel: Was ist die Hauptstadt Deutschlands?",
      "answer": "berlin"
    },
    {
      "level": 6,
      "type": "quiz",
      "title": "Bonus: Unternehmenskultur",
      "description": "Was fördert psychologische Sicherheit im Team am stärksten?",
      "options": [
        { "id": "a", "label": "Feedback-Kultur & Vertrauen" },
        { "id": "b", "label": "Stille Chat-Gruppen" },
        { "id": "c", "label": "Wettbewerb um Rankings" }
      ],
      "correct_option_id": "a"
    },
    {
      "level": 7,
      "type": "gps",
      "title": "Checkpoint Alexanderplatz",
      "description": "Der Fernsehturm wacht über diesen Checkpoint.",
      "location": { "lat": 52.521918, "lng": 13.413215, "radius_meters": 100 }
    },
    {
      "level": 8,
      "type": "digital",
      "title": "Zahlenrätsel",
      "description": "Wie viele Level hat dieses Exitmania-Spiel?",
      "answer": "10"
    },
    {
      "level": 9,
      "type": "quiz",
      "title": "Bonus: DSGVO",
      "description": "Was speichert GRID nach dem Event nicht?",
      "options": [
        { "id": "a", "label": "Pseudonyme Spielernamen dauerhaft" },
        { "id": "b", "label": "Präzise Bewegungsprofile" },
        { "id": "c", "label": "Team-Metadaten (Abteilung/Region)" }
      ],
      "correct_option_id": "b"
    },
    {
      "level": 10,
      "type": "digital",
      "title": "Finale",
      "description": "Gebt das Codewort ein, um die Mission abzuschließen.",
      "answer": "exitmania"
    }
  ]$json$::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  city = excluded.city,
  description = excluded.description,
  levels = excluded.levels,
  updated_at = now();
