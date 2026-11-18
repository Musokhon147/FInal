-- Roles granted ahead of sign-up: when someone registers with one of these emails,
-- their profile gets the role straight away. Not readable through the API (no policies).
-- Add one with:  insert into public.pending_roles (email, role) values ('name@example.com', 'admin');
create table if not exists public.pending_roles (
  email      text primary key,
  role       app_role not null,
  created_at timestamptz not null default now()
);
alter table public.pending_roles enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare pending app_role;
begin
  select role into pending from public.pending_roles where lower(email) = lower(new.email);
  insert into public.profiles (id, email, full_name, affiliation, preferred_locale, role, is_reviewer)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'affiliation',
    coalesce(nullif(new.raw_user_meta_data->>'locale', ''), 'uz'),
    coalesce(pending, 'user'),
    pending is not null
  );
  if pending is not null then
    delete from public.pending_roles where lower(email) = lower(new.email);
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
