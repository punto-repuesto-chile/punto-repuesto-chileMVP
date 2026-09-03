begin;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  buyer_id uuid references public.profiles (id) on delete set null,
  seller_user_id uuid references public.profiles (id) on delete set null,
  salvage_yard_id uuid references public.salvage_yards (id) on delete set null,
  seller_identity_type text not null,
  listing_title_snapshot text not null,
  listing_image_path_snapshot text,
  seller_name_snapshot text not null,
  seller_avatar_path_snapshot text,
  buyer_last_read_at timestamptz,
  seller_last_read_at timestamptz,
  last_message_at timestamptz,
  last_message_sender_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint conversations_seller_identity_type_check
    check (seller_identity_type in ('profile', 'salvage_yard')),
  constraint conversations_seller_identity_shape_check check (
    (seller_identity_type = 'profile' and salvage_yard_id is null)
    or seller_identity_type = 'salvage_yard'
  ),
  constraint conversations_not_self_check check (
    buyer_id is null
    or seller_user_id is null
    or buyer_id <> seller_user_id
  ),
  constraint conversations_listing_title_snapshot_check
    check (btrim(listing_title_snapshot) <> ''),
  constraint conversations_seller_name_snapshot_check
    check (btrim(seller_name_snapshot) <> ''),
  constraint conversations_last_message_role_check check (
    last_message_sender_role is null
    or last_message_sender_role in ('buyer', 'seller')
  ),
  constraint conversations_last_message_shape_check check (
    (last_message_at is null and last_message_sender_role is null)
    or (last_message_at is not null and last_message_sender_role is not null)
  ),
  constraint conversations_buyer_listing_unique unique (buyer_id, listing_id)
);

create index conversations_buyer_last_message_idx
  on public.conversations (buyer_id, last_message_at desc nulls last);

create index conversations_seller_last_message_idx
  on public.conversations (seller_user_id, last_message_at desc nulls last);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations (id) on delete restrict,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_role text not null,
  body text not null,
  created_at timestamptz not null default now(),

  constraint messages_sender_role_check
    check (sender_role in ('buyer', 'seller')),
  constraint messages_body_check check (
    btrim(body) <> '' and char_length(body) <= 3000
  )
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc, id desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on table public.conversations from public, anon, authenticated;
revoke all on table public.messages from public, anon, authenticated;

grant select on table public.conversations to authenticated;
grant select on table public.messages to authenticated;

create policy "conversations_select_participant"
  on public.conversations
  for select
  to authenticated
  using (
    (select auth.uid()) = buyer_id
    or (select auth.uid()) = seller_user_id
  );

create policy "messages_select_conversation_participant"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations as conversation
      where conversation.id = messages.conversation_id
        and (
          conversation.buyer_id = (select auth.uid())
          or conversation.seller_user_id = (select auth.uid())
        )
    )
  );

