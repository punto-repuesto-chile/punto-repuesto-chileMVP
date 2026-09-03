begin;

create table public.moderation_memberships (
  user_id uuid primary key
    references public.profiles (id) on delete cascade,
  role text not null,
  granted_by uuid
    references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint moderation_memberships_role_check
    check (role in ('moderator', 'admin')),
  constraint moderation_memberships_revocation_check
    check (revoked_at is null or revoked_at >= granted_at)
);

alter table public.moderation_memberships enable row level security;

revoke all on table public.moderation_memberships
  from public, anon, authenticated;

create function public.is_active_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.moderation_memberships as membership
      where membership.user_id = auth.uid()
        and membership.revoked_at is null
    );
$$;

revoke all on function public.is_active_moderator()
  from public, anon, authenticated;

create function public.get_my_moderation_role()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_role text;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select membership.role
  into current_role
  from public.moderation_memberships as membership
  where membership.user_id = current_user_id
    and membership.revoked_at is null;

  return current_role;
end;
$$;

revoke all on function public.get_my_moderation_role()
  from public, anon;
grant execute on function public.get_my_moderation_role()
  to authenticated;

commit;
