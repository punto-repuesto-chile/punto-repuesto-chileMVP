-- Punto Repuesto Chile: salvage yard business identities and listing origin.
-- The migration intentionally fails instead of reclassifying legacy rows if a
-- database still contains listing_type = 'salvage_inventory'.

begin;

create table public.salvage_yards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  business_name text not null,
  description text,
  logo_path text,
  region text not null,
  commune text not null,
  public_address text,
  phone text,
  whatsapp text,
  opening_hours text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint salvage_yards_owner_unique unique (owner_id),
  constraint salvage_yards_id_owner_unique unique (id, owner_id),
  constraint salvage_yards_business_name_check check (
    business_name = btrim(business_name)
    and char_length(business_name) between 2 and 120
  ),
  constraint salvage_yards_description_check check (
    description is null or char_length(description) <= 2000
  ),
  constraint salvage_yards_region_check check (btrim(region) <> ''),
  constraint salvage_yards_commune_check check (btrim(commune) <> ''),
  constraint salvage_yards_phone_check check (
    phone is null or btrim(phone) <> ''
  ),
  constraint salvage_yards_whatsapp_check check (
    whatsapp is null or btrim(whatsapp) <> ''
  ),
  constraint salvage_yards_status_check check (status in ('draft', 'active')),
  constraint salvage_yards_active_contact_check check (
    status <> 'active'
    or coalesce(nullif(btrim(phone), ''), nullif(btrim(whatsapp), '')) is not null
  )
);

create index salvage_yards_status_idx
  on public.salvage_yards (status);
create index salvage_yards_region_commune_idx
  on public.salvage_yards (region, commune);
create index salvage_yards_created_at_idx
  on public.salvage_yards (created_at desc);

create trigger salvage_yards_set_updated_at
  before update on public.salvage_yards
  for each row execute function public.set_updated_at();

create function public.prevent_salvage_yard_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'salvage yard owner cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger salvage_yards_prevent_owner_change
  before update of owner_id on public.salvage_yards
  for each row execute function public.prevent_salvage_yard_owner_change();

alter table public.listings
  add column salvage_yard_id uuid;

alter table public.listings
  add constraint listings_salvage_yard_owner_fk
  foreign key (salvage_yard_id, seller_id)
  references public.salvage_yards (id, owner_id)
  on delete restrict;

create index listings_salvage_yard_id_idx
  on public.listings (salvage_yard_id)
  where salvage_yard_id is not null;

create index listings_published_salvage_yard_created_at_idx
  on public.listings (salvage_yard_id, created_at desc)
  where status = 'published' and salvage_yard_id is not null;

alter table public.listings
  drop constraint listings_type_check,
  add constraint listings_type_check
    check (listing_type in ('part', 'accessory', 'vehicle'));

alter table public.salvage_yards enable row level security;

revoke all on table public.salvage_yards from public, anon, authenticated;
grant select, insert, update on table public.salvage_yards to authenticated;
grant select (
  id,
  business_name,
  description,
  logo_path,
  region,
  commune,
  public_address,
  phone,
  whatsapp,
  opening_hours,
  created_at
) on public.salvage_yards to anon;

create policy "salvage_yards_select_active"
  on public.salvage_yards
  for select
  to anon
  using (status = 'active');

create policy "salvage_yards_select_own"
  on public.salvage_yards
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "salvage_yards_insert_own"
  on public.salvage_yards
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "salvage_yards_update_own"
  on public.salvage_yards
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create function public.get_public_salvage_yard(target_salvage_yard_id uuid)
returns table (
  id uuid,
  business_name text,
  description text,
  logo_path text,
  region text,
  commune text,
  public_address text,
  phone text,
  whatsapp text,
  opening_hours text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
rows 1
as $$
  select
    yard.id,
    yard.business_name,
    yard.description,
    yard.logo_path,
    yard.region,
    yard.commune,
    yard.public_address,
    yard.phone,
    yard.whatsapp,
    yard.opening_hours,
    yard.created_at
  from public.salvage_yards as yard
  where yard.id = target_salvage_yard_id
    and yard.status = 'active'
  limit 1;
$$;

revoke all on function public.get_public_salvage_yard(uuid) from public;
grant execute on function public.get_public_salvage_yard(uuid)
  to anon, authenticated;
revoke execute on function public.prevent_salvage_yard_owner_change()
  from public, anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'salvage-yard-assets',
  'salvage-yard-assets',
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

create policy "Salvage yard owners can read asset metadata"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'salvage-yard-assets'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] = 'logo'
    and exists (
      select 1
      from public.salvage_yards as yard
      where yard.id::text = (storage.foldername(name))[1]
        and yard.owner_id = (select auth.uid())
    )
  );

create policy "Salvage yard owners can upload assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'salvage-yard-assets'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] = 'logo'
    and exists (
      select 1
      from public.salvage_yards as yard
      where yard.id::text = (storage.foldername(name))[1]
        and yard.owner_id = (select auth.uid())
    )
  );

create policy "Salvage yard owners can update assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'salvage-yard-assets'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] = 'logo'
    and exists (
      select 1
      from public.salvage_yards as yard
      where yard.id::text = (storage.foldername(name))[1]
        and yard.owner_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'salvage-yard-assets'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] = 'logo'
    and exists (
      select 1
      from public.salvage_yards as yard
      where yard.id::text = (storage.foldername(name))[1]
        and yard.owner_id = (select auth.uid())
    )
  );

create policy "Salvage yard owners can delete assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'salvage-yard-assets'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] = 'logo'
    and exists (
      select 1
      from public.salvage_yards as yard
      where yard.id::text = (storage.foldername(name))[1]
        and yard.owner_id = (select auth.uid())
    )
  );

commit;
