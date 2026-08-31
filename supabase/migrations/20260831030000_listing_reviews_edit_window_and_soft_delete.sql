begin;

alter table public.reviews
  add column deleted_at timestamptz,
  drop constraint reviews_status_check,
  add constraint reviews_status_check
    check (status in ('published', 'hidden', 'deleted')),
  add constraint reviews_deleted_at_check check (
    (status = 'deleted' and deleted_at is not null)
    or (status <> 'deleted' and deleted_at is null)
  );

create or replace function public.enforce_review_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.interaction_id is distinct from old.interaction_id
    or new.reviewer_id is distinct from old.reviewer_id
    or new.created_at is distinct from old.created_at then
    raise exception 'review identity is immutable'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
    and not (old.status in ('published', 'hidden') and new.status = 'deleted') then
    raise exception 'invalid review status transition'
      using errcode = '22023';
  end if;

  if old.status = 'deleted' and new is distinct from old then
    raise exception 'deleted review is immutable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.update_own_review(
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
  target_review public.reviews%rowtype;
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

  select review.*
  into target_review
  from public.reviews as review
  where review.id = p_review_id
    and review.reviewer_id = current_user_id
  for update;

  if not found then
    raise exception 'review not found or not owned by current user'
      using errcode = '42501';
  end if;

  if target_review.status <> 'published' then
    raise exception 'only published reviews can be edited'
      using errcode = '22023';
  end if;

  if now() > target_review.created_at + interval '30 minutes' then
    raise exception 'review edit window has expired'
      using errcode = '22023';
  end if;

  return query
  update public.reviews as review
  set rating = p_rating, comment = normalized_comment
  where review.id = target_review.id
  returning
    review.id,
    review.interaction_id,
    review.rating,
    review.comment,
    review.status,
    review.created_at,
    review.updated_at;
end;
$$;

create or replace function public.delete_own_review(p_review_id uuid)
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

  update public.reviews as review
  set status = 'deleted', comment = null, deleted_at = now()
  where review.id = p_review_id
    and review.reviewer_id = current_user_id
    and review.status in ('published', 'hidden');

  return found;
end;
$$;

create function public.get_listing_reviews(
  p_listing_id uuid,
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  id uuid,
  rating smallint,
  comment text,
  created_at timestamptz,
  public_display_name text,
  public_avatar_path text,
  total_count bigint
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
    coalesce(nullif(btrim(profile.public_display_name), ''), 'Usuario'),
    profile.public_avatar_path,
    count(*) over () as total_count
  from public.reviews as review
  join public.review_interactions as interaction
    on interaction.id = review.interaction_id
  join public.profiles as profile
    on profile.id = review.reviewer_id
  where interaction.listing_id = p_listing_id
    and review.status = 'published'
  order by review.created_at desc
  limit p_limit offset p_offset;
end;
$$;

revoke all on function public.get_listing_reviews(uuid, integer, integer)
  from public;
grant execute on function public.get_listing_reviews(uuid, integer, integer)
  to anon, authenticated;

commit;
