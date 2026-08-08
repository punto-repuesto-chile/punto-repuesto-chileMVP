create extension if not exists unaccent with schema extensions;

alter table public.listings
  add column if not exists search_normalized text;

update public.listings
set search_normalized = extensions.unaccent(
  lower(
    concat_ws(
      ' ',
      title,
      category,
      vehicle_brand,
      vehicle_model,
      oem_code,
      region,
      commune
    )
  )
);

alter table public.listings
  alter column search_normalized set not null;

create or replace function public.set_listing_search_normalized()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.search_normalized := extensions.unaccent(
    lower(
      concat_ws(
        ' ',
        new.title,
        new.category,
        new.vehicle_brand,
        new.vehicle_model,
        new.oem_code,
        new.region,
        new.commune
      )
    )
  );
  return new;
end;
$$;

drop trigger if exists listings_set_search_normalized on public.listings;

create trigger listings_set_search_normalized
before insert or update of
  title,
  category,
  vehicle_brand,
  vehicle_model,
  oem_code,
  region,
  commune
on public.listings
for each row
execute function public.set_listing_search_normalized();

revoke all on function public.set_listing_search_normalized() from public;
