-- Delete revoked activation keys from the admin panel.
-- public.admin_delete_key is SECURITY INVOKER and delegates to hp_private.admin_delete_key (DEFINER).
-- Only rows with revoked_at IS NOT NULL are removed. Requires public._require_admin().

create or replace function hp_private.admin_delete_key(p_key text)
returns void
language plpgsql
security definer
set search_path = public, hp_private
as $$
begin
  perform public._require_admin();
  delete from public.activation_keys
  where key = p_key
    and revoked_at is not null;
  if not found then
    raise exception 'only_revoked';
  end if;
end;
$$;

create or replace function public.admin_delete_key(p_key text)
returns void
language sql
security invoker
set search_path = public, hp_private
as $$
  select hp_private.admin_delete_key(p_key);
$$;

revoke all on function public.admin_delete_key(text) from public;
grant execute on function public.admin_delete_key(text) to authenticated;
