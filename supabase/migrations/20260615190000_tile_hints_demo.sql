-- Tile-specific hints for demo Level 1 (50 points default, tied to each kachel)

update public.global_levels
set content = jsonb_set(
  content,
  '{tiles}',
  (
    select jsonb_agg(
      case
        when tile->>'id' = 'briefing-image' then
          tile || '{"hint":{"text":"Schaut euch das Briefing-Bild genau an — der Startcode steht oft in der Bildmitte oder im Untertitel."}}'::jsonb
        when tile->>'id' = 'briefing-audio' then
          tile || '{"hint":{"text":"Hört das Audio bis zum Ende. Zahlen oder Buchstaben werden oft am Schluss genannt."}}'::jsonb
        when tile->>'id' = 'briefing-video' then
          tile || '{"hint":{"text":"Im Video wird die Mission erklärt. Merkt euch Schlüsselwörter für die Antwort unten."}}'::jsonb
        when tile->>'id' = 'briefing-360' then
          tile || '{"hint":{"text":"In der 360°-Ansicht könnt ihr euch umsehen. Sucht nach markierten Stellen oder Hinweisschildern."}}'::jsonb
        else tile
      end
    )
    from jsonb_array_elements(content->'tiles') as tile
  )
)
where level_number = 1
  and slug like 'exitmania-%'
  and content ? 'tiles';
