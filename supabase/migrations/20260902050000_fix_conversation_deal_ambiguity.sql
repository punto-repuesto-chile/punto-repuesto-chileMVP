begin;

create or replace function public.get_conversation_deal(p_conversation_id uuid)
returns table (
  interaction_id uuid,
  status text,
  initiated_by_me boolean,
  my_role text,
  both_messaged boolean,
  has_review boolean,
  expires_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); target public.conversations%rowtype;
begin
  if current_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select conversation.* into target from public.conversations as conversation where conversation.id = p_conversation_id;
  if not found or current_user_id not in (target.buyer_id, target.seller_user_id) then
    raise exception 'conversation not found or user is not a participant' using errcode = '42501';
  end if;
  return query select deal_interaction.id,
    case when deal_interaction.status = 'pending' and deal_interaction.expires_at <= now() then 'expired' else deal_interaction.status end,
    deal_interaction.initiated_by = current_user_id,
    case when target.buyer_id = current_user_id then 'buyer' else 'seller' end,
    exists(select 1 from public.messages as buyer_message where buyer_message.conversation_id = target.id and buyer_message.sender_role = 'buyer')
      and exists(select 1 from public.messages as seller_message where seller_message.conversation_id = target.id and seller_message.sender_role = 'seller'),
    exists(select 1 from public.reviews as deal_review where deal_review.interaction_id = deal_interaction.id and deal_review.status <> 'deleted'),
    deal_interaction.expires_at
  from (select 1) as seed
  left join public.review_interactions as deal_interaction on deal_interaction.conversation_id = target.id;
end;
$$;

commit;
