-- Public bucket for CMS task tiles / media (admin upload via service role)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-media',
  'studio-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "studio_media_public_read"
  on storage.objects for select
  using (bucket_id = 'studio-media');

create policy "studio_media_service_upload"
  on storage.objects for insert
  with check (bucket_id = 'studio-media');

create policy "studio_media_service_update"
  on storage.objects for update
  using (bucket_id = 'studio-media');

create policy "studio_media_service_delete"
  on storage.objects for delete
  using (bucket_id = 'studio-media');
