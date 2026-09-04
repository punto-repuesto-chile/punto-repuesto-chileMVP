begin;

create table public.content_moderation (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  target_part text,
  status text not null default 'active',
  origin_report_id uuid not null references public.reports (id),
  previous_content_status text,
  hidden_by uuid references public.profiles (id) on delete set null,
  hidden_at timestamptz not null default now(),
  restored_by uuid references public.profiles (id) on delete set null,
  restored_at timestamptz,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  constraint content_moderation_target_check check (
    (target_type in ('listing', 'review') and target_part is null)
    or (target_type = 'listing_question' and target_part in ('question', 'answer'))
  ),
  constraint content_moderation_status_check check (status in ('active', 'restored')),
  constraint content_moderation_restore_check check (
    (status = 'active' and restored_by is null and restored_at is null)
    or (status = 'restored' and restored_at is not null)
  ),
  constraint content_moderation_version_check check (version > 0)
);

create unique index content_moderation_one_active_target_idx
  on public.content_moderation (
    target_type,
    target_id,
    coalesce(target_part, '__content__')
  )
  where status = 'active';

create index content_moderation_target_history_idx
  on public.content_moderation (
    target_type,
    target_id,
    coalesce(target_part, '__content__'),
    version desc
  );

alter table public.content_moderation enable row level security;
revoke all on table public.content_moderation from public, anon, authenticated;

create function public.is_content_hidden(
  p_target_type text,
  p_target_id uuid,
  p_target_part text default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.content_moderation as moderation
    where moderation.target_type = p_target_type
      and moderation.target_id = p_target_id
      and moderation.target_part is not distinct from p_target_part
      and moderation.status = 'active'
  );
$$;

revoke all on function public.is_content_hidden(text, uuid, text) from public;
grant execute on function public.is_content_hidden(text, uuid, text)
  to anon, authenticated;

alter table public.moderation_actions
  add column content_moderation_id uuid
    references public.content_moderation (id) on delete restrict,
  add column target_type text,
  add column target_id uuid,
  add column target_part text,
  add column previous_content_state text,
  add column new_content_state text,
  add column content_status_snapshot jsonb;

alter table public.moderation_actions
  drop constraint moderation_actions_action_check,
  add constraint moderation_actions_action_check check (
    action in (
      'take_for_review', 'resolve', 'dismiss', 'hide_content', 'restore_content'
    )
  ),
  add constraint moderation_actions_content_target_check check (
    action not in ('hide_content', 'restore_content')
    or (
      content_moderation_id is not null
      and target_id is not null
      and content_status_snapshot is not null
      and (
        (target_type in ('listing', 'review') and target_part is null)
        or (
          target_type = 'listing_question'
          and target_part in ('question', 'answer')
        )
      )
    )
  );

create function public.prevent_moderation_action_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'moderation actions are append-only' using errcode = '42501';
end;
$$;

create trigger moderation_actions_append_only
  before update or delete on public.moderation_actions
  for each row execute function public.prevent_moderation_action_mutation();

revoke execute on function public.prevent_moderation_action_mutation()
  from public, anon, authenticated;

create function public.prevent_moderated_listing_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published'
    and public.is_content_hidden('listing', new.id, null) then
    raise exception 'content_unavailable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger listings_prevent_moderated_publish
  before insert or update of status on public.listings
  for each row execute function public.prevent_moderated_listing_publish();

revoke execute on function public.prevent_moderated_listing_publish()
  from public, anon, authenticated;

create function public.prevent_moderated_review_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_content_hidden('review', old.id, null)
    and new.status <> 'deleted'
    and (new.rating is distinct from old.rating or new.comment is distinct from old.comment) then
    raise exception 'content_unavailable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger reviews_prevent_moderated_edit
  before update on public.reviews
  for each row execute function public.prevent_moderated_review_edit();

revoke execute on function public.prevent_moderated_review_edit()
  from public, anon, authenticated;

create function public.prevent_moderated_question_answer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.answer is distinct from old.answer
    and public.is_content_hidden('listing_question', old.id, 'question') then
    raise exception 'content_unavailable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger listing_questions_prevent_moderated_answer
  before update of answer on public.listing_questions
  for each row execute function public.prevent_moderated_question_answer();

revoke execute on function public.prevent_moderated_question_answer()
  from public, anon, authenticated;

