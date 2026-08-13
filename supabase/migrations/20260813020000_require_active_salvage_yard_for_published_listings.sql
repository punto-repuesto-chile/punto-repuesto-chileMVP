-- A commercial listing may only become public while its salvage yard is active.

begin;

create function public.require_active_salvage_yard_for_published_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.salvage_yard_id is not null and not exists (
    select 1
    from public.salvage_yards as yard
    where yard.id = new.salvage_yard_id
      and yard.owner_id = new.seller_id
      and yard.status = 'active'
  ) then
    raise exception 'published commercial listings require an active owned salvage yard'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger listings_require_active_salvage_yard
  before insert or update of status, salvage_yard_id, seller_id
  on public.listings
  for each row
  execute function public.require_active_salvage_yard_for_published_listing();

commit;
