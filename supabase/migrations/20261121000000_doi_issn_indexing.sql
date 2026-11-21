-- =====================================================================
--  DOI (Crossref), ISSN and indexing
--  * journals.doi_prefix: the "10.xxxxx" prefix Crossref gives the publisher
--  * articles.doi_status: none → queued (sent to Crossref) → registered / failed
--  * crossref_deposits: one row per file sent to Crossref, with its result log
-- =====================================================================

alter table public.journals
  add column if not exists doi_prefix text
    check (doi_prefix is null or doi_prefix ~ '^10\.[0-9]{4,9}$'),
  add column if not exists doi_auto boolean not null default true;   -- give new articles a DOI when published

alter table public.articles
  add column if not exists doi_status text not null default 'none'
    check (doi_status in ('none', 'queued', 'registered', 'failed')),
  add column if not exists doi_message text,
  add column if not exists doi_registered_at timestamptz;

create table if not exists public.crossref_deposits (
  id          bigint generated always as identity primary key,
  file_name   text not null unique,              -- also the doi_batch_id; used to look up the result
  article_ids uuid[] not null default '{}',
  test        boolean not null default false,    -- sent to Crossref's test system
  status      text not null default 'submitted' check (status in ('submitted', 'completed', 'failed')),
  success     int not null default 0,
  failure     int not null default 0,
  message     text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  checked_at  timestamptz
);
create index if not exists crossref_deposits_open_idx on public.crossref_deposits (status) where status = 'submitted';

alter table public.crossref_deposits enable row level security;
create policy "crossref_deposits: staff read" on public.crossref_deposits for select using (public.is_staff());
create policy "crossref_deposits: staff write" on public.crossref_deposits for all using (public.is_staff()) with check (public.is_staff());

-- The seed's placeholders must not reach Google Scholar or Crossref as real data
update public.journals set issn_online = null where issn_online = '0000-0000';
update public.journals set issn_print = null where issn_print = '0000-0000';
