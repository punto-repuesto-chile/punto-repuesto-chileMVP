begin;

create or replace function public.enforce_review_interaction_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or (
      new.listing_id is distinct from old.listing_id
      and not (old.listing_id is not null and new.listing_id is null)
    )
    or new.reviewer_id is distinct from old.reviewer_id
    or new.reviewed_user_id is distinct from old.reviewed_user_id
    or new.salvage_yard_id is distinct from old.salvage_yard_id
    or new.requested_at is distinct from old.requested_at
    or new.expires_at is distinct from old.expires_at then
    raise exception 'review interaction identity is immutable'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status and (
    old.status <> 'pending'
    or new.status not in ('confirmed', 'rejected', 'expired')
  ) then
    raise exception 'invalid review interaction status transition'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

alter table public.reviews
  drop constraint reviews_interaction_reviewer_fk,
  add constraint reviews_interaction_reviewer_fk
    foreign key (interaction_id, reviewer_id)
    references public.review_interactions (id, reviewer_id)
    on delete cascade;

commit;
