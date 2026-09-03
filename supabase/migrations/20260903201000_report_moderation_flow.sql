begin;

alter table public.reports
  add column assigned_to uuid
    references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz;

create index reports_assigned_status_idx
  on public.reports (assigned_to, status)
  where assigned_to is not null;

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null
    references public.reports (id) on delete cascade,
  moderator_id uuid
    references public.profiles (id) on delete set null,
  moderator_name_snapshot text not null,
  action text not null,
  previous_status text,
  new_status text,
  note text,
  created_at timestamptz not null default now(),
  constraint moderation_actions_name_check
    check (btrim(moderator_name_snapshot) <> ''),
  constraint moderation_actions_action_check
    check (action in ('take_for_review', 'resolve', 'dismiss')),
  constraint moderation_actions_previous_status_check
    check (
      previous_status is null
      or previous_status in ('pending', 'in_review', 'resolved', 'dismissed')
    ),
  constraint moderation_actions_new_status_check
    check (
      new_status is null
      or new_status in ('pending', 'in_review', 'resolved', 'dismissed')
    ),
  constraint moderation_actions_note_check
    check (
      note is null
      or (
        note = btrim(note)
        and char_length(note) between 1 and 2000
      )
    )
);

create index moderation_actions_report_created_idx
  on public.moderation_actions (report_id, created_at, id);

alter table public.moderation_actions enable row level security;

revoke all on table public.moderation_actions
  from public, anon, authenticated;

