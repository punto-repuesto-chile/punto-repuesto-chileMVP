create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint favorites_user_listing_unique unique (user_id, listing_id)
);

create index favorites_user_created_at_idx
  on public.favorites (user_id, created_at desc);

create index favorites_listing_id_idx
  on public.favorites (listing_id);

alter table public.favorites enable row level security;

revoke all on table public.favorites from public, anon, authenticated;
grant select, insert, delete on table public.favorites to authenticated;

create policy "favorites_select_own"
  on public.favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "favorites_insert_own"
  on public.favorites
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "favorites_delete_own"
  on public.favorites
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
