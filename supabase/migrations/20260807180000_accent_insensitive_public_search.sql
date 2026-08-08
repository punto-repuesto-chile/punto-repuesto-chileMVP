create extension if not exists unaccent with schema extensions;

create or replace function public.search_published_listing_ids(search_query text)
returns table (id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select listing.id
  from public.listings as listing
  where listing.status = 'published'
    and btrim(coalesce(search_query, '')) <> ''
    and not exists (
      select 1
      from regexp_split_to_table(
        extensions.unaccent(lower(btrim(search_query))),
        E'\\s+'
      ) as search_word
      where search_word <> ''
        and strpos(
          extensions.unaccent(
            lower(
              concat_ws(
                ' ',
                listing.title,
                listing.category,
                listing.vehicle_brand,
                listing.vehicle_model,
                listing.oem_code,
                listing.region,
                listing.commune
              )
            )
          ),
          search_word
        ) = 0
    );
$$;

revoke all on function public.search_published_listing_ids(text) from public;
grant execute on function public.search_published_listing_ids(text) to anon, authenticated;