create function public.admin_get_reports(
  p_status text default null,
  p_target_type text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  target_type text,
  target_part text,
  target_id uuid,
  reason text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  assigned_to uuid,
  reviewed_at timestamptz,
  has_details boolean,
  snapshot_summary jsonb,
  reporter_id uuid,
  reporter_display_name text,
  subject_user_id uuid,
  subject_display_name text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_status text := nullif(lower(btrim(p_status)), '');
  normalized_target_type text := nullif(lower(btrim(p_target_type)), '');
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not public.is_active_moderator() then
    raise exception 'moderation access required' using errcode = '42501';
  end if;

  if p_limit is null or p_limit not between 1 and 100
    or p_offset is null or p_offset < 0 then
    raise exception 'invalid report pagination' using errcode = '22023';
  end if;

  if normalized_status is not null
    and normalized_status not in ('pending', 'in_review', 'resolved', 'dismissed') then
    raise exception 'invalid report status filter' using errcode = '22023';
  end if;

  if normalized_target_type is not null
    and normalized_target_type not in ('listing', 'review', 'listing_question') then
    raise exception 'invalid report target filter' using errcode = '22023';
  end if;

  return query
  select
    report.id,
    report.target_type,
    report.target_part,
    report.target_id,
    report.reason,
    report.status,
    report.created_at,
    report.updated_at,
    report.resolved_at,
    report.assigned_to,
    report.reviewed_at,
    report.details is not null,
    case
      when report.target_type = 'listing' then
        jsonb_build_object('title', report.target_snapshot -> 'title')
      when report.target_type = 'review' then
        jsonb_build_object(
          'rating', report.target_snapshot -> 'rating',
          'comment', left(coalesce(report.target_snapshot ->> 'comment', ''), 180)
        )
      when report.target_part = 'question' then
        jsonb_build_object(
          'question', left(coalesce(report.target_snapshot ->> 'question', ''), 180)
        )
      else
        jsonb_build_object(
          'answer', left(coalesce(report.target_snapshot ->> 'answer', ''), 180)
        )
    end,
    report.reporter_id,
    case
      when report.reporter_id is null then 'Usuario eliminado'
      else coalesce(
        nullif(btrim(reporter.public_display_name), ''),
        'Usuario'
      )
    end,
    report.subject_user_id,
    case
      when report.subject_user_id is null then 'Usuario eliminado'
      else coalesce(
        nullif(btrim(subject.public_display_name), ''),
        'Usuario'
      )
    end,
    count(*) over ()
  from public.reports as report
  left join public.profiles as reporter on reporter.id = report.reporter_id
  left join public.profiles as subject on subject.id = report.subject_user_id
  where (normalized_status is null or report.status = normalized_status)
    and (
      normalized_target_type is null
      or report.target_type = normalized_target_type
    )
  order by report.created_at desc, report.id desc
  limit p_limit
  offset p_offset;
end;
$$;

create function public.admin_get_report(p_report_id uuid)
returns table (
  id uuid,
  target_type text,
  target_part text,
  target_id uuid,
  reason text,
  details text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  assigned_to uuid,
  reviewed_at timestamptz,
  target_snapshot jsonb,
  reporter_id uuid,
  reporter_display_name text,
  subject_user_id uuid,
  subject_display_name text,
  target_exists boolean,
  current_target jsonb,
  action_history jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not public.is_active_moderator() then
    raise exception 'moderation access required' using errcode = '42501';
  end if;

  if p_report_id is null then
    raise exception 'report not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.reports as existing where existing.id = p_report_id
  ) then
    raise exception 'report not found' using errcode = 'P0002';
  end if;

  return query
  select
    report.id,
    report.target_type,
    report.target_part,
    report.target_id,
    report.reason,
    report.details,
    report.status,
    report.created_at,
    report.updated_at,
    report.resolved_at,
    report.assigned_to,
    report.reviewed_at,
    report.target_snapshot,
    report.reporter_id,
    case
      when report.reporter_id is null then 'Usuario eliminado'
      else coalesce(nullif(btrim(reporter.public_display_name), ''), 'Usuario')
    end,
    report.subject_user_id,
    case
      when report.subject_user_id is null then 'Usuario eliminado'
      else coalesce(nullif(btrim(subject.public_display_name), ''), 'Usuario')
    end,
    case
      when report.target_type = 'listing' then exists (
        select 1 from public.listings as listing where listing.id = report.target_id
      )
      when report.target_type = 'review' then exists (
        select 1 from public.reviews as review where review.id = report.target_id
      )
      when report.target_part = 'question' then exists (
        select 1 from public.listing_questions as question
        where question.id = report.target_id
      )
      else exists (
        select 1 from public.listing_questions as question
        where question.id = report.target_id and question.answer is not null
      )
    end,
    case
      when report.target_type = 'listing' then (
        select jsonb_build_object(
          'title', listing.title,
          'description', listing.description,
          'price', listing.price,
          'category', listing.category,
          'status', listing.status
        )
        from public.listings as listing
        where listing.id = report.target_id
      )
      when report.target_type = 'review' then (
        select jsonb_build_object(
          'rating', review.rating,
          'comment', review.comment,
          'status', review.status,
          'updated_at', review.updated_at
        )
        from public.reviews as review
        where review.id = report.target_id
      )
      when report.target_part = 'question' then (
        select jsonb_build_object(
          'question', question.question,
          'status', question.status,
          'updated_at', question.updated_at
        )
        from public.listing_questions as question
        where question.id = report.target_id
      )
      else (
        select jsonb_build_object(
          'answer', question.answer,
          'answered_at', question.answered_at,
          'status', question.status,
          'updated_at', question.updated_at,
          'question_context', question.question
        )
        from public.listing_questions as question
        where question.id = report.target_id and question.answer is not null
      )
    end,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', action.id,
            'moderator_id', action.moderator_id,
            'moderator_name', action.moderator_name_snapshot,
            'action', action.action,
            'previous_status', action.previous_status,
            'new_status', action.new_status,
            'note', action.note,
            'created_at', action.created_at
          ) order by action.created_at, action.id
        )
        from public.moderation_actions as action
        where action.report_id = report.id
      ),
      '[]'::jsonb
    )
  from public.reports as report
  left join public.profiles as reporter on reporter.id = report.reporter_id
  left join public.profiles as subject on subject.id = report.subject_user_id
  where report.id = p_report_id;
