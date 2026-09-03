begin;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  action_path text,
  source_type text not null,
  source_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in (
    'new_review',
    'deal_confirmation_requested',
    'deal_confirmed',
    'deal_rejected',
    'new_question',
    'question_answered'
  )),
  constraint notifications_title_check check (btrim(title) <> ''),
  constraint notifications_action_path_check check (
    action_path is null or action_path like '/%'
  ),
  constraint notifications_source_unique unique (source_type, source_id)
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index notifications_user_unread_created_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.create_new_review_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_interaction public.review_interactions%rowtype;
  recipient_id uuid;
  notification_title text;
  notification_body text;
  notification_path text;
begin
  if new.status <> 'published' then
    return new;
  end if;

  select interaction.*
  into target_interaction
  from public.review_interactions as interaction
  where interaction.id = new.interaction_id;

  if not found then
    return new;
  end if;

  if target_interaction.salvage_yard_id is not null then
    select yard.owner_id
    into recipient_id
    from public.salvage_yards as yard
    where yard.id = target_interaction.salvage_yard_id;

    notification_title := 'Nueva reseña en tu desarmaduría';
    notification_body := format(
      'Tu desarmaduría recibió una nueva reseña de %s estrellas.',
      new.rating
    );
    notification_path := '/desarmaduria/' || target_interaction.salvage_yard_id::text;
  else
    recipient_id := target_interaction.reviewed_user_id;
    notification_title := 'Nueva reseña';
    notification_body := format(
      'Recibiste una nueva reseña de %s estrellas.',
      new.rating
    );
    notification_path := '/vendedor/' || target_interaction.reviewed_user_id::text;
  end if;

  if recipient_id is null then
    return new;
  end if;

  insert into public.notifications (
    user_id, type, title, body, entity_type, entity_id,
    action_path, source_type, source_id
  ) values (
    recipient_id, 'new_review', notification_title, notification_body,
    'review', new.id, notification_path, 'review', new.id
  ) on conflict (source_type, source_id) do nothing;

  return new;
end;
$$;

create trigger reviews_create_notification
  after insert on public.reviews
  for each row execute function public.create_new_review_notification();

create function public.get_my_notifications(
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  type text,
  title text,
  body text,
  entity_type text,
  entity_id uuid,
  action_path text,
  read_at timestamptz,
  created_at timestamptz
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
  if p_limit not between 1 and 50 or p_offset < 0 then
    raise exception 'invalid notification pagination' using errcode = '22023';
  end if;
  return query
  select notification.id, notification.type, notification.title,
    notification.body, notification.entity_type, notification.entity_id,
    notification.action_path, notification.read_at, notification.created_at
  from public.notifications as notification
  where notification.user_id = current_user_id
  order by notification.created_at desc, notification.id desc
  limit p_limit offset p_offset;
end;
$$;

create function public.get_unread_notification_count()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  return (select count(*) from public.notifications as notification
    where notification.user_id = current_user_id and notification.read_at is null);
end;
$$;

create function public.mark_notification_read(p_notification_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare current_user_id uuid := auth.uid(); marked_at timestamptz;
begin
  if current_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update public.notifications set read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = current_user_id
  returning read_at into marked_at;
  if marked_at is null then raise exception 'notification not found' using errcode = '42501'; end if;
  return marked_at;
end;
$$;

create function public.mark_all_notifications_read()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare current_user_id uuid := auth.uid(); affected bigint;
begin
  if current_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update public.notifications set read_at = now()
  where user_id = current_user_id and read_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on table public.notifications from anon, authenticated;
grant select on table public.notifications to authenticated;
revoke all on function public.get_my_notifications(integer, integer) from public;
revoke all on function public.get_unread_notification_count() from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.get_my_notifications(integer, integer) to authenticated;
grant execute on function public.get_unread_notification_count() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

alter publication supabase_realtime add table public.notifications;

commit;
