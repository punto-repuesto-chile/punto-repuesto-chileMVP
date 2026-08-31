begin;

create table public.review_interactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewed_user_id uuid references public.profiles (id) on delete cascade,
  salvage_yard_id uuid references public.salvage_yards (id) on delete cascade,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  updated_at timestamptz not null default now(),

  constraint review_interactions_target_xor_check check (
    num_nonnulls(reviewed_user_id, salvage_yard_id) = 1
  ),
  constraint review_interactions_no_self_review_check check (
    reviewed_user_id is null or reviewer_id <> reviewed_user_id
  ),
  constraint review_interactions_status_check check (
    status in ('pending', 'confirmed', 'rejected', 'expired')
  ),
  constraint review_interactions_expiry_check check (
    expires_at > requested_at
  ),
  constraint review_interactions_confirmation_check check (
    (status = 'confirmed' and confirmed_at is not null)
    or (status <> 'confirmed' and confirmed_at is null)
  ),
  constraint review_interactions_id_reviewer_unique unique (id, reviewer_id)
);

create unique index review_interactions_one_open_per_listing_idx
  on public.review_interactions (reviewer_id, listing_id)
  where listing_id is not null and status in ('pending', 'confirmed');

create index review_interactions_reviewer_requested_idx
  on public.review_interactions (reviewer_id, requested_at desc);

create index review_interactions_user_target_pending_idx
  on public.review_interactions (reviewed_user_id, requested_at desc)
  where reviewed_user_id is not null and status = 'pending';

create index review_interactions_yard_target_pending_idx
  on public.review_interactions (salvage_yard_id, requested_at desc)
  where salvage_yard_id is not null and status = 'pending';

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid not null unique,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null,
  comment text,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reviews_interaction_reviewer_fk
    foreign key (interaction_id, reviewer_id)
    references public.review_interactions (id, reviewer_id)
    on delete restrict,
  constraint reviews_rating_check check (rating between 1 and 5),
  constraint reviews_comment_check check (
    comment is null
    or (
      btrim(comment) <> ''
      and char_length(comment) <= 1000
    )
  ),
  constraint reviews_status_check check (status in ('published', 'hidden'))
);

create index reviews_reviewer_created_idx
  on public.reviews (reviewer_id, created_at desc);

create index reviews_published_created_idx
  on public.reviews (created_at desc)
  where status = 'published';

create function public.enforce_review_interaction_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.listing_id is distinct from old.listing_id
    or new.reviewer_id is distinct from old.reviewer_id
    or new.reviewed_user_id is distinct from old.reviewed_user_id
    or new.salvage_yard_id is distinct from old.salvage_yard_id
    or new.requested_at is distinct from old.requested_at
    or new.expires_at is distinct from old.expires_at then
    raise exception 'review interaction identity is immutable'
      using errcode = '42501';
  end if;

  if old.status <> 'pending'
    or new.status not in ('confirmed', 'rejected', 'expired') then
    raise exception 'invalid review interaction status transition'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger review_interactions_enforce_update
  before update on public.review_interactions
  for each row execute function public.enforce_review_interaction_update();

create trigger review_interactions_set_updated_at
  before update on public.review_interactions
  for each row execute function public.set_updated_at();

create function public.enforce_review_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.interaction_id is distinct from old.interaction_id
    or new.reviewer_id is distinct from old.reviewer_id
    or new.status is distinct from old.status
    or new.created_at is distinct from old.created_at then
    raise exception 'review identity and moderation status are immutable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger reviews_enforce_update
  before update on public.reviews
  for each row execute function public.enforce_review_update();

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.review_interactions enable row level security;
alter table public.reviews enable row level security;

revoke all on table public.review_interactions from public, anon, authenticated;
revoke all on table public.reviews from public, anon, authenticated;

grant select on table public.review_interactions to authenticated;
grant select on table public.reviews to anon, authenticated;

create policy "review_interactions_select_as_reviewer"
  on public.review_interactions
  for select
  to authenticated
  using ((select auth.uid()) = reviewer_id);

create policy "review_interactions_select_as_seller"
  on public.review_interactions
  for select
  to authenticated
  using (
    reviewed_user_id = (select auth.uid())
    or exists (
      select 1
      from public.salvage_yards as yard
      where yard.id = review_interactions.salvage_yard_id
        and yard.owner_id = (select auth.uid())
    )
  );

create policy "reviews_select_published"
  on public.reviews
  for select
  to anon, authenticated
  using (status = 'published');

create policy "reviews_select_own"
  on public.reviews
  for select
  to authenticated
  using ((select auth.uid()) = reviewer_id);

