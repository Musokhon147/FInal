-- Admin tools: change log (who changed what) and editable email templates.

/* ---------------------------------------------------------------- change log */
create table if not exists public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null check (action in ('insert', 'update', 'delete')),
  entity      text not null,           -- table name
  entity_id   text,
  label       text,                    -- title/name of the row at the time
  changes     jsonb not null default '{}'::jsonb,  -- {column: {from, to}}; long values only name the column
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);
alter table public.audit_log enable row level security;
drop policy if exists "audit: staff read" on public.audit_log;
create policy "audit: staff read" on public.audit_log for select using (public.is_staff());
-- no insert/update/delete policies: rows are written only by the trigger below

create or replace function public.audit_label(x jsonb)
returns text language sql immutable as $$
  select left(coalesce(
    case jsonb_typeof(x->'title') when 'object' then coalesce(nullif(x->'title'->>'en', ''), nullif(x->'title'->>'uz', ''), x->'title'->>'ru') else x->>'title' end,
    x->>'full_name', x->>'name', x->>'slug', x->>'email', x->>'key',
    case when x ? 'number' then '#' || (x->>'number') end
  ), 200)
$$;

create or replace function public.log_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  ch jsonb := '{}'::jsonb;
  k text;
  short boolean;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(n) loop
      continue when k in ('updated_at', 'search', 'full_text', 'views', 'downloads');
      continue when (o->k) is not distinct from (n->k);
      short := jsonb_typeof(n->k) in ('number', 'boolean', 'null')
            or (jsonb_typeof(n->k) = 'string' and length(n->>k) <= 80 and length(coalesce(o->>k, '')) <= 80);
      ch := ch || jsonb_build_object(k, case when short then jsonb_build_object('from', o->k, 'to', n->k) else '{}'::jsonb end);
    end loop;
    if ch = '{}'::jsonb then return new; end if;   -- e.g. only the view counter changed
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, label, changes)
  values (auth.uid(), lower(tg_op), tg_table_name, coalesce(n, o)->>'id', public.audit_label(coalesce(n, o)), ch);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['submissions', 'review_assignments', 'articles', 'issues', 'volumes', 'profiles', 'journals',
                           'pages', 'news', 'editorial_board', 'conferences']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
      execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_change()', t || '_audit', t);
    end if;
  end loop;
end $$;

/* ---------------------------------------------------------- email templates */
-- One row per message type; subject/body per language. Missing rows fall back to the defaults in the app.
create table if not exists public.email_templates (
  key         text primary key,
  subject     jsonb not null default '{}'::jsonb,
  body        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);
alter table public.email_templates enable row level security;
drop policy if exists "email templates: staff read" on public.email_templates;
create policy "email templates: staff read" on public.email_templates for select using (public.is_staff());
drop policy if exists "email templates: staff write" on public.email_templates;
create policy "email templates: staff write" on public.email_templates for all using (public.is_staff()) with check (public.is_staff());
drop trigger if exists email_templates_audit on public.email_templates;
create trigger email_templates_audit after insert or update or delete on public.email_templates
  for each row execute function public.log_change();
