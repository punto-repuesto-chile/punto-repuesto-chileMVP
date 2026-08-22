create function public.get_public_salvage_yards(
  p_region text default null,
  p_commune text default null
)
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
  where yard.status = 'active'
    and (
      nullif(btrim(p_region), '') is null
      or yard.region = btrim(p_region)
    )
    and (
      nullif(btrim(p_commune), '') is null
      or yard.commune = btrim(p_commune)
    )
  order by yard.created_at desc;
$$;
revoke all on function public.get_public_salvage_yards(text, text)
  from public;
grant execute on function public.get_public_salvage_yards(text, text)
  to anon, authenticated;