create policy "reviews_delete_own"
  on public.reviews
  for delete
  to authenticated
  using ((select auth.uid()) = reviewer_id);

create function public.request_review_interaction(p_listing_id uuid)
returns table (
  id uuid,
  listing_id uuid,
  status text,
  requested_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_listing public.listings%rowtype;
  target_yard_owner_id uuid;
  created_interaction public.review_interactions%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select listing.*
  into target_listing
  from public.listings as listing
  where listing.id = p_listing_id
    and listing.status in ('published', 'sold');

  if not found then
    raise exception 'listing not available for review interaction'
      using errcode = 'P0002';
  end if;

  if target_listing.seller_id = current_user_id then
    raise exception 'users cannot request a review interaction with themselves'
      using errcode = '42501';
  end if;

  if target_listing.salvage_yard_id is not null then
    select yard.owner_id
    into target_yard_owner_id
    from public.salvage_yards as yard
    where yard.id = target_listing.salvage_yard_id
      and yard.status = 'active';

    if not found then
      raise exception 'salvage yard is not available'
        using errcode = 'P0002';
    end if;

    if target_yard_owner_id = current_user_id then
      raise exception 'owners cannot review their own salvage yard'
        using errcode = '42501';
    end if;
  end if;

  update public.review_interactions as interaction
  set status = 'expired'
  where interaction.reviewer_id = current_user_id
    and interaction.listing_id = p_listing_id
    and interaction.status = 'pending'
    and interaction.expires_at <= now();

  if exists (
    select 1
    from public.review_interactions as interaction
    where interaction.reviewer_id = current_user_id
      and interaction.listing_id = p_listing_id
      and (
        interaction.status in ('pending', 'confirmed')
        or interaction.expires_at > now()
      )
  ) then
    raise exception 'a recent review interaction already exists for this listing'
      using errcode = '23505';
  end if;

  insert into public.review_interactions (
    listing_id,
    reviewer_id,
    reviewed_user_id,
    salvage_yard_id,
    expires_at
  )
  values (
    target_listing.id,
    current_user_id,
    case
      when target_listing.salvage_yard_id is null
      then target_listing.seller_id
      else null
    end,
    target_listing.salvage_yard_id,
    now() + interval '7 days'
  )
  returning * into created_interaction;

  return query
  select
    created_interaction.id,
    created_interaction.listing_id,
    created_interaction.status,
    created_interaction.requested_at,
    created_interaction.expires_at;
end;
$$;

create function public.respond_review_interaction(
  p_interaction_id uuid,
  p_action text
)
returns table (
  id uuid,
  status text,
  confirmed_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_interaction public.review_interactions%rowtype;
  target_yard_owner_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_action not in ('confirm', 'reject') then
    raise exception 'action must be confirm or reject' using errcode = '22023';
  end if;

  select interaction.*
  into target_interaction
  from public.review_interactions as interaction
  where interaction.id = p_interaction_id
  for update;

  if not found then
    raise exception 'review interaction not found' using errcode = 'P0002';
  end if;

  if target_interaction.reviewed_user_id is not null then
    if target_interaction.reviewed_user_id <> current_user_id then
      raise exception 'only the corresponding seller can respond'
        using errcode = '42501';
    end if;
  else
    select yard.owner_id
    into target_yard_owner_id
    from public.salvage_yards as yard
    where yard.id = target_interaction.salvage_yard_id;

    if target_yard_owner_id is distinct from current_user_id then
      raise exception 'only the salvage yard owner can respond'
        using errcode = '42501';
    end if;
  end if;

  if target_interaction.status <> 'pending' then
    raise exception 'review interaction is no longer pending'
      using errcode = '22023';
  end if;

  if target_interaction.expires_at <= now() then
    update public.review_interactions
    set status = 'expired'
    where review_interactions.id = target_interaction.id;

    return query
    select
      target_interaction.id,
      'expired'::text,
      null::timestamptz,
      target_interaction.expires_at;
    return;
  end if;

  update public.review_interactions
  set
    status = case when p_action = 'confirm' then 'confirmed' else 'rejected' end,
    confirmed_at = case when p_action = 'confirm' then now() else null end
  where review_interactions.id = target_interaction.id
  returning
    review_interactions.id,
    review_interactions.status,
    review_interactions.confirmed_at,
    review_interactions.expires_at
  into id, status, confirmed_at, expires_at;

  return next;
end;
$$;

create function public.create_review_from_interaction(
  p_interaction_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns table (
  id uuid,
  interaction_id uuid,
  rating smallint,
  comment text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_interaction public.review_interactions%rowtype;
  created_review public.reviews%rowtype;
  normalized_comment text := nullif(btrim(p_comment), '');
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_rating not between 1 and 5 then
    raise exception 'rating must be between 1 and 5' using errcode = '22023';
  end if;

  if p_comment is not null and normalized_comment is null then
    raise exception 'comment cannot be blank' using errcode = '22023';
  end if;

  if normalized_comment is not null and char_length(normalized_comment) > 1000 then
    raise exception 'comment cannot exceed 1000 characters'
      using errcode = '22023';
  end if;

  select interaction.*
  into target_interaction
  from public.review_interactions as interaction
  where interaction.id = p_interaction_id
    and interaction.reviewer_id = current_user_id;

  if not found then
    raise exception 'review interaction does not belong to the current user'
      using errcode = '42501';
  end if;

  if target_interaction.status <> 'confirmed' then
    raise exception 'a confirmed interaction is required'
      using errcode = '22023';
  end if;

  if target_interaction.expires_at <= now() then
    raise exception 'the review interaction has expired'
      using errcode = '22023';
  end if;

  insert into public.reviews (interaction_id, reviewer_id, rating, comment)
  values (
    target_interaction.id,
    current_user_id,
    p_rating,
    normalized_comment
  )
  returning * into created_review;

  return query
  select
    created_review.id,
    created_review.interaction_id,
    created_review.rating,
    created_review.comment,
    created_review.status,
    created_review.created_at,
    created_review.updated_at;
end;
$$;

create function public.update_own_review(
  p_review_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns table (
  id uuid,
  interaction_id uuid,
  rating smallint,
  comment text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_comment text := nullif(btrim(p_comment), '');
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_rating not between 1 and 5 then
    raise exception 'rating must be between 1 and 5' using errcode = '22023';
  end if;

  if p_comment is not null and normalized_comment is null then
    raise exception 'comment cannot be blank' using errcode = '22023';
  end if;

  if normalized_comment is not null and char_length(normalized_comment) > 1000 then
    raise exception 'comment cannot exceed 1000 characters'
      using errcode = '22023';
  end if;

  return query
  update public.reviews as review
  set rating = p_rating, comment = normalized_comment
  where review.id = p_review_id
    and review.reviewer_id = current_user_id
  returning
    review.id,
    review.interaction_id,
    review.rating,
    review.comment,
    review.status,
    review.created_at,
    review.updated_at;

  if not found then
    raise exception 'review not found or not owned by current user'
      using errcode = '42501';
  end if;
end;
$$;

create function public.delete_own_review(p_review_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  delete from public.reviews as review
  where review.id = p_review_id
    and review.reviewer_id = current_user_id;

  return found;
end;
$$;

create function public.get_my_review_interactions(p_direction text)
returns table (
  id uuid,
  listing_id uuid,
  listing_title text,
  direction text,
  target_type text,
  status text,
  requested_at timestamptz,
  confirmed_at timestamptz,
  expires_at timestamptz,
  counterpart_display_name text,
  counterpart_avatar_path text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_direction not in ('sent', 'received') then
    raise exception 'direction must be sent or received' using errcode = '22023';
  end if;

  return query
  select
    interaction.id,
    interaction.listing_id,
    listing.title,
    p_direction,
    case
      when interaction.salvage_yard_id is null then 'seller'
      else 'salvage_yard'
    end,
    case
      when interaction.status = 'pending' and interaction.expires_at <= now()
      then 'expired'
      else interaction.status
    end,
    interaction.requested_at,
    interaction.confirmed_at,
    interaction.expires_at,
    case
      when p_direction = 'received'
      then coalesce(nullif(btrim(reviewer.public_display_name), ''), 'Usuario')
      when interaction.salvage_yard_id is not null
      then yard.business_name
      else coalesce(nullif(btrim(seller.public_display_name), ''), 'Vendedor')
    end,
    case
      when p_direction = 'received' then reviewer.public_avatar_path
      when interaction.salvage_yard_id is null then seller.public_avatar_path
      else yard.logo_path
    end
  from public.review_interactions as interaction
  left join public.listings as listing on listing.id = interaction.listing_id
  join public.profiles as reviewer on reviewer.id = interaction.reviewer_id
  left join public.profiles as seller on seller.id = interaction.reviewed_user_id
  left join public.salvage_yards as yard on yard.id = interaction.salvage_yard_id
  where (
    p_direction = 'sent'
    and interaction.reviewer_id = current_user_id
  ) or (
    p_direction = 'received'
    and (
      interaction.reviewed_user_id = current_user_id
      or yard.owner_id = current_user_id
    )
  )
  order by interaction.requested_at desc;
end;
$$;

create function public.get_seller_reputation(p_seller_id uuid)
returns table (average_rating numeric, review_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    round(avg(review.rating)::numeric, 2),
    count(*)
  from public.reviews as review
  join public.review_interactions as interaction
    on interaction.id = review.interaction_id
  where interaction.reviewed_user_id = p_seller_id
    and review.status = 'published';
$$;

create function public.get_salvage_yard_reputation(p_salvage_yard_id uuid)
returns table (average_rating numeric, review_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    round(avg(review.rating)::numeric, 2),
    count(*)
  from public.reviews as review
  join public.review_interactions as interaction
    on interaction.id = review.interaction_id
  where interaction.salvage_yard_id = p_salvage_yard_id
    and review.status = 'published';
$$;

create function public.get_seller_reviews(
  p_seller_id uuid,
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  id uuid,
  rating smallint,
  comment text,
  created_at timestamptz,
  updated_at timestamptz,
  reviewer_display_name text,
  reviewer_avatar_path text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit not between 1 and 50 or p_offset < 0 then
    raise exception 'invalid review pagination' using errcode = '22023';
  end if;

  return query
  select
    review.id,
    review.rating,
    review.comment,
    review.created_at,
    review.updated_at,
    coalesce(nullif(btrim(profile.public_display_name), ''), 'Usuario'),
    profile.public_avatar_path
  from public.reviews as review
  join public.review_interactions as interaction
    on interaction.id = review.interaction_id
  join public.profiles as profile on profile.id = review.reviewer_id
  where interaction.reviewed_user_id = p_seller_id
    and review.status = 'published'
  order by review.created_at desc
  limit p_limit offset p_offset;
end;
$$;

create function public.get_salvage_yard_reviews(
  p_salvage_yard_id uuid,
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  id uuid,
  rating smallint,
  comment text,
  created_at timestamptz,
  updated_at timestamptz,
  reviewer_display_name text,
  reviewer_avatar_path text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit not between 1 and 50 or p_offset < 0 then
    raise exception 'invalid review pagination' using errcode = '22023';
  end if;

  return query
  select
    review.id,
    review.rating,
    review.comment,
    review.created_at,
    review.updated_at,
    coalesce(nullif(btrim(profile.public_display_name), ''), 'Usuario'),
    profile.public_avatar_path
  from public.reviews as review
  join public.review_interactions as interaction
    on interaction.id = review.interaction_id
  join public.profiles as profile on profile.id = review.reviewer_id
  where interaction.salvage_yard_id = p_salvage_yard_id
    and review.status = 'published'
  order by review.created_at desc
  limit p_limit offset p_offset;
end;
$$;

revoke execute on function public.enforce_review_interaction_update()
  from public, anon, authenticated;
revoke execute on function public.enforce_review_update()
  from public, anon, authenticated;

revoke all on function public.request_review_interaction(uuid) from public;
grant execute on function public.request_review_interaction(uuid) to authenticated;

revoke all on function public.respond_review_interaction(uuid, text) from public;
grant execute on function public.respond_review_interaction(uuid, text) to authenticated;

revoke all on function public.create_review_from_interaction(uuid, smallint, text)
  from public;
grant execute on function public.create_review_from_interaction(uuid, smallint, text)
  to authenticated;

revoke all on function public.update_own_review(uuid, smallint, text) from public;
grant execute on function public.update_own_review(uuid, smallint, text)
  to authenticated;

revoke all on function public.delete_own_review(uuid) from public;
grant execute on function public.delete_own_review(uuid) to authenticated;

revoke all on function public.get_my_review_interactions(text) from public;
grant execute on function public.get_my_review_interactions(text) to authenticated;

revoke all on function public.get_seller_reputation(uuid) from public;
grant execute on function public.get_seller_reputation(uuid) to anon, authenticated;

revoke all on function public.get_salvage_yard_reputation(uuid) from public;
grant execute on function public.get_salvage_yard_reputation(uuid)
  to anon, authenticated;

revoke all on function public.get_seller_reviews(uuid, integer, integer)
  from public;
grant execute on function public.get_seller_reviews(uuid, integer, integer)
  to anon, authenticated;

revoke all on function public.get_salvage_yard_reviews(uuid, integer, integer)
  from public;
grant execute on function public.get_salvage_yard_reviews(uuid, integer, integer)
  to anon, authenticated;

commit;
