begin;

create function public.get_conversation_context(p_conversation_id uuid)
returns table (
  conversation_id uuid,
  my_role text,
  counterparty_type text,
  counterparty_public_id uuid,
  counterparty_name text,
  counterparty_avatar_path text,
  listing_id uuid,
  listing_title_snapshot text,
  listing_image_path_snapshot text,
  seller_identity_type text
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

  if not exists (
    select 1
    from public.conversations as conversation
    where conversation.id = p_conversation_id
      and current_user_id in (conversation.buyer_id, conversation.seller_user_id)
  ) then
    raise exception 'conversation not found or user is not a participant'
      using errcode = '42501';
  end if;

  return query
  select
    conversation.id,
    case when conversation.buyer_id = current_user_id then 'buyer' else 'seller' end,
    case
      when conversation.buyer_id = current_user_id then conversation.seller_identity_type
      else 'profile'
    end,
    case
      when conversation.buyer_id = current_user_id
        and conversation.seller_identity_type = 'salvage_yard'
        then conversation.salvage_yard_id
      when conversation.buyer_id = current_user_id then conversation.seller_user_id
      else conversation.buyer_id
    end,
    case
      when conversation.buyer_id = current_user_id then conversation.seller_name_snapshot
      else coalesce(nullif(btrim(buyer_profile.public_display_name), ''), 'Usuario eliminado')
    end,
    case
      when conversation.buyer_id = current_user_id then conversation.seller_avatar_path_snapshot
      else buyer_profile.public_avatar_path
    end,
    conversation.listing_id,
    conversation.listing_title_snapshot,
    conversation.listing_image_path_snapshot,
    conversation.seller_identity_type
  from public.conversations as conversation
  left join public.profiles as buyer_profile on buyer_profile.id = conversation.buyer_id
  where conversation.id = p_conversation_id;
end;
$$;

revoke all on function public.get_conversation_context(uuid) from public;
grant execute on function public.get_conversation_context(uuid) to authenticated;

commit;