create function public.get_or_create_conversation(p_listing_id uuid)
returns table (
  id uuid,
  seller_identity_type text,
  counterpart_display_name text,
  counterpart_avatar_path text,
  listing_title text,
  listing_image_path text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_conversation public.conversations%rowtype;
  target_listing public.listings%rowtype;
  target_yard public.salvage_yards%rowtype;
  seller_public_name text;
  seller_public_avatar text;
  primary_image_path text;
  created_conversation public.conversations%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select conversation.*
  into existing_conversation
  from public.conversations as conversation
  where conversation.buyer_id = current_user_id
    and conversation.listing_id = p_listing_id;

  if found then
    return query
    select
      existing_conversation.id,
      existing_conversation.seller_identity_type,
      existing_conversation.seller_name_snapshot,
      existing_conversation.seller_avatar_path_snapshot,
      existing_conversation.listing_title_snapshot,
      existing_conversation.listing_image_path_snapshot,
      existing_conversation.created_at;
    return;
  end if;

  select listing.*
  into target_listing
  from public.listings as listing
  where listing.id = p_listing_id
    and listing.status = 'published';

  if not found then
    raise exception 'listing is not available for a new conversation'
      using errcode = 'P0002';
  end if;

  if target_listing.seller_id = current_user_id then
    raise exception 'users cannot start a conversation with themselves'
      using errcode = '42501';
  end if;

  select image.storage_path
  into primary_image_path
  from public.listing_images as image
  where image.listing_id = target_listing.id
  order by image.is_primary desc, image.position asc, image.created_at asc
  limit 1;

  if target_listing.salvage_yard_id is not null then
    select yard.*
    into target_yard
    from public.salvage_yards as yard
    where yard.id = target_listing.salvage_yard_id
      and yard.owner_id = target_listing.seller_id
      and yard.status = 'active';

    if not found then
      raise exception 'salvage yard is not available'
        using errcode = 'P0002';
    end if;

    seller_public_name := target_yard.business_name;
    seller_public_avatar := target_yard.logo_path;
  else
    select
      coalesce(nullif(btrim(profile.public_display_name), ''), 'Usuario'),
      profile.public_avatar_path
    into seller_public_name, seller_public_avatar
    from public.profiles as profile
    where profile.id = target_listing.seller_id;

    if not found then
      raise exception 'seller profile is not available'
        using errcode = 'P0002';
    end if;
  end if;

  insert into public.conversations (
    listing_id,
    buyer_id,
    seller_user_id,
    salvage_yard_id,
    seller_identity_type,
    listing_title_snapshot,
    listing_image_path_snapshot,
    seller_name_snapshot,
    seller_avatar_path_snapshot,
    buyer_last_read_at
  )
  values (
    target_listing.id,
    current_user_id,
    target_listing.seller_id,
    target_listing.salvage_yard_id,
    case
      when target_listing.salvage_yard_id is null then 'profile'
      else 'salvage_yard'
    end,
    target_listing.title,
    primary_image_path,
    seller_public_name,
    seller_public_avatar,
    now()
  )
  on conflict (buyer_id, listing_id) do nothing
  returning * into created_conversation;

  if created_conversation.id is null then
    select conversation.*
    into created_conversation
    from public.conversations as conversation
    where conversation.buyer_id = current_user_id
      and conversation.listing_id = target_listing.id;
  end if;

  return query
  select
    created_conversation.id,
    created_conversation.seller_identity_type,
    created_conversation.seller_name_snapshot,
    created_conversation.seller_avatar_path_snapshot,
    created_conversation.listing_title_snapshot,
    created_conversation.listing_image_path_snapshot,
    created_conversation.created_at;
end;
$$;

create function public.send_message(
  p_conversation_id uuid,
  p_body text
)
returns table (
  id uuid,
  sender_role text,
  body text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_body text := btrim(p_body);
  target_conversation public.conversations%rowtype;
  current_sender_role text;
  created_message public.messages%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_body is null or normalized_body = '' then
    raise exception 'message body cannot be empty' using errcode = '22023';
  end if;

  if char_length(normalized_body) > 3000 then
    raise exception 'message body cannot exceed 3000 characters'
      using errcode = '22023';
  end if;

  select conversation.*
  into target_conversation
  from public.conversations as conversation
  where conversation.id = p_conversation_id
  for update;

  if not found then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;

  if target_conversation.buyer_id = current_user_id then
    current_sender_role := 'buyer';
  elsif target_conversation.seller_user_id = current_user_id then
    current_sender_role := 'seller';
  else
    raise exception 'user is not a conversation participant'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.messages as message
    where message.conversation_id = target_conversation.id
      and message.sender_id = current_user_id
      and message.created_at > clock_timestamp() - interval '1 second'
  ) then
    raise exception 'message cooldown is active' using errcode = '42900';
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    sender_role,
    body
  )
  values (
    target_conversation.id,
    current_user_id,
    current_sender_role,
    normalized_body
  )
  returning * into created_message;

  update public.conversations as conversation
  set
    last_message_at = created_message.created_at,
    last_message_sender_role = current_sender_role
  where conversation.id = target_conversation.id;

  return query
  select
    created_message.id,
    created_message.sender_role,
    created_message.body,
    created_message.created_at;
end;
$$;

