begin;

create table public.listing_questions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null
    references public.listings (id) on delete cascade,
  asker_id uuid
    references public.profiles (id) on delete set null,
  asker_name_snapshot text not null,
  asker_avatar_path_snapshot text,
  question text not null,
  answer text,
  answered_by uuid
    references public.profiles (id) on delete set null,
  answerer_identity_type text,
  answerer_name_snapshot text,
  answerer_avatar_path_snapshot text,
  answered_at timestamptz,
  answer_updated_at timestamptz,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint listing_questions_status_check
    check (status in ('published', 'hidden', 'deleted')),
  constraint listing_questions_asker_name_check
    check (
      asker_name_snapshot = btrim(asker_name_snapshot)
      and char_length(asker_name_snapshot) between 1 and 80
    ),
  constraint listing_questions_question_check
    check (
      question = btrim(question)
      and char_length(question) between 5 and 1000
    ),
  constraint listing_questions_answer_check
    check (
      answer is null
      or (
        answer = btrim(answer)
        and char_length(answer) between 1 and 2000
      )
    ),
  constraint listing_questions_answerer_type_check
    check (
      answerer_identity_type is null
      or answerer_identity_type in ('profile', 'salvage_yard')
    ),
  constraint listing_questions_answerer_name_check
    check (
      answerer_name_snapshot is null
      or (
        answerer_name_snapshot = btrim(answerer_name_snapshot)
        and char_length(answerer_name_snapshot) between 1 and 120
      )
    ),
  constraint listing_questions_answer_shape_check
    check (
      (
        answer is null
        and answered_by is null
        and answerer_identity_type is null
        and answerer_name_snapshot is null
        and answerer_avatar_path_snapshot is null
        and answered_at is null
        and answer_updated_at is null
      )
      or (
        answer is not null
        and answered_by is not null
        and answerer_identity_type is not null
        and answerer_name_snapshot is not null
        and answered_at is not null
        and (
          answer_updated_at is null
          or answer_updated_at >= answered_at
        )
      )
    )
);

create trigger listing_questions_set_updated_at
  before update on public.listing_questions
  for each row execute function public.set_updated_at();

create index listing_questions_public_listing_created_idx
  on public.listing_questions (listing_id, created_at desc, id desc)
  where status = 'published';

create index listing_questions_open_asker_listing_created_idx
  on public.listing_questions (asker_id, listing_id, created_at desc)
  where status = 'published' and answer is null;

alter table public.listing_questions enable row level security;

revoke all on table public.listing_questions
  from public, anon, authenticated;

create function public.create_listing_question(
  p_listing_id uuid,
  p_question text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_question text := btrim(p_question);
  target_listing public.listings%rowtype;
  target_yard public.salvage_yards%rowtype;
  asker_name text;
  asker_avatar text;
  recipient_id uuid;
  created_question_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if normalized_question is null
    or char_length(normalized_question) not between 5 and 1000 then
    raise exception 'question must contain between 5 and 1000 characters'
      using errcode = '22023';
  end if;

  select listing.*
  into target_listing
  from public.listings as listing
  where listing.id = p_listing_id;

  if not found or target_listing.status <> 'published' then
    raise exception 'listing is not available for questions'
      using errcode = '22023';
  end if;

  if target_listing.seller_id = current_user_id then
    raise exception 'seller cannot question own listing'
      using errcode = '42501';
  end if;

  if target_listing.salvage_yard_id is not null then
    select yard.*
    into target_yard
    from public.salvage_yards as yard
    where yard.id = target_listing.salvage_yard_id;

    if not found then
      raise exception 'listing salvage yard not found' using errcode = '23503';
    end if;

    if target_yard.owner_id = current_user_id then
      raise exception 'salvage yard owner cannot question own listing'
        using errcode = '42501';
    end if;

    recipient_id := target_yard.owner_id;
  else
    recipient_id := target_listing.seller_id;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  if exists (
    select 1
    from public.listing_questions as recent_question
    where recent_question.asker_id = current_user_id
      and recent_question.status = 'published'
      and recent_question.answer is null
      and recent_question.created_at > now() - interval '60 seconds'
  ) then
    raise exception 'question cooldown active' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.listing_questions as open_question
    where open_question.asker_id = current_user_id
      and open_question.listing_id = p_listing_id
      and open_question.status = 'published'
      and open_question.answer is null
  ) >= 5 then
    raise exception 'unanswered question limit reached' using errcode = 'P0001';
  end if;

  select
    coalesce(
      nullif(btrim(profile.public_display_name), ''),
      'Usuario'
    ),
    profile.public_avatar_path
  into asker_name, asker_avatar
  from public.profiles as profile
  where profile.id = current_user_id;

  if not found then
    raise exception 'asker profile not found' using errcode = '23503';
  end if;

  insert into public.listing_questions (
    listing_id,
    asker_id,
    asker_name_snapshot,
    asker_avatar_path_snapshot,
    question
  ) values (
    p_listing_id,
    current_user_id,
    asker_name,
    asker_avatar,
    normalized_question
  )
  returning id into created_question_id;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    entity_type,
    entity_id,
    action_path,
    source_type,
    source_id
  ) values (
    recipient_id,
    'new_question',
    'Nueva pregunta',
    'Recibiste una pregunta en una de tus publicaciones.',
    'listing_question',
    created_question_id,
    '/publicacion/' || p_listing_id::text
      || '?question=' || created_question_id::text || '#preguntas',
    'listing_question_created',
    created_question_id
  )
  on conflict (source_type, source_id) do nothing;

  return created_question_id;