drop policy if exists "listings_select_published" on public.listings;
create policy "listings_select_published"
  on public.listings for select to anon, authenticated
  using (
    status = 'published'
    and not public.is_content_hidden('listing', id, null)
  );

drop policy if exists "listing_images_select_published" on public.listing_images;
create policy "listing_images_select_published"
  on public.listing_images for select to anon, authenticated
  using (
    exists (
      select 1
      from public.listings as listing
      where listing.id = listing_images.listing_id
        and listing.status = 'published'
        and not public.is_content_hidden('listing', listing.id, null)
    )
  );

drop policy if exists "reviews_select_published" on public.reviews;
create policy "reviews_select_published"
  on public.reviews for select to anon, authenticated
  using (
    status = 'published'
    and not public.is_content_hidden('review', id, null)
  );

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
    and not public.is_content_hidden('listing', listing.id, null)
    and btrim(coalesce(search_query, '')) <> ''
    and not exists (
      select 1
      from regexp_split_to_table(
        extensions.unaccent(lower(btrim(search_query))), E'\\s+'
      ) as search_word
      where search_word <> ''
        and strpos(
          extensions.unaccent(lower(concat_ws(
            ' ', listing.title, listing.category, listing.vehicle_brand,
            listing.vehicle_model, listing.oem_code, listing.region, listing.commune
          ))),
          search_word
        ) = 0
    );
$$;

create or replace function public.get_seller_reputation(p_seller_id uuid)
returns table (average_rating numeric, review_count bigint)
language sql stable security definer set search_path = ''
as $$
  select round(avg(review.rating)::numeric, 2), count(*)
  from public.reviews as review
  join public.review_interactions as interaction on interaction.id = review.interaction_id
  where interaction.reviewed_user_id = p_seller_id
    and review.status = 'published'
    and not public.is_content_hidden('review', review.id, null);
$$;

create or replace function public.get_salvage_yard_reputation(p_salvage_yard_id uuid)
returns table (average_rating numeric, review_count bigint)
language sql stable security definer set search_path = ''
as $$
  select round(avg(review.rating)::numeric, 2), count(*)
  from public.reviews as review
  join public.review_interactions as interaction on interaction.id = review.interaction_id
  where interaction.salvage_yard_id = p_salvage_yard_id
    and review.status = 'published'
    and not public.is_content_hidden('review', review.id, null);
$$;

