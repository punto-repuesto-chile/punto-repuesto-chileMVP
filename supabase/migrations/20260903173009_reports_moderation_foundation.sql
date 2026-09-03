begin;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  target_part text not null,
  subject_user_id uuid references public.profiles (id) on delete set null,
  reason text not null,
  details text,
  target_snapshot jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,

  constraint reports_target_type_check
    check (target_type in ('listing', 'review', 'listing_question')),
  constraint reports_target_part_check check (
    (target_type in ('listing', 'review') and target_part = 'content')
    or (
      target_type = 'listing_question'
      and target_part in ('question', 'answer')
    )
  ),
  constraint reports_reason_check check (reason in (
    'spam',
    'fraud',
    'prohibited_item',
    'incorrect_information',
    'offensive_content',
    'harassment',
    'personal_data',
    'duplicate_content',
    'off_topic',
    'unrelated_to_transaction',
    'other'
  )),
  constraint reports_details_check check (
    details is null
    or (
      details = btrim(details)
      and char_length(details) between 1 and 1500
    )
  ),
  constraint reports_other_details_check check (
    reason <> 'other'
    or (details is not null and char_length(details) between 10 and 1500)
  ),
  constraint reports_snapshot_object_check
    check (jsonb_typeof(target_snapshot) = 'object'),
  constraint reports_status_check
    check (status in ('pending', 'in_review', 'resolved', 'dismissed')),
  constraint reports_resolution_check check (
    (status in ('pending', 'in_review') and resolved_at is null)
    or (status in ('resolved', 'dismissed') and resolved_at is not null)
  ),
  constraint reports_reporter_target_unique
    unique (reporter_id, target_type, target_id, target_part)
);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

create index reports_status_created_idx
  on public.reports (status, created_at);

create index reports_target_idx
  on public.reports (target_type, target_id);

create index reports_reporter_created_idx
  on public.reports (reporter_id, created_at);

create index reports_subject_created_idx
  on public.reports (subject_user_id, created_at);

alter table public.reports enable row level security;

revoke all on table public.reports from public, anon, authenticated;

create function public.create_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null,
  p_target_part text default 'content'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_target_type text := lower(btrim(p_target_type));
  normalized_target_part text := lower(btrim(p_target_part));
  normalized_reason text := lower(btrim(p_reason));
  normalized_details text := nullif(btrim(p_details), '');
  target_author_id uuid;
  target_snapshot jsonb;
  created_report_id uuid;
  target_listing public.listings%rowtype;
  target_review public.reviews%rowtype;
  target_interaction public.review_interactions%rowtype;
  target_question public.listing_questions%rowtype;
  author_public_name text;
  reviewed_subject_type text;
  reviewed_subject_name text;
