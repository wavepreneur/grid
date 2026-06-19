-- Tabbrain enterprise org + non-GPS demo template (Archetype 01 reference without GPS)

insert into public.organizations (slug, name, theme_config)
values (
  'tabbrain',
  'Tabbrain',
  '{
    "accent": "#6366f1",
    "accentMuted": "#6366f133",
    "background": "#0a0a12",
    "surface": "#12121f",
    "border": "#2a2a44",
    "text": "#f8fafc",
    "textMuted": "#94a3b8"
  }'::jsonb
)
on conflict (slug) do update
set
  name = excluded.name,
  theme_config = excluded.theme_config;

insert into public.route_templates (slug, name, city, description, levels)
values (
  'tabbrain-enterprise-demo',
  'Tabbrain Enterprise Demo',
  null,
  'Digital/quiz mission shell — same UI as Exitmania, no GPS checkpoints.',
  $json$[
    {
      "level": 1,
      "type": "digital",
      "title": "Mission Briefing",
      "description": "Euer Team startet synchron. Teilt euch die Hinweise auf den Kacheln — niemand sieht alles allein.",
      "answer": "sync",
      "hero_image_url": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80",
      "tiles": [
        {
          "id": "t1-a",
          "type": "image",
          "url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
          "label": "Briefing A",
          "hint": { "text": "Das Stichwort beginnt mit S.", "point_cost": 50 }
        },
        {
          "id": "t1-b",
          "type": "image",
          "url": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80",
          "label": "Briefing B"
        }
      ]
    },
    {
      "level": 2,
      "type": "quiz",
      "title": "Cross-Site Alignment",
      "description": "Welche Antwort beschreibt echte Zusammenarbeit unter Zeitdruck?",
      "options": [
        { "id": "a", "label": "Jeder löst parallel im Stille-Modus" },
        { "id": "b", "label": "Fragmentierte Infos werden aktiv zusammengeführt" },
        { "id": "c", "label": "Der lauteste Bildschirm gewinnt" }
      ],
      "correct_option_id": "b",
      "tiles": [
        {
          "id": "t2-a",
          "type": "pdf",
          "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          "label": "Policy Excerpt"
        }
      ]
    },
    {
      "level": 3,
      "type": "digital",
      "title": "Compliance Gate",
      "description": "Aus euren Kacheln: Welches Codewort steht im Policy-Auszug? (Demo: grid)",
      "answer": "grid",
      "tiles": [
        {
          "id": "t3-a",
          "type": "iframe",
          "url": "https://example.com",
          "label": "Reference Frame"
        }
      ]
    },
    {
      "level": 4,
      "type": "quiz",
      "title": "Decision Latency",
      "description": "Was misst GRID — Wissen oder Koordination?",
      "options": [
        { "id": "a", "label": "Einzel-Quiz-Scores" },
        { "id": "b", "label": "Wie schnell Teams fragmentierte Infos synchronisieren" },
        { "id": "c", "label": "Anzahl geöffneter Tabs" }
      ],
      "correct_option_id": "b"
    },
    {
      "level": 5,
      "type": "digital",
      "title": "Final Handoff",
      "description": "Mission abschließen: Eingabe des Team-Codeworts aus Level 1.",
      "answer": "sync"
    }
  ]$json$::jsonb
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  levels = excluded.levels;

-- Backfill blueprint_slug on existing Exitmania events
update public.events
set content_config = coalesce(content_config, '{}'::jsonb) || '{"blueprint_slug":"exitmania"}'::jsonb
where coalesce(content_config->>'blueprint_slug', '') = '';
