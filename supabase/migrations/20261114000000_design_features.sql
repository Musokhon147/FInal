-- =====================================================================
--  Features for the 3D redesign: journal settings, board groups,
--  news, notifications.  Run after 20261110000000_init.sql.
-- =====================================================================

-- Journal settings shown on the site (logo, indexing list, call for papers)
alter table public.journals
  add column if not exists logo_url      text,
  add column if not exists contact_email text,
  add column if not exists indexes       text[] not null default '{}',
  add column if not exists cfp_deadline  date,
  add column if not exists cfp_text      jsonb not null default '{}'::jsonb;

-- Editorial board groups
alter table public.editorial_board
  add column if not exists position_type text not null default 'member'
  check (position_type in ('chief', 'deputy', 'member'));

-- ---------------------------------------------------------------------
--  News
-- ---------------------------------------------------------------------
create table if not exists public.news (
  id         uuid primary key default gen_random_uuid(),
  title      jsonb not null default '{}'::jsonb,
  body       jsonb not null default '{}'::jsonb,
  date       date not null default current_date,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.news enable row level security;
create policy "news: read" on public.news for select using (true);
create policy "news: staff write" on public.news for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
--  Notifications (filled automatically by triggers)
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          text not null check (type in ('status', 'invite', 'review', 'new')),
  submission_id uuid references public.submissions(id) on delete cascade,
  status        submission_status,
  link          text not null,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read);
alter table public.notifications enable row level security;
create policy "notifications: read own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: mark own read" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Status changes: tell the author; a new or resubmitted paper: tell the editors
create or replace function public.notify_submission_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  if new.status = 'submitted' then
    insert into public.notifications (user_id, type, submission_id, link)
    select p.id, 'new', new.id, '/admin/submissions/' || new.id
    from public.profiles p where p.role in ('editor', 'admin');
  elsif new.status <> 'draft' and auth.uid() is distinct from new.submitter_id then
    insert into public.notifications (user_id, type, submission_id, status, link)
    values (new.submitter_id, 'status', new.id, new.status, '/dashboard/submissions/' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists submissions_notify on public.submissions;
create trigger submissions_notify after insert or update on public.submissions
  for each row execute function public.notify_submission_change();

-- Reviewer invited: tell the reviewer.  Review completed: tell the editors.
create or replace function public.notify_review_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, submission_id, link)
    values (new.reviewer_id, 'invite', new.submission_id, '/dashboard/reviews/' || new.id);
  elsif new.status = 'completed' and old.status <> 'completed' then
    insert into public.notifications (user_id, type, submission_id, link)
    select p.id, 'review', new.submission_id, '/admin/submissions/' || new.submission_id
    from public.profiles p where p.role in ('editor', 'admin');
  end if;
  return new;
end $$;
drop trigger if exists reviews_notify on public.review_assignments;
create trigger reviews_notify after insert or update on public.review_assignments
  for each row execute function public.notify_review_change();

-- Public figures for "the journal in numbers" (no private data exposed)
create or replace function public.journal_numbers()
returns table (decision_days numeric, acceptance_rate numeric)
language sql stable security definer set search_path = public as $$
  with spans as (
    select s.id,
           min(e.created_at) filter (where e.to_status = 'submitted') as started,
           min(e.created_at) filter (where e.to_status in ('accepted', 'rejected', 'revision_required')) as decided
    from public.submissions s join public.submission_events e on e.submission_id = s.id
    group by s.id
  ), finals as (
    select status from public.submissions where status in ('accepted', 'published', 'rejected')
  )
  select
    coalesce(round(avg(extract(epoch from (decided - started)) / 86400) filter (where decided > started)), 0),
    coalesce(round(100.0 * (select count(*) from finals where status <> 'rejected') / nullif((select count(*) from finals), 0)), 0)
  from spans
$$;
grant execute on function public.journal_numbers() to anon, authenticated;