end;
$$;

create function public.answer_listing_question(
  p_question_id uuid,
  p_answer text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_answer text := btrim(p_answer);
  target_question public.listing_questions%rowtype;
  target_listing public.listings%rowtype;
  target_yard public.salvage_yards%rowtype;
  responder_name text;
  responder_avatar text;
  responder_identity_type text;
  answer_time timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if normalized_answer is null
    or char_length(normalized_answer) not between 1 and 2000 then
    raise exception 'answer must contain between 1 and 2000 characters'
      using errcode = '22023';
  end if;

  select question_row.*
  into target_question
  from public.listing_questions as question_row
  where question_row.id = p_question_id
  for update;

  if not found or target_question.status <> 'published' then
    raise exception 'question not found or unavailable' using errcode = '42501';
  end if;

  if target_question.answer is not null then
    raise exception 'question already answered' using errcode = '23505';
  end if;

  select listing.*
  into target_listing
  from public.listings as listing
  where listing.id = target_question.listing_id;

  if not found then
    raise exception 'listing not found' using errcode = '23503';
  end if;

  if target_listing.salvage_yard_id is not null then
    select yard.*
    into target_yard
    from public.salvage_yards as yard
    where yard.id = target_listing.salvage_yard_id;

    if not found or target_yard.owner_id <> current_user_id then
      raise exception 'only the listing seller can answer this question'
        using errcode = '42501';
    end if;

    responder_identity_type := 'salvage_yard';
    responder_name := target_yard.business_name;
    responder_avatar := target_yard.logo_path;
  else
    if target_listing.seller_id <> current_user_id then
      raise exception 'only the listing seller can answer this question'
        using errcode = '42501';
    end if;

    select
      coalesce(
        nullif(btrim(profile.public_display_name), ''),
        'Vendedor'
      ),
      profile.public_avatar_path
    into responder_name, responder_avatar
    from public.profiles as profile
    where profile.id = current_user_id;

    if not found then
      raise exception 'seller profile not found' using errcode = '23503';
    end if;

    responder_identity_type := 'profile';
  end if;

  update public.listing_questions
  set
    answer = normalized_answer,
    answered_by = current_user_id,
    answerer_identity_type = responder_identity_type,
    answerer_name_snapshot = responder_name,
    answerer_avatar_path_snapshot = responder_avatar,
    answered_at = answer_time,
    answer_updated_at = null
  where id = target_question.id;

  if target_question.asker_id is not null
    and target_question.asker_id <> current_user_id then
    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      entity_type,
      entity_id,
      action_path,
      source_type,
      source_id
    ) values (
      target_question.asker_id,
      'question_answered',
      'Respondieron tu pregunta',
      'El vendedor respondió tu pregunta.',
      'listing_question',
      target_question.id,
      '/publicacion/' || target_question.listing_id::text
        || '?question=' || target_question.id::text || '#preguntas',
      'listing_question_answered',
      target_question.id
    )
    on conflict (source_type, source_id) do nothing;
  end if;

  return answer_time;
end;
$$;

create function public.get_listing_questions(
  p_listing_id uuid,
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  question_id uuid,
  question text,
  created_at timestamptz,
  updated_at timestamptz,
  asker_display_name text,
  asker_avatar_path text,
  answer text,
  answered_at timestamptz,
  answer_updated_at timestamptz,
  answerer_identity_type text,
  answerer_display_name text,
  answerer_avatar_path text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit not between 1 and 30 or p_offset < 0 then
    raise exception 'invalid question pagination' using errcode = '22023';
  end if;

  return query
  select
    question_row.id,
    question_row.question,
    question_row.created_at,
    question_row.updated_at,
    question_row.asker_name_snapshot,
    question_row.asker_avatar_path_snapshot,
    question_row.answer,
    question_row.answered_at,
    question_row.answer_updated_at,
    question_row.answerer_identity_type,
    question_row.answerer_name_snapshot,
    question_row.answerer_avatar_path_snapshot,
    count(*) over()
  from public.listing_questions as question_row
  where question_row.listing_id = p_listing_id
    and question_row.status = 'published'
  order by question_row.created_at desc, question_row.id desc
  limit p_limit offset p_offset;
end;
$$;

revoke all on function public.create_listing_question(uuid, text)
  from public;
revoke all on function public.answer_listing_question(uuid, text)
  from public;
revoke all on function public.get_listing_questions(uuid, integer, integer)
  from public;

grant execute on function public.create_listing_question(uuid, text)
  to authenticated;
grant execute on function public.answer_listing_question(uuid, text)
  to authenticated;
grant execute on function public.get_listing_questions(uuid, integer, integer)
  to anon, authenticated;

commit;