end;
$$;

create function public.admin_update_report_status(
  p_report_id uuid,
  p_expected_status text,
  p_status text,
  p_note text default null
)
returns table (
  report_id uuid,
  status text,
  assigned_to uuid,
  reviewed_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_expected_status text := lower(btrim(p_expected_status));
  normalized_status text := lower(btrim(p_status));
  normalized_note text := nullif(btrim(p_note), '');
  target_report public.reports%rowtype;
  moderator_name text;
  action_name text;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not public.is_active_moderator() then
    raise exception 'moderation access required' using errcode = '42501';
  end if;

  if p_report_id is null
    or normalized_expected_status is null
    or normalized_status is null then
    raise exception 'invalid report status parameters' using errcode = '22023';
  end if;

  if normalized_expected_status not in ('pending', 'in_review', 'resolved', 'dismissed')
    or normalized_status not in ('pending', 'in_review', 'resolved', 'dismissed') then
    raise exception 'invalid report status' using errcode = '22023';
  end if;

  if normalized_note is not null and char_length(normalized_note) > 2000 then
    raise exception 'moderation note cannot exceed 2000 characters'
      using errcode = '22023';
  end if;

  select report.*
  into target_report
  from public.reports as report
  where report.id = p_report_id
  for update;

  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;

  if target_report.status <> normalized_expected_status then
    raise exception 'report status conflict' using errcode = 'P0001';
  end if;

  if target_report.status = normalized_status then
    return query select
      target_report.id,
      target_report.status,
      target_report.assigned_to,
      target_report.reviewed_at,
      target_report.resolved_at;
    return;
  end if;

  if not (
    (target_report.status = 'pending' and normalized_status in ('in_review', 'resolved', 'dismissed'))
    or (target_report.status = 'in_review' and normalized_status in ('resolved', 'dismissed'))
  ) then
    raise exception 'invalid report status transition' using errcode = '22023';
  end if;

  select coalesce(
    nullif(btrim(profile.public_display_name), ''),
    nullif(btrim(profile.full_name), ''),
    'Moderador'
  )
  into moderator_name
  from public.profiles as profile
  where profile.id = current_user_id;

  if moderator_name is null then
    moderator_name := 'Moderador';
  end if;

  action_name := case normalized_status
    when 'in_review' then 'take_for_review'
    when 'resolved' then 'resolve'
    else 'dismiss'
  end;

  update public.reports as report
  set
    status = normalized_status,
    assigned_to = case
      when target_report.status = 'pending' then current_user_id
      else target_report.assigned_to
    end,
    reviewed_at = coalesce(target_report.reviewed_at, now()),
    resolved_at = case
      when normalized_status in ('resolved', 'dismissed') then now()
      else null
    end
  where report.id = target_report.id
  returning report.* into target_report;

  insert into public.moderation_actions (
    report_id,
    moderator_id,
    moderator_name_snapshot,
    action,
    previous_status,
    new_status,
    note
  ) values (
    target_report.id,
    current_user_id,
    moderator_name,
    action_name,
    normalized_expected_status,
    normalized_status,
    normalized_note
  );

  return query select
    target_report.id,
    target_report.status,
    target_report.assigned_to,
    target_report.reviewed_at,
    target_report.resolved_at;
end;
$$;

revoke all on function public.admin_get_reports(text, text, integer, integer)
  from public, anon;
revoke all on function public.admin_get_report(uuid)
  from public, anon;
revoke all on function public.admin_update_report_status(uuid, text, text, text)
  from public, anon;

grant execute on function public.admin_get_reports(text, text, integer, integer)
  to authenticated;
grant execute on function public.admin_get_report(uuid)
  to authenticated;
grant execute on function public.admin_update_report_status(uuid, text, text, text)
  to authenticated;

commit;
