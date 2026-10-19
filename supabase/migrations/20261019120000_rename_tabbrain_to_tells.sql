-- "tabbrain" was the old internal name of today's Tells one-off blueprint.
-- Rename every stored slug to "tells". Must run before (or with) the deploy that
-- drops "tabbrain" from BLUEPRINT_SLUGS, otherwise those events fall back to exitmania (GPS).

update public.organizations
set slug = 'tells', name = 'Tells'
where slug = 'tabbrain'
  and not exists (select 1 from public.organizations where slug = 'tells');

update public.route_templates
set slug = 'tells-enterprise-demo', name = 'Tells Enterprise Demo'
where slug = 'tabbrain-enterprise-demo'
  and not exists (select 1 from public.route_templates where slug = 'tells-enterprise-demo');

update public.events
set content_config = jsonb_set(content_config, '{blueprint_slug}', '"tells"')
where content_config->>'blueprint_slug' = 'tabbrain';

update public.events
set content_config = jsonb_set(content_config, '{template_slug}', '"tells-enterprise-demo"')
where content_config->>'template_slug' = 'tabbrain-enterprise-demo';

update public.events
set content_config = jsonb_set(content_config, '{growth_pack,surface}', '"tells"')
where content_config->'growth_pack'->>'surface' = 'tabbrain';
