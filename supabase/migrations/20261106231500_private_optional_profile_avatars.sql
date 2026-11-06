-- Optional private profile photo. Path must be exactly {auth.uid()}/avatar.jpg.
-- Uploads use upsert:true. Display via createSignedUrl or download — never a public URL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists avatars_owner_rw on storage.objects;
create policy avatars_owner_rw on storage.objects
for all to authenticated
using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.jpg')
with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.jpg');
