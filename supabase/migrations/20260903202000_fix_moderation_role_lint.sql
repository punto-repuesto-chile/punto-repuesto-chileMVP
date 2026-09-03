begin;

create or replace function public.get_my_moderation_role()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  membership_role text;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select membership.role
  into membership_role
  from public.moderation_memberships as membership
  where membership.user_id = current_user_id
    and membership.revoked_at is null;

  return membership_role;
end;
$$;

revoke all on function public.get_my_moderation_role()
  from public, anon;
grant execute on function public.get_my_moderation_role()
  to authenticated;

commit;
