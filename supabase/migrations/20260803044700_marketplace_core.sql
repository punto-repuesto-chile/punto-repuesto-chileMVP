-- Punto Repuesto Chile: core marketplace schema.
-- Review and run manually in Supabase SQL Editor. This file does not create Storage buckets.

begin;

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles: private account data linked one-to-one with auth.users
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_path text,
  region text,
  commune text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users created before this migration.
insert into public.profiles (id, full_name)
select
  user_row.id,
  coalesce(
    nullif(btrim(user_row.raw_user_meta_data ->> 'full_name'), ''),
    ''
  )
from auth.users as user_row
on conflict (id) do nothing;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Listings
-- -----------------------------------------------------------------------------

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  listing_type text not null,
  title text not null,
  description text not null,
  category text not null,
  condition text not null,
  price bigint not null,
  stock integer not null default 1,
  vehicle_brand text,
  vehicle_model text,
  year_from smallint,
  year_to smallint,
  engine_version text,
  oem_code text,
  region text not null,
  commune text not null,
  delivery_methods text[] not null default '{}'::text[],
  contact_name text not null,
  contact_phone text not null,
  contact_email text,
  allow_whatsapp boolean not null default false,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint listings_type_check
    check (listing_type in ('part', 'accessory', 'vehicle', 'salvage_inventory')),
  constraint listings_title_not_blank
    check (btrim(title) <> ''),
  constraint listings_description_not_blank
    check (btrim(description) <> ''),
  constraint listings_category_not_blank
    check (btrim(category) <> ''),
  constraint listings_condition_check
    check (condition in ('new', 'used', 'refurbished')),
  constraint listings_price_positive
    check (price > 0),
  constraint listings_stock_nonnegative
    check (stock >= 0),
  constraint listings_year_from_range
    check (year_from is null or year_from between 1886 and 2100),
  constraint listings_year_to_range
    check (year_to is null or year_to between 1886 and 2100),
  constraint listings_year_order
    check (year_from is null or year_to is null or year_to >= year_from),
  constraint listings_region_not_blank
    check (btrim(region) <> ''),
  constraint listings_commune_not_blank
    check (btrim(commune) <> ''),
  constraint listings_delivery_methods_not_empty
    check (cardinality(delivery_methods) > 0),
  constraint listings_delivery_methods_allowed
    check (
      delivery_methods <@ array[
        'pickup',
        'shipping',
        'delivery_agreement'
      ]::text[]
    ),
  constraint listings_contact_name_not_blank
    check (btrim(contact_name) <> ''),
  constraint listings_contact_phone_not_blank
    check (btrim(contact_phone) <> ''),
  constraint listings_status_check
    check (status in ('draft', 'published', 'paused', 'sold'))
);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Listing image metadata. Storage objects will be configured separately.
-- -----------------------------------------------------------------------------

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),

  constraint listing_images_storage_path_not_blank
    check (btrim(storage_path) <> ''),
  constraint listing_images_position_nonnegative
    check (position >= 0),
  constraint listing_images_storage_path_unique
    unique (storage_path)
);

create unique index if not exists listing_images_one_primary_per_listing_idx
  on public.listing_images (listing_id)
  where is_primary;

create unique index if not exists listing_images_unique_position_per_listing_idx
  on public.listing_images (listing_id, position);

-- -----------------------------------------------------------------------------
-- Query indexes
-- -----------------------------------------------------------------------------

create index if not exists listings_seller_id_idx
  on public.listings (seller_id);
create index if not exists listings_status_idx
  on public.listings (status);
create index if not exists listings_type_idx
  on public.listings (listing_type);
create index if not exists listings_category_idx
  on public.listings (category);
create index if not exists listings_region_idx
  on public.listings (region);
create index if not exists listings_created_at_idx
  on public.listings (created_at desc);
create index if not exists listings_vehicle_brand_model_idx
  on public.listings (vehicle_brand, vehicle_model);

-- -----------------------------------------------------------------------------
-- Row Level Security and API privileges
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.listings from public, anon, authenticated;
revoke all on table public.listing_images from public, anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.listings to anon, authenticated;
grant insert, update, delete on table public.listings to authenticated;
grant select on table public.listing_images to anon, authenticated;
grant insert, update, delete on table public.listing_images to authenticated;

-- Profiles remain private: clients can only read or update their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Public listings are readable by everyone; sellers can also read all their own.
drop policy if exists "listings_select_published" on public.listings;
create policy "listings_select_published"
  on public.listings
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "listings_select_own" on public.listings;
create policy "listings_select_own"
  on public.listings
  for select
  to authenticated
  using ((select auth.uid()) = seller_id);

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own"
  on public.listings
  for insert
  to authenticated
  with check ((select auth.uid()) = seller_id);

drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_own"
  on public.listings
  for update
  to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);

drop policy if exists "listings_delete_own" on public.listings;
create policy "listings_delete_own"
  on public.listings
  for delete
  to authenticated
  using ((select auth.uid()) = seller_id);

-- Image metadata follows the visibility and ownership of its parent listing.
drop policy if exists "listing_images_select_published" on public.listing_images;
create policy "listing_images_select_published"
  on public.listing_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.listings as listing
      where listing.id = listing_images.listing_id
        and listing.status = 'published'
    )
  );

drop policy if exists "listing_images_select_own" on public.listing_images;
create policy "listing_images_select_own"
  on public.listing_images
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.listings as listing
      where listing.id = listing_images.listing_id
        and listing.seller_id = (select auth.uid())
    )
  );

drop policy if exists "listing_images_insert_own" on public.listing_images;
create policy "listing_images_insert_own"
  on public.listing_images
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.listings as listing
      where listing.id = listing_images.listing_id
        and listing.seller_id = (select auth.uid())
    )
  );

drop policy if exists "listing_images_update_own" on public.listing_images;
create policy "listing_images_update_own"
  on public.listing_images
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.listings as listing
      where listing.id = listing_images.listing_id
        and listing.seller_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.listings as listing
      where listing.id = listing_images.listing_id
        and listing.seller_id = (select auth.uid())
    )
  );

drop policy if exists "listing_images_delete_own" on public.listing_images;
create policy "listing_images_delete_own"
  on public.listing_images
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.listings as listing
      where listing.id = listing_images.listing_id
        and listing.seller_id = (select auth.uid())
    )
  );

-- Trigger functions are not callable through the Data API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

commit;