create or replace function public.get_seller_reviews(
  p_seller_id uuid, p_limit integer default 10, p_offset integer default 0
)
returns table (
  id uuid, rating smallint, comment text, created_at timestamptz,
  updated_at timestamptz, reviewer_display_name text, reviewer_avatar_path text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_limit not between 1 and 50 or p_offset < 0 then
    raise exception 'invalid review pagination' using errcode = '22023';
  end if;
  return query
  select review.id, review.rating, review.comment, review.created_at,
    review.updated_at,
    coalesce(nullif(btrim(profile.public_display_name), ''), 'Usuario'),
    profile.public_avatar_path
  from public.reviews as review
  join public.review_interactions as interaction on interaction.id = review.interaction_id
  join public.profiles as profile on profile.id = review.reviewer_id
  where interaction.reviewed_user_id = p_seller_id
    and review.status = 'published'
    and not public.is_content_hidden('review', review.id, null)
  order by review.created_at desc limit p_limit offset p_offset;
end;
$$;

create or replace function public.get_salvage_yard_reviews(
  p_salvage_yard_id uuid, p_limit integer default 10, p_offset integer default 0
)
returns table (
  id uuid, rating smallint, comment text, created_at timestamptz,
  updated_at timestamptz, reviewer_display_name text, reviewer_avatar_path text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_limit not between 1 and 50 or p_offset < 0 then
    raise exception 'invalid review pagination' using errcode = '22023';
  end if;
  return query
  select review.id, review.rating, review.comment, review.created_at,
    review.updated_at,
    coalesce(nullif(btrim(profile.public_display_name), ''), 'Usuario'),
    profile.public_avatar_path
  from public.reviews as review
  join public.review_interactions as interaction on interaction.id = review.interaction_id
  join public.profiles as profile on profile.id = review.reviewer_id
  where interaction.salvage_yard_id = p_salvage_yard_id
    and review.status = 'published'
    and not public.is_content_hidden('review', review.id, null)
  order by review.created_at desc limit p_limit offset p_offset;
end;
$$;

create or replace function public.get_listing_reviews(
  p_listing_id uuid, p_limit integer default 10, p_offset integer default 0
)
returns table (
  id uuid, rating smallint, comment text, created_at timestamptz,
  public_display_name text, public_avatar_path text, total_count bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_limit not between 1 and 50 or p_offset < 0 then
    raise exception 'invalid review pagination' using errcode = '22023';
  end if;
  return query
  select review.id, review.rating, review.comment, review.created_at,
    coalesce(nullif(btrim(profile.public_display_name), ''), 'Usuario'),
    profile.public_avatar_path, count(*) over ()
  from public.reviews as review
  join public.review_interactions as interaction on interaction.id = review.interaction_id
  join public.profiles as profile on profile.id = review.reviewer_id
  where interaction.listing_id = p_listing_id
    and review.status = 'published'
    and not public.is_content_hidden('review', review.id, null)
  order by review.created_at desc limit p_limit offset p_offset;
end;
$$;

create or replace function public.get_listing_questions(
  p_listing_id uuid, p_limit integer default 10, p_offset integer default 0
)
returns table (
  question_id uuid, question text, created_at timestamptz, updated_at timestamptz,
  asker_display_name text, asker_avatar_path text, answer text,
  answered_at timestamptz, answer_updated_at timestamptz,
  answerer_identity_type text, answerer_display_name text,
  answerer_avatar_path text, total_count bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_limit not between 1 and 30 or p_offset < 0 then
    raise exception 'invalid question pagination' using errcode = '22023';
  end if;
  return query
  select question_row.id, question_row.question, question_row.created_at,
    question_row.updated_at, question_row.asker_name_snapshot,
    question_row.asker_avatar_path_snapshot,
    case when public.is_content_hidden('listing_question', question_row.id, 'answer')
      then null else question_row.answer end,
    case when public.is_content_hidden('listing_question', question_row.id, 'answer')
      then null else question_row.answered_at end,
    case when public.is_content_hidden('listing_question', question_row.id, 'answer')
      then null else question_row.answer_updated_at end,
    case when public.is_content_hidden('listing_question', question_row.id, 'answer')
      then null else question_row.answerer_identity_type end,
    case when public.is_content_hidden('listing_question', question_row.id, 'answer')
      then null else question_row.answerer_name_snapshot end,
    case when public.is_content_hidden('listing_question', question_row.id, 'answer')
      then null else question_row.answerer_avatar_path_snapshot end,
    count(*) over ()
  from public.listing_questions as question_row
  where question_row.listing_id = p_listing_id
    and question_row.status = 'published'
    and not public.is_content_hidden('listing_question', question_row.id, 'question')
  order by question_row.created_at desc, question_row.id desc
  limit p_limit offset p_offset;
end;
$$;

create function public.prevent_moderated_public_operation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_content_hidden('listing', new.listing_id, null) then
    raise exception 'content_unavailable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger listing_questions_prevent_moderated_create
  before insert on public.listing_questions
  for each row execute function public.prevent_moderated_public_operation();

create trigger conversations_prevent_moderated_create
  before insert on public.conversations
  for each row execute function public.prevent_moderated_public_operation();

revoke execute on function public.prevent_moderated_public_operation()
  from public, anon, authenticated;

create function public.admin_hide_report_target(
  p_report_id uuid,
  p_expected_report_status text,
  p_expected_moderation_version bigint default 0,
  p_note text default null
)
returns table (
  report_id uuid, report_status text, moderation_id uuid,
  moderation_state text, moderation_version bigint
)
language plpgsql security definer set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  actor_name text;
  expected_status text := lower(btrim(p_expected_report_status));
  normalized_note text := nullif(btrim(p_note), '');
  target_report public.reports%rowtype;
  current_hold public.content_moderation%rowtype;
  latest_version bigint;
  content_status text;
  content_snapshot jsonb;
  created_hold public.content_moderation%rowtype;
begin
  if actor_id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select membership.role into actor_role
  from public.moderation_memberships as membership
  where membership.user_id = actor_id and membership.revoked_at is null;
  if actor_role not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if expected_status not in ('pending', 'in_review') then
    raise exception 'report_status_conflict' using errcode = 'P0001';
  end if;
  if p_expected_moderation_version is null or p_expected_moderation_version < 0 then
    raise exception 'stale_state' using errcode = 'P0001';
  end if;
  if normalized_note is not null and char_length(normalized_note) > 2000 then
    raise exception 'invalid moderation note' using errcode = '22023';
  end if;

  select report.* into target_report
  from public.reports as report where report.id = p_report_id for update;
  if not found then raise exception 'report_not_found' using errcode = 'P0002'; end if;
  if target_report.status <> expected_status then
    raise exception 'report_status_conflict' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    target_report.target_type || ':' || target_report.target_id::text || ':' ||
      coalesce(nullif(target_report.target_part, 'content'), '__content__'), 0
  ));

  select moderation.* into current_hold
  from public.content_moderation as moderation
  where moderation.target_type = target_report.target_type
    and moderation.target_id = target_report.target_id
    and moderation.target_part is not distinct from
      case when target_report.target_part = 'content' then null else target_report.target_part end
    and moderation.status = 'active'
  for update;
  if found then raise exception 'content_already_hidden' using errcode = 'P0001'; end if;

  select coalesce(max(moderation.version), 0) into latest_version
  from public.content_moderation as moderation
  where moderation.target_type = target_report.target_type
    and moderation.target_id = target_report.target_id
    and moderation.target_part is not distinct from
      case when target_report.target_part = 'content' then null else target_report.target_part end;
  if latest_version <> p_expected_moderation_version then
    raise exception 'stale_state' using errcode = 'P0001';
  end if;

  if target_report.target_type = 'listing' then
    select listing.status,
      jsonb_build_object('status', listing.status, 'title', listing.title)
    into content_status, content_snapshot
    from public.listings as listing
    where listing.id = target_report.target_id for update;
  elsif target_report.target_type = 'review' then
    select review.status,
      jsonb_build_object('status', review.status, 'rating', review.rating)
    into content_status, content_snapshot
    from public.reviews as review
    where review.id = target_report.target_id for update;
    if found and content_status <> 'published' then
      raise exception 'content_unavailable' using errcode = 'P0001';
    end if;
  elsif target_report.target_type = 'listing_question'
    and target_report.target_part in ('question', 'answer') then
    select question.status,
      jsonb_build_object(
        'status', question.status,
        'has_answer', question.answer is not null
      )
    into content_status, content_snapshot
    from public.listing_questions as question
    where question.id = target_report.target_id for update;
    if found and (content_status <> 'published'
      or (target_report.target_part = 'answer'
        and not coalesce((content_snapshot ->> 'has_answer')::boolean, false))) then
      raise exception 'content_unavailable' using errcode = 'P0001';
    end if;
  else
    raise exception 'invalid_target_part' using errcode = '22023';
  end if;
  if not found then raise exception 'content_deleted' using errcode = 'P0002'; end if;

  select coalesce(nullif(btrim(profile.public_display_name), ''),
    nullif(btrim(profile.full_name), ''), 'Moderador')
  into actor_name from public.profiles as profile where profile.id = actor_id;
  actor_name := coalesce(actor_name, 'Moderador');

  begin
    insert into public.content_moderation (
      target_type, target_id, target_part, origin_report_id,
      previous_content_status, hidden_by, version
    ) values (
      target_report.target_type, target_report.target_id,
      case when target_report.target_part = 'content' then null else target_report.target_part end,
      target_report.id, content_status, actor_id, latest_version + 1
    ) returning * into created_hold;
  exception when unique_violation then
    raise exception 'moderation_hold_conflict' using errcode = 'P0001';
  end;

  update public.reports as report set
    status = 'resolved',
    assigned_to = coalesce(report.assigned_to, actor_id),
    reviewed_at = coalesce(report.reviewed_at, now()),
    resolved_at = now()
  where report.id = target_report.id;

  insert into public.moderation_actions (
    report_id, moderator_id, moderator_name_snapshot, action,
    previous_status, new_status, note, content_moderation_id,
    target_type, target_id, target_part, previous_content_state,
    new_content_state, content_status_snapshot
  ) values (
    target_report.id, actor_id, actor_name, 'hide_content',
    target_report.status, 'resolved', normalized_note, created_hold.id,
    target_report.target_type, target_report.target_id, created_hold.target_part,
    'visible', 'hidden', content_snapshot
  );

  return query select target_report.id, 'resolved'::text, created_hold.id,
    'hidden'::text, created_hold.version;
end;
$$;

create function public.admin_restore_report_target(
  p_report_id uuid,
  p_expected_moderation_version bigint,
  p_note text default null
)
returns table (
  report_id uuid, report_status text, moderation_id uuid,
  moderation_state text, moderation_version bigint
)
language plpgsql security definer set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  actor_name text;
  normalized_note text := nullif(btrim(p_note), '');
  target_report public.reports%rowtype;
  active_hold public.content_moderation%rowtype;
  target_still_exists boolean;
begin
  if actor_id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select membership.role into actor_role
  from public.moderation_memberships as membership
  where membership.user_id = actor_id and membership.revoked_at is null;
  if actor_role is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_expected_moderation_version is null or p_expected_moderation_version < 1 then
    raise exception 'stale_state' using errcode = 'P0001';
  end if;
  if normalized_note is not null and char_length(normalized_note) > 2000 then
    raise exception 'invalid moderation note' using errcode = '22023';
  end if;

  select report.* into target_report
  from public.reports as report where report.id = p_report_id for update;
  if not found then raise exception 'report_not_found' using errcode = 'P0002'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    target_report.target_type || ':' || target_report.target_id::text || ':' ||
      coalesce(nullif(target_report.target_part, 'content'), '__content__'), 0
  ));

  select moderation.* into active_hold
  from public.content_moderation as moderation
  where moderation.target_type = target_report.target_type
    and moderation.target_id = target_report.target_id
    and moderation.target_part is not distinct from
      case when target_report.target_part = 'content' then null else target_report.target_part end
    and moderation.status = 'active'
  for update;
  if not found then raise exception 'content_not_hidden' using errcode = 'P0001'; end if;
  if active_hold.version <> p_expected_moderation_version then
    raise exception 'stale_state' using errcode = 'P0001';
  end if;

  if target_report.target_type = 'listing' then
    perform 1 from public.listings where id = target_report.target_id for update;
  elsif target_report.target_type = 'review' then
    perform 1 from public.reviews where id = target_report.target_id for update;
  elsif target_report.target_type = 'listing_question' then
    perform 1 from public.listing_questions where id = target_report.target_id for update;
  else
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  target_still_exists := found;

  select coalesce(nullif(btrim(profile.public_display_name), ''),
    nullif(btrim(profile.full_name), ''), 'Moderador')
  into actor_name from public.profiles as profile where profile.id = actor_id;
  actor_name := coalesce(actor_name, 'Moderador');

  update public.content_moderation as moderation set
    status = 'restored', restored_by = actor_id, restored_at = now(),
    version = moderation.version + 1
  where moderation.id = active_hold.id
  returning * into active_hold;

  insert into public.moderation_actions (
    report_id, moderator_id, moderator_name_snapshot, action,
    previous_status, new_status, note, content_moderation_id,
    target_type, target_id, target_part, previous_content_state,
    new_content_state, content_status_snapshot
  ) values (
    target_report.id, actor_id, actor_name, 'restore_content',
    target_report.status, target_report.status, normalized_note, active_hold.id,
    target_report.target_type, target_report.target_id, active_hold.target_part,
    'hidden', 'restored', jsonb_build_object(
      'previous_content_status', active_hold.previous_content_status,
      'target_still_exists', target_still_exists
    )
  );

  return query select target_report.id, target_report.status, active_hold.id,
    'restored'::text, active_hold.version;
