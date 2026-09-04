begin;

create function public.get_my_listing_moderation_states()
returns table (
  listing_id uuid,
  moderation_hidden boolean,
  hidden_at timestamptz,
  public_reason text
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

  return query
  select
    listing.id,
    true,
    moderation.hidden_at,
    case report.reason
      when 'fraud' then 'Posible contenido fraudulento'
      when 'spam' then 'Contenido considerado spam'
      when 'prohibited_item' then 'Contenido no permitido'
      when 'incorrect_information' then 'Información posiblemente incorrecta'
      when 'duplicate_content' then 'Contenido duplicado'
      when 'offensive_content' then 'Contenido ofensivo o inapropiado'
      when 'other' then 'Contenido sujeto a revisión de moderación'
      else 'Contenido sujeto a revisión de moderación'
    end
  from public.listings as listing
  join public.content_moderation as moderation
    on moderation.target_type = 'listing'
    and moderation.target_id = listing.id
    and moderation.target_part is null
    and moderation.status = 'active'
  join public.reports as report
    on report.id = moderation.origin_report_id
  where listing.seller_id = current_user_id;
end;
$$;

revoke all on function public.get_my_listing_moderation_states()
  from public, anon;
grant execute on function public.get_my_listing_moderation_states()
  to authenticated;

commit;
