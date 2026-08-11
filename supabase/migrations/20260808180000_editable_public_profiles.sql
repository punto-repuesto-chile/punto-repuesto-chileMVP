-- Add an explicit public projection while existing account fields stay private.
alter table public.profiles
  add column if not exists public_display_name text,
  add column if not exists public_avatar_path text,
  add column if not exists public_region text,
  add column if not exists public_commune text;

update public.profiles
set public_display_name = btrim(full_name)
where public_display_name is null
  and char_length(btrim(full_name)) between 2 and 80;

alter table public.profiles
  drop constraint if exists profiles_public_display_name_length_check,
  add constraint profiles_public_display_name_length_check
    check (
      public_display_name is null
      or char_length(btrim(public_display_name)) between 2 and 80
    ),
  drop constraint if exists profiles_public_region_length_check,
  add constraint profiles_public_region_length_check
    check (public_region is null or char_length(public_region) <= 100),
  drop constraint if exists profiles_public_commune_length_check,
  add constraint profiles_public_commune_length_check
    check (public_commune is null or char_length(public_commune) <= 100);

-- Existing own-row SELECT/UPDATE policies continue protecting this table.
drop function if exists public.get_public_seller_profile(uuid);

create function public.get_public_seller_profile(target_seller_id uuid)
returns table (
  id uuid,
  full_name text,
  avatar_path text,
  region text,
  commune text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
rows 1
as $$
  select
    profile.id,
    coalesce(profile.public_display_name, ''),
    profile.public_avatar_path,
    profile.public_region,
    profile.public_commune,
    profile.created_at
  from public.profiles as profile
  where profile.id = target_seller_id
  limit 1;
$$;

revoke all on function public.get_public_seller_profile(uuid) from public;
grant execute on function public.get_public_seller_profile(uuid)
  to anon, authenticated;

-- Files uploaded here are deliberately public by URL. That does not grant
-- upload, update, delete, or metadata-listing permissions.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile owners can read avatar metadata" on storage.objects;
create policy "Profile owners can read avatar metadata"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-avatars'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Profile owners can upload avatars" on storage.objects;
create policy "Profile owners can upload avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Profile owners can update avatars" on storage.objects;
create policy "Profile owners can update avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Profile owners can delete avatars" on storage.objects;
create policy "Profile owners can delete avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = auth.uid()::text
  );
