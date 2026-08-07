-- Public access on this bucket makes stored files viewable through their
-- public URLs. It does not grant permission to upload, update, delete, or
-- anonymously list rows in storage.objects; those operations remain governed
-- by the RLS policies below.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'listing-images',
  'listing-images',
  true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Listing image owners can read object metadata"
  on storage.objects;

create policy "Listing image owners can read object metadata"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'listing-images'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.listings as listing
      where listing.id::text = (storage.foldername(name))[2]
        and listing.seller_id = auth.uid()
    )
  );

drop policy if exists "Listing owners can upload listing images"
  on storage.objects;

create policy "Listing owners can upload listing images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.listings as listing
      where listing.id::text = (storage.foldername(name))[2]
        and listing.seller_id = auth.uid()
    )
  );

drop policy if exists "Listing owners can update listing images"
  on storage.objects;

create policy "Listing owners can update listing images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.listings as listing
      where listing.id::text = (storage.foldername(name))[2]
        and listing.seller_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'listing-images'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.listings as listing
      where listing.id::text = (storage.foldername(name))[2]
        and listing.seller_id = auth.uid()
    )
  );

drop policy if exists "Listing owners can delete listing images"
  on storage.objects;

create policy "Listing owners can delete listing images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.listings as listing
      where listing.id::text = (storage.foldername(name))[2]
        and listing.seller_id = auth.uid()
    )
  );
