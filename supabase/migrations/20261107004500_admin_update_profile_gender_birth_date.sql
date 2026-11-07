-- Allow the admin to correct a user's locked gender and birth date.
-- public.admin_update_profile is SECURITY INVOKER and delegates to
-- hp_private.admin_update_profile (DEFINER), which bypasses protect_profile
-- (that trigger only locks those columns for authenticated/anon).
-- If gender changes and the current goal is not valid for the new gender,
-- the goal is reset to the default for that gender.

create or replace function hp_private.admin_update_profile(
  p_user_id uuid,
  p_gender text,
  p_birth_date date
)
returns json
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_gender text := nullif(lower(trim(coalesce(p_gender, ''))), '');
  v_old public.profiles%rowtype;
  v_goal text;
  v_adjusted boolean := false;
begin
  perform public._require_admin();

  if v_gender is null or v_gender not in ('hombre', 'mujer') then
    raise exception 'Género no válido' using errcode = '22023';
  end if;

  if p_birth_date is null
     or p_birth_date > current_date
     or p_birth_date < (current_date - interval '120 years') then
    raise exception 'Fecha de nacimiento no válida' using errcode = '22023';
  end if;

  select * into v_old from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Usuario no encontrado' using errcode = '22023';
  end if;

  v_goal := v_old.goal;
  if v_gender is distinct from v_old.gender then
    if v_gender = 'mujer'
       and coalesce(v_goal, '') not in ('wellness', 'bikini', 'mujer_gluteos', 'mujer_tonificar', 'figure', 'womens_physique') then
      v_goal := 'mujer_tonificar';
      v_adjusted := v_goal is distinct from v_old.goal;
    elsif v_gender = 'hombre'
       and coalesce(v_goal, '') not in ('open', 'classic', 'mens_physique', 'ganar_masa') then
      v_goal := 'ganar_masa';
      v_adjusted := v_goal is distinct from v_old.goal;
    end if;
  end if;

  update public.profiles
     set gender = v_gender,
         birth_date = p_birth_date,
         goal = v_goal
   where id = p_user_id;

  return json_build_object(
    'ok', true,
    'goal_adjusted', v_adjusted,
    'goal', v_goal,
    'gender', v_gender,
    'birth_date', p_birth_date
  );
end;
$$;

create or replace function public.admin_update_profile(
  p_user_id uuid,
  p_gender text,
  p_birth_date date
)
returns json
language sql
security invoker
set search_path to ''
as $$
  select hp_private.admin_update_profile(p_user_id, p_gender, p_birth_date);
$$;

revoke all on function hp_private.admin_update_profile(uuid, text, date) from public;
grant execute on function hp_private.admin_update_profile(uuid, text, date) to authenticated;
revoke all on function public.admin_update_profile(uuid, text, date) from public, anon;
grant execute on function public.admin_update_profile(uuid, text, date) to authenticated;

drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table(
  id uuid,
  first_name text,
  last_name text,
  email text,
  gender text,
  birth_date date,
  goal text,
  activation_key text,
  key_revoked boolean,
  created_at timestamp with time zone,
  last_sign_in timestamp with time zone,
  last_activity timestamp with time zone,
  coach_today integer,
  is_admin boolean
)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform _require_admin();
  return query
  select p.id, p.first_name, p.last_name, p.email, p.gender, p.birth_date, p.goal, p.activation_key,
    (k.revoked_at is not null), p.created_at, u.last_sign_in_at,
    (select max(d.updated_at) from user_data d where d.user_id = p.id),
    coalesce((select c.count from coach_usage c where c.user_id = p.id
              and c.day = (now() at time zone 'America/Asuncion')::date), 0),
    p.is_admin
  from profiles p left join auth.users u on u.id = p.id
  left join activation_keys k on k.key = p.activation_key
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_list_users() to service_role;
