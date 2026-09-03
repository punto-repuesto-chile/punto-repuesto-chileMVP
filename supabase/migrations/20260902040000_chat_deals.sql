begin;

alter table public.review_interactions
  add column conversation_id uuid references public.conversations (id) on delete set null,
  add column initiated_by uuid references public.profiles (id) on delete set null,
  add column initiator_role text;

alter table public.review_interactions
  add constraint review_interactions_initiator_role_check
    check (initiator_role is null or initiator_role in ('buyer', 'seller')),
  add constraint review_interactions_chat_shape_check check (
    (conversation_id is null and initiated_by is null and initiator_role is null)
    or (conversation_id is not null and initiated_by is not null and initiator_role is not null)
  );

create unique index review_interactions_conversation_unique_idx
  on public.review_interactions (conversation_id)
  where conversation_id is not null;

create function public.get_conversation_deal(p_conversation_id uuid)
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
  select * into target from public.conversations where id = p_conversation_id;
  if not found or current_user_id not in (target.buyer_id, target.seller_user_id) then
    raise exception 'conversation not found or user is not a participant' using errcode = '42501';
  end if;
  return query select interaction.id,
    case when interaction.status = 'pending' and interaction.expires_at <= now() then 'expired' else interaction.status end,
    interaction.initiated_by = current_user_id,
    case when target.buyer_id = current_user_id then 'buyer' else 'seller' end,
    exists(select 1 from public.messages where conversation_id = target.id and sender_role = 'buyer')
      and exists(select 1 from public.messages where conversation_id = target.id and sender_role = 'seller'),
    exists(select 1 from public.reviews where interaction_id = interaction.id and status <> 'deleted'),
    interaction.expires_at
  from (select 1) as seed
  left join public.review_interactions as interaction on interaction.conversation_id = target.id;
end;
$$;

create function public.propose_deal(p_conversation_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); target public.conversations%rowtype; created_id uuid; role text; recipient uuid;
begin
  if current_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into target from public.conversations where id = p_conversation_id for update;
  if not found or current_user_id not in (target.buyer_id, target.seller_user_id) then raise exception 'conversation not found or user is not a participant' using errcode = '42501'; end if;
  if not exists(select 1 from public.messages where conversation_id = target.id and sender_role = 'buyer')
    or not exists(select 1 from public.messages where conversation_id = target.id and sender_role = 'seller') then
    raise exception 'both participants must send a message before proposing a deal' using errcode = '22023';
  end if;
  role := case when current_user_id = target.buyer_id then 'buyer' else 'seller' end;
  recipient := case when role = 'buyer' then target.seller_user_id else target.buyer_id end;
  insert into public.review_interactions(listing_id, reviewer_id, reviewed_user_id, salvage_yard_id, status, conversation_id, initiated_by, initiator_role)
  values(target.listing_id, target.buyer_id,
    case when target.seller_identity_type = 'profile' then target.seller_user_id else null end,
    case when target.seller_identity_type = 'salvage_yard' then target.salvage_yard_id else null end,
    'pending', target.id, current_user_id, role)
  returning id into created_id;
  insert into public.notifications(user_id, type, title, body, entity_type, entity_id, action_path, source_type, source_id)
  values(recipient, 'deal_confirmation_requested', 'Confirmación de trato', 'La otra persona indicó que realizaron un trato.', 'review_interaction', created_id, '/mensajes/' || target.id::text, 'deal_requested', created_id)
  on conflict(source_type, source_id) do nothing;
  return created_id;
exception when unique_violation then raise exception 'a deal interaction already exists for this conversation' using errcode = '23505';
end;
$$;

create function public.respond_deal(p_interaction_id uuid, p_action text)
returns text language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); interaction public.review_interactions%rowtype; target public.conversations%rowtype; next_status text;
begin
  if current_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_action not in ('confirm', 'reject') then raise exception 'invalid deal action' using errcode = '22023'; end if;
  select * into interaction from public.review_interactions where id = p_interaction_id for update;
  if not found or interaction.conversation_id is null then raise exception 'deal interaction not found' using errcode = '42501'; end if;
  select * into target from public.conversations where id = interaction.conversation_id;
  if current_user_id not in (target.buyer_id, target.seller_user_id) then raise exception 'not a conversation participant' using errcode = '42501'; end if;
  if interaction.initiated_by = current_user_id then raise exception 'initiator cannot respond to own proposal' using errcode = '42501'; end if;
  if interaction.status <> 'pending' then return interaction.status; end if;
  if interaction.expires_at <= now() then update public.review_interactions set status = 'expired', updated_at = now() where id = interaction.id; return 'expired'; end if;
  next_status := case when p_action = 'confirm' then 'confirmed' else 'rejected' end;
  update public.review_interactions set status = next_status,
    confirmed_at = case when next_status = 'confirmed' then now() else null end,
    updated_at = now() where id = interaction.id;
  insert into public.notifications(user_id, type, title, body, entity_type, entity_id, action_path, source_type, source_id)
  values(interaction.initiated_by,
    case when next_status = 'confirmed' then 'deal_confirmed' else 'deal_rejected' end,
    case when next_status = 'confirmed' then 'Trato confirmado' else 'Trato rechazado' end,
    case when next_status = 'confirmed' then 'La otra persona confirmó el trato.' else 'La otra persona rechazó el trato.' end,
    'review_interaction', interaction.id, '/mensajes/' || target.id::text,
    case when next_status = 'confirmed' then 'deal_confirmed' else 'deal_rejected' end, interaction.id)
  on conflict(source_type, source_id) do nothing;
  return next_status;
end;
$$;

revoke all on function public.get_conversation_deal(uuid) from public;
revoke all on function public.propose_deal(uuid) from public;
revoke all on function public.respond_deal(uuid, text) from public;
grant execute on function public.get_conversation_deal(uuid) to authenticated;
grant execute on function public.propose_deal(uuid) to authenticated;
grant execute on function public.respond_deal(uuid, text) to authenticated;

commit;
