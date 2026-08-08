-- Expose only the fields deliberately approved for public seller profiles.
-- public.profiles remains private and its existing RLS policies are unchanged.
create or replace function public.get_public_seller_profile(
  target_seller_id uuid
)
returns table (
  id uuid,
  full_name text,
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
    profile.full_name,
    profile.created_at
  from public.profiles as profile
  where profile.id = target_seller_id
  limit 1;
$$;

revoke all on function public.get_public_seller_profile(uuid) from public;
grant execute on function public.get_public_seller_profile(uuid)
  to anon, authenticated;
