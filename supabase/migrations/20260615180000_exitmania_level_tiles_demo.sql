-- Demo content tiles for Exitmania Level 1 (lean URL/embed model)

update public.global_levels
set content = content || $json${
  "hero_image_url": "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80",
  "tiles": [
    {
      "id": "briefing-image",
      "type": "image",
      "url": "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80",
      "label": "Briefing"
    },
    {
      "id": "briefing-audio",
      "type": "audio",
      "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      "label": "Audio"
    },
    {
      "id": "briefing-video",
      "type": "video",
      "url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "label": "Video"
    },
    {
      "id": "briefing-360",
      "type": "panorama_360",
      "url": "https://momento360.com/e/u/5faba2c2f9f049409993aee2b5875f2b?utm_campaign=embed&utm_source=other&size=medium&display-plan=true",
      "label": "360°"
    }
  ]
}$json$::jsonb
where level_number = 1
  and slug like 'exitmania-%';

-- Ensure demo events use exitmania player UI
update public.events
set content_config = coalesce(content_config, '{}'::jsonb) || '{"ui_layout":"exitmania","show_live_score":true,"mission_duration_minutes":90}'::jsonb
where content_config is null
   or not (content_config ? 'ui_layout');