begin
  if current_user_id is null then
    raise exception 'report authentication required' using errcode = '42501';
  end if;

  if p_target_id is null
    or normalized_target_type is null
    or normalized_target_part is null
    or normalized_reason is null then
    raise exception 'invalid report parameters' using errcode = '22023';
  end if;

  if normalized_target_type not in ('listing', 'review', 'listing_question') then
    raise exception 'invalid report target type' using errcode = '22023';
  end if;

  if not (
    (normalized_target_type in ('listing', 'review')
      and normalized_target_part = 'content')
    or (normalized_target_type = 'listing_question'
      and normalized_target_part in ('question', 'answer'))
  ) then
    raise exception 'invalid report target part' using errcode = '22023';
  end if;

  if normalized_target_type = 'listing'
    and normalized_reason not in (
      'spam', 'fraud', 'prohibited_item', 'incorrect_information',
      'duplicate_content', 'offensive_content', 'other'
    ) then
    raise exception 'invalid report reason for listing' using errcode = '22023';
  elsif normalized_target_type = 'review'
    and normalized_reason not in (
      'spam', 'fraud', 'offensive_content', 'harassment', 'personal_data',
      'unrelated_to_transaction', 'other'
    ) then
    raise exception 'invalid report reason for review' using errcode = '22023';
  elsif normalized_target_type = 'listing_question'
    and normalized_reason not in (
      'spam', 'offensive_content', 'harassment', 'personal_data',
      'off_topic', 'other'
    ) then
    raise exception 'invalid report reason for question' using errcode = '22023';
  end if;

  if p_details is not null and normalized_details is null then
    raise exception 'report details cannot be blank' using errcode = '22023';
  end if;

  if normalized_details is not null
    and char_length(normalized_details) > 1500 then
    raise exception 'report details cannot exceed 1500 characters'
      using errcode = '22023';
  end if;

  if normalized_reason = 'other'
    and (
      normalized_details is null
      or char_length(normalized_details) < 10
    ) then
    raise exception 'other report details must contain at least 10 characters'
      using errcode = '22023';
  end if;

  if normalized_target_type = 'listing' then
    select listing.*
    into target_listing
    from public.listings as listing
    where listing.id = p_target_id
      and listing.status = 'published';

    if not found then
      raise exception 'report target is not available' using errcode = 'P0002';
    end if;

    target_author_id := target_listing.seller_id;

    if target_listing.salvage_yard_id is not null then
      select yard.business_name
      into author_public_name
      from public.salvage_yards as yard
      where yard.id = target_listing.salvage_yard_id
        and yard.owner_id = target_listing.seller_id;
    else
      select coalesce(
        nullif(btrim(profile.public_display_name), ''),
        'Usuario'
      )
      into author_public_name
      from public.profiles as profile
      where profile.id = target_listing.seller_id;
    end if;

    target_snapshot := jsonb_build_object(
      'title', target_listing.title,
      'description', target_listing.description,
      'price', target_listing.price,
      'category', target_listing.category,
      'status', target_listing.status,
      'responsible_type', case
        when target_listing.salvage_yard_id is null then 'profile'
        else 'salvage_yard'
      end,
      'responsible_display_name', coalesce(author_public_name, 'Usuario')
    );
  elsif normalized_target_type = 'review' then
    select review.*
    into target_review
    from public.reviews as review
    where review.id = p_target_id
      and review.status = 'published';

    if not found then
      raise exception 'report target is not available' using errcode = 'P0002';
    end if;

    select interaction.*
    into target_interaction
    from public.review_interactions as interaction
    where interaction.id = target_review.interaction_id;

    if not found then
      raise exception 'report target is not available' using errcode = 'P0002';
    end if;

    target_author_id := target_review.reviewer_id;

    select coalesce(
      nullif(btrim(profile.public_display_name), ''),
      'Usuario'
    )
    into author_public_name
    from public.profiles as profile
    where profile.id = target_review.reviewer_id;

    if target_interaction.salvage_yard_id is not null then
      reviewed_subject_type := 'salvage_yard';
      select yard.business_name
      into reviewed_subject_name
      from public.salvage_yards as yard
      where yard.id = target_interaction.salvage_yard_id;
    else
      reviewed_subject_type := 'profile';
      select coalesce(
        nullif(btrim(profile.public_display_name), ''),
        'Usuario'
      )
      into reviewed_subject_name
      from public.profiles as profile
      where profile.id = target_interaction.reviewed_user_id;
    end if;

    target_snapshot := jsonb_build_object(
      'rating', target_review.rating,
      'comment', target_review.comment,
      'author_display_name', coalesce(author_public_name, 'Usuario'),
      'reviewed_subject_type', reviewed_subject_type,
      'reviewed_subject_display_name', coalesce(reviewed_subject_name, 'Usuario'),
      'status', target_review.status
    );
  else
    select question_row.*
    into target_question
    from public.listing_questions as question_row
    where question_row.id = p_target_id
      and question_row.status = 'published';

    if not found then
      raise exception 'report target is not available' using errcode = 'P0002';
    end if;

    if normalized_target_part = 'question' then
      target_author_id := target_question.asker_id;
      target_snapshot := jsonb_build_object(
        'question', target_question.question,
        'asker_display_name', target_question.asker_name_snapshot,
        'status', target_question.status
      );
    else
      if target_question.answer is null or target_question.answered_by is null then
        raise exception 'report target is not available' using errcode = 'P0002';
      end if;

      target_author_id := target_question.answered_by;
      target_snapshot := jsonb_build_object(
        'answer', target_question.answer,
        'answerer_identity_type', target_question.answerer_identity_type,
        'answerer_display_name', target_question.answerer_name_snapshot,
        'answered_at', target_question.answered_at,
        'question_context', target_question.question
      );
    end if;
  end if;

  if target_author_id = current_user_id then
    raise exception 'cannot report own content' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  if exists (
    select 1
    from public.reports as existing_report
    where existing_report.reporter_id = current_user_id
      and existing_report.target_type = normalized_target_type
      and existing_report.target_id = p_target_id
      and existing_report.target_part = normalized_target_part
  ) then
    raise exception 'report already exists' using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.reports as recent_report
    where recent_report.reporter_id = current_user_id
      and recent_report.created_at > now() - interval '30 seconds'
  ) then
    raise exception 'report cooldown active' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.reports as daily_report
    where daily_report.reporter_id = current_user_id
      and daily_report.created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'report daily limit reached' using errcode = 'P0001';
  end if;

  begin
    insert into public.reports (
      reporter_id,
      target_type,
      target_id,
      target_part,
      subject_user_id,
      reason,
      details,
      target_snapshot
    ) values (
      current_user_id,
      normalized_target_type,
      p_target_id,
      normalized_target_part,
      target_author_id,
      normalized_reason,
      normalized_details,
      target_snapshot
    )
    returning id into created_report_id;
  exception
    when unique_violation then
      raise exception 'report already exists' using errcode = '23505';
  end;

  return created_report_id;
end;
$$;

revoke all on function public.create_report(text, uuid, text, text, text)
  from public, anon;
grant execute on function public.create_report(text, uuid, text, text, text)
  to authenticated;

commit;
