-- Run in Supabase SQL Editor after creating bucket "editor-exports" (private).
-- Storage policies: users may only read/write/delete objects under their user id prefix.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'editor-exports',
  'editor-exports',
  false,
  5242880,
  array['image/png', 'image/jpeg']::text[]
)
on conflict (id) do nothing;

create policy "Users can upload own exports"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'editor-exports'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Users can read own exports"
on storage.objects for select
to authenticated
using (
  bucket_id = 'editor-exports'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Users can update own exports"
on storage.objects for update
to authenticated
using (
  bucket_id = 'editor-exports'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Users can delete own exports"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'editor-exports'
  and split_part(name, '/', 1) = auth.uid()::text
);