end;
$$;

revoke all on function public.admin_hide_report_target(uuid, text, bigint, text)
  from public, anon;
grant execute on function public.admin_hide_report_target(uuid, text, bigint, text)
  to authenticated;
revoke all on function public.admin_restore_report_target(uuid, bigint, text)
  from public, anon;
grant execute on function public.admin_restore_report_target(uuid, bigint, text)
  to authenticated;

drop function public.admin_get_report(uuid);
create function public.admin_get_report(p_report_id uuid)
returns table (
  id uuid, target_type text, target_part text, target_id uuid, reason text,
  details text, status text, created_at timestamptz, updated_at timestamptz,
  resolved_at timestamptz, assigned_to uuid, reviewed_at timestamptz,
  target_snapshot jsonb, reporter_id uuid, reporter_display_name text,
  subject_user_id uuid, subject_display_name text, target_exists boolean,
  current_target jsonb, action_history jsonb, moderation_state text,
  moderation_version bigint, moderation_origin_report_id uuid,
  moderation_hidden_at timestamptz, moderation_hidden_by_name text,
  moderation_id uuid
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_active_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_report_id is null or not exists (
    select 1 from public.reports where reports.id = p_report_id
  ) then raise exception 'report_not_found' using errcode = 'P0002'; end if;

  return query
  select report.id, report.target_type, report.target_part, report.target_id,
    report.reason, report.details, report.status, report.created_at,
    report.updated_at, report.resolved_at, report.assigned_to, report.reviewed_at,
    report.target_snapshot, report.reporter_id,
    case when report.reporter_id is null then 'Usuario eliminado'
      else coalesce(nullif(btrim(reporter.public_display_name), ''), 'Usuario') end,
    report.subject_user_id,
    case when report.subject_user_id is null then 'Usuario eliminado'
      else coalesce(nullif(btrim(subject.public_display_name), ''), 'Usuario') end,
    case when report.target_type = 'listing' then exists (
      select 1 from public.listings where listings.id = report.target_id)
      when report.target_type = 'review' then exists (
        select 1 from public.reviews where reviews.id = report.target_id)
      when report.target_part = 'question' then exists (
        select 1 from public.listing_questions where listing_questions.id = report.target_id)
      else exists (select 1 from public.listing_questions
        where listing_questions.id = report.target_id and answer is not null) end,
    case when report.target_type = 'listing' then (
      select jsonb_build_object('title', l.title, 'description', l.description,
        'price', l.price, 'category', l.category, 'status', l.status)
      from public.listings l where l.id = report.target_id)
      when report.target_type = 'review' then (
        select jsonb_build_object('rating', r.rating, 'comment', r.comment,
          'status', r.status, 'updated_at', r.updated_at)
        from public.reviews r where r.id = report.target_id)
      when report.target_part = 'question' then (
        select jsonb_build_object('question', q.question, 'status', q.status,
          'updated_at', q.updated_at)
        from public.listing_questions q where q.id = report.target_id)
      else (select jsonb_build_object('answer', q.answer,
        'answered_at', q.answered_at, 'status', q.status,
        'updated_at', q.updated_at, 'question_context', q.question)
        from public.listing_questions q
        where q.id = report.target_id and q.answer is not null) end,
    coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'moderator_id', a.moderator_id,
      'moderator_name', a.moderator_name_snapshot, 'action', a.action,
      'previous_status', a.previous_status, 'new_status', a.new_status,
      'note', a.note, 'created_at', a.created_at,
      'content_moderation_id', a.content_moderation_id,
      'previous_content_state', a.previous_content_state,
      'new_content_state', a.new_content_state
    ) order by a.created_at, a.id) from public.moderation_actions a
      where a.report_id = report.id), '[]'::jsonb),
    case when latest_moderation.id is null then 'none'
      when latest_moderation.status = 'active' then 'hidden' else 'restored' end,
    coalesce(latest_moderation.version, 0),
    latest_moderation.origin_report_id, latest_moderation.hidden_at,
    hidden_profile_name.display_name, latest_moderation.id
  from public.reports report
  left join public.profiles reporter on reporter.id = report.reporter_id
  left join public.profiles subject on subject.id = report.subject_user_id
  left join lateral (
    select cm.* from public.content_moderation cm
    where cm.target_type = report.target_type and cm.target_id = report.target_id
      and cm.target_part is not distinct from
        case when report.target_part = 'content' then null else report.target_part end
    order by cm.version desc, cm.created_at desc limit 1
  ) latest_moderation on true
  left join lateral (
    select coalesce(nullif(btrim(p.public_display_name), ''),
      nullif(btrim(p.full_name), ''), 'Moderador') as display_name
    from public.profiles p where p.id = latest_moderation.hidden_by
  ) hidden_profile_name on true
  where report.id = p_report_id;
end;
$$;

revoke all on function public.admin_get_report(uuid) from public, anon;
grant execute on function public.admin_get_report(uuid) to authenticated;

commit;
