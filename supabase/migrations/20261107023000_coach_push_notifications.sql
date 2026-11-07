-- Push subscriptions and admin-only helper to read VAPID secrets.
-- The edge function notify-coach-message sends Web Push when a coach_messages row is created.

create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  lang text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists ps_sel on public.push_subscriptions;
drop policy if exists ps_ins on public.push_subscriptions;
drop policy if exists ps_upd on public.push_subscriptions;
drop policy if exists ps_del on public.push_subscriptions;

create policy ps_sel on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy ps_ins on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy ps_upd on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ps_del on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.push_subscriptions from public, anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
grant usage, select on sequence public.push_subscriptions_id_seq to authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'coach_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.coach_messages';
  end if;
end $$;

create or replace function hp_private.read_push_secrets()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pub text;
  priv text;
begin
  select ds.decrypted_secret into pub from vault.decrypted_secrets ds where ds.name = 'vapid_public_key' limit 1;
  select ds.decrypted_secret into priv from vault.decrypted_secrets ds where ds.name = 'vapid_private_key' limit 1;
  return jsonb_build_object('vapid_public', pub, 'vapid_private', priv);
end;
$$;

create or replace function public.read_push_secrets()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select hp_private.read_push_secrets();
$$;

revoke all on function hp_private.read_push_secrets() from public, anon, authenticated;
revoke all on function public.read_push_secrets() from public, anon, authenticated;
grant execute on function hp_private.read_push_secrets() to postgres, service_role;
grant execute on function public.read_push_secrets() to service_role;
