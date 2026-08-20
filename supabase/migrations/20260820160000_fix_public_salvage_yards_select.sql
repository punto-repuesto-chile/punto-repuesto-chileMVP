-- A table-level SELECT grant would also expose owner_id, status and updated_at;
-- column-level REVOKE cannot override a table-level grant. Keep anonymous
-- access restricted to the public directory fields. RLS remains responsible
-- for returning only rows whose status is active.
revoke select on table public.salvage_yards from anon;

grant select (
  id,
  business_name,
  description,
  logo_path,
  region,
  commune,
  public_address,
  phone,
  whatsapp,
  opening_hours,
  created_at
) on table public.salvage_yards to anon;
