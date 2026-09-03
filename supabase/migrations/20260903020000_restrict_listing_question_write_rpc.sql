begin;

revoke execute on function public.create_listing_question(uuid, text)
  from public, anon;
revoke execute on function public.answer_listing_question(uuid, text)
  from public, anon;

grant execute on function public.create_listing_question(uuid, text)
  to authenticated;
grant execute on function public.answer_listing_question(uuid, text)
  to authenticated;

commit;