create function public.mark_conversation_read(p_conversation_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  read_timestamp timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.conversations as conversation
  set
    buyer_last_read_at = case
      when conversation.buyer_id = current_user_id then read_timestamp
      else conversation.buyer_last_read_at
    end,
    seller_last_read_at = case
      when conversation.seller_user_id = current_user_id then read_timestamp
      else conversation.seller_last_read_at
    end
  where conversation.id = p_conversation_id
    and current_user_id in (conversation.buyer_id, conversation.seller_user_id);

  if not found then
    raise exception 'conversation not found or user is not a participant'
      using errcode = '42501';
  end if;

  return read_timestamp;
end;
$$;

create function public.get_my_conversations(
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  counterpart_display_name text,
  counterpart_avatar_path text,
  listing_title text,
  listing_image_path text,
  last_message_preview text,
  last_message_at timestamptz,
  unread boolean,
  seller_identity_type text,
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
    raise exception 'invalid conversation pagination' using errcode = '22023';
  end if;

  return query
  select
    conversation.id,
    case
      when conversation.buyer_id = current_user_id then
        conversation.seller_name_snapshot
      else coalesce(
        nullif(btrim(buyer_profile.public_display_name), ''),
        'Usuario eliminado'
      )
    end,
    case
      when conversation.buyer_id = current_user_id then
        conversation.seller_avatar_path_snapshot
      else buyer_profile.public_avatar_path
    end,
    conversation.listing_title_snapshot,
    conversation.listing_image_path_snapshot,
    left(last_message.body, 160),
    conversation.last_message_at,
    case
      when conversation.buyer_id = current_user_id then
        conversation.last_message_sender_role = 'seller'
        and conversation.last_message_at > coalesce(
          conversation.buyer_last_read_at,
          '-infinity'::timestamptz
        )
      else
        conversation.last_message_sender_role = 'buyer'
        and conversation.last_message_at > coalesce(
          conversation.seller_last_read_at,
          '-infinity'::timestamptz
        )
    end,
    conversation.seller_identity_type,
    conversation.created_at
  from public.conversations as conversation
  left join public.profiles as buyer_profile
    on buyer_profile.id = conversation.buyer_id
  left join lateral (
    select message.body
    from public.messages as message
    where message.conversation_id = conversation.id
    order by message.created_at desc, message.id desc
    limit 1
  ) as last_message on true
  where current_user_id in (
    conversation.buyer_id,
    conversation.seller_user_id
  )
  order by conversation.last_message_at desc nulls last,
    conversation.created_at desc
  limit p_limit offset p_offset;
end;
$$;

create function public.get_conversation_messages(
  p_conversation_id uuid,
  p_before timestamptz default null,
  p_limit integer default 30
)
returns table (
  id uuid,
  sender_role text,
  body text,
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

  if p_limit not between 1 and 50 then
    raise exception 'invalid message pagination' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.conversations as conversation
    where conversation.id = p_conversation_id
      and current_user_id in (
        conversation.buyer_id,
        conversation.seller_user_id
      )
  ) then
    raise exception 'conversation not found or user is not a participant'
      using errcode = '42501';
  end if;

  return query
  select
    message.id,
    message.sender_role,
    message.body,
    message.created_at
  from public.messages as message
  where message.conversation_id = p_conversation_id
    and (p_before is null or message.created_at < p_before)
  order by message.created_at desc, message.id desc
  limit p_limit;
end;
$$;

create function public.get_unread_conversation_count()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  unread_count bigint;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select count(*)
  into unread_count
  from public.conversations as conversation
  where (
    conversation.buyer_id = current_user_id
    and conversation.last_message_sender_role = 'seller'
    and conversation.last_message_at > coalesce(
      conversation.buyer_last_read_at,
      '-infinity'::timestamptz
    )
  ) or (
    conversation.seller_user_id = current_user_id
    and conversation.last_message_sender_role = 'buyer'
    and conversation.last_message_at > coalesce(
      conversation.seller_last_read_at,
      '-infinity'::timestamptz
    )
  );

  return unread_count;
end;
$$;

revoke all on function public.get_or_create_conversation(uuid) from public;
grant execute on function public.get_or_create_conversation(uuid)
  to authenticated;

revoke all on function public.send_message(uuid, text) from public;
grant execute on function public.send_message(uuid, text) to authenticated;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

revoke all on function public.get_my_conversations(integer, integer)
  from public;
grant execute on function public.get_my_conversations(integer, integer)
  to authenticated;

revoke all on function public.get_conversation_messages(uuid, timestamptz, integer)
  from public;
grant execute on function public.get_conversation_messages(uuid, timestamptz, integer)
  to authenticated;

revoke all on function public.get_unread_conversation_count() from public;
grant execute on function public.get_unread_conversation_count()
  to authenticated;

commit;
