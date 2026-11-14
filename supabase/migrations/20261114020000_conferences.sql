-- =====================================================================
--  Conferences, with their proceedings published as issues.
-- =====================================================================

create table if not exists public.conferences (
  id                    uuid primary key default gen_random_uuid(),
  journal_id            uuid references public.journals(id) on delete cascade,
  title                 jsonb not null default '{}'::jsonb,
  description           jsonb not null default '{}'::jsonb,   -- HTML per language
  location              jsonb not null default '{}'::jsonb,
  start_date            date not null,
  end_date              date,
  registration_deadline date,
  cover_url             text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger conferences_updated before update on public.conferences
  for each row execute function public.set_updated_at();

alter table public.conferences enable row level security;
create policy "conferences: read" on public.conferences for select using (true);
create policy "conferences: staff write" on public.conferences for all using (public.is_staff()) with check (public.is_staff());

-- An issue can hold the proceedings of a conference
alter table public.issues
  add column if not exists conference_id uuid references public.conferences(id) on delete set null;
create index if not exists issues_conference_idx on public.issues (conference_id);
