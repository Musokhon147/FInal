-- =====================================================================
--  Journal platform — initial schema
--  Run in Supabase SQL editor, or with `supabase db push`.
-- =====================================================================

-- gen_random_uuid() is built into Postgres 13+

-- ---------------------------------------------------------------------
--  Enums
-- ---------------------------------------------------------------------
create type app_role          as enum ('user', 'editor', 'admin');
create type issue_status      as enum ('draft', 'published');
create type submission_status as enum (
  'draft', 'submitted', 'desk_review', 'under_review', 'revision_required',
  'accepted', 'rejected', 'published', 'withdrawn'
);
create type file_kind         as enum ('manuscript', 'revision', 'review_attachment', 'final_pdf', 'other');
create type review_status     as enum ('invited', 'accepted', 'declined', 'completed', 'cancelled');
create type review_rec        as enum ('accept', 'minor_revision', 'major_revision', 'reject');
create type article_status    as enum ('scheduled', 'published');
create type payment_status    as enum ('pending', 'paid', 'failed', 'refunded');

-- ---------------------------------------------------------------------
--  Generic helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
--  Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  full_name        text not null default '',
  affiliation      text,
  orcid            text,
  country          text,
  phone            text,
  avatar_url       text,
  preferred_locale text not null default 'uz' check (preferred_locale in ('uz','ru','en')),
  role             app_role not null default 'user',
  is_reviewer      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers (security definer so they can be used inside RLS without recursion)
create or replace function public.current_role_name()
returns app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('editor','admin') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, affiliation, preferred_locale)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'affiliation',
    coalesce(nullif(new.raw_user_meta_data->>'locale', ''), 'uz')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may not promote themselves
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_reviewer is distinct from old.is_reviewer)
     and auth.uid() is not null          -- SQL editor / service role are allowed
     and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------
--  Journals, sections, volumes, issues
--  Translatable fields are jsonb: {"uz": "...", "ru": "...", "en": "..."}
-- ---------------------------------------------------------------------
create table public.journals (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        jsonb not null default '{}'::jsonb,
  description  jsonb not null default '{}'::jsonb,
  issn_print   text,
  issn_online  text,
  publisher    text,
  cover_url    text,
  apc_amount   numeric(12,2) not null default 0,
  apc_currency text not null default 'UZS',
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create table public.sections (
  id         uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  title      jsonb not null default '{}'::jsonb,
  sort_order int not null default 0
);

create table public.volumes (
  id         uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  number     int not null,
  year       int not null,
  unique (journal_id, number)
);

create table public.issues (
  id           uuid primary key default gen_random_uuid(),
  volume_id    uuid not null references public.volumes(id) on delete cascade,
  number       int not null,
  title        jsonb not null default '{}'::jsonb,
  description  jsonb not null default '{}'::jsonb,
  cover_url    text,
  is_special   boolean not null default false,
  status       issue_status not null default 'draft',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (volume_id, number, is_special)
);

-- ---------------------------------------------------------------------
--  Submissions workflow
-- ---------------------------------------------------------------------
create table public.submissions (
  id            uuid primary key default gen_random_uuid(),
  journal_id    uuid not null references public.journals(id),
  section_id    uuid references public.sections(id),
  submitter_id  uuid not null references public.profiles(id) on delete cascade,
  editor_id     uuid references public.profiles(id),
  status        submission_status not null default 'draft',
  title         text not null,
  abstract      text not null default '',
  keywords      text[] not null default '{}',
  language      text not null default 'uz' check (language in ('uz','ru','en')),
  "references"  text,
  cover_letter  text,
  decision_note text,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.submissions (submitter_id);
create index on public.submissions (status);
create trigger submissions_updated before update on public.submissions
  for each row execute function public.set_updated_at();

create table public.submission_authors (
  id               uuid primary key default gen_random_uuid(),
  submission_id    uuid not null references public.submissions(id) on delete cascade,
  full_name        text not null,
  email            text,
  affiliation      text,
  orcid            text,
  country          text,
  is_corresponding boolean not null default false,
  sort_order       int not null default 0
);
create index on public.submission_authors (submission_id);

create table public.submission_files (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  uploaded_by   uuid not null references public.profiles(id) default auth.uid(),
  kind          file_kind not null default 'manuscript',
  storage_path  text not null,
  file_name     text not null,
  mime_type     text,
  size_bytes    bigint,
  version       int not null default 1,
  created_at    timestamptz not null default now()
);
create index on public.submission_files (submission_id);

create table public.review_assignments (
  id                 uuid primary key default gen_random_uuid(),
  submission_id      uuid not null references public.submissions(id) on delete cascade,
  reviewer_id        uuid not null references public.profiles(id) on delete cascade,
  round              int not null default 1,
  status             review_status not null default 'invited',
  recommendation     review_rec,
  comments_to_author text,
  comments_to_editor text,
  due_at             timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  unique (submission_id, reviewer_id, round)
);
create index on public.review_assignments (reviewer_id);

create table public.submission_events (
  id            bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  actor_id      uuid references public.profiles(id) default auth.uid(),
  from_status   submission_status,
  to_status     submission_status,
  note          text,
  created_at    timestamptz not null default now()
);
create index on public.submission_events (submission_id);

-- Access helpers used by RLS and storage policies
create or replace function public.can_view_submission(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff()
      or exists (select 1 from public.submissions s where s.id = sid and s.submitter_id = auth.uid())
      or exists (select 1 from public.review_assignments r
                 where r.submission_id = sid and r.reviewer_id = auth.uid()
                   and r.status in ('invited','accepted','completed'))
$$;

create or replace function public.can_edit_submission(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff()
      or exists (select 1 from public.submissions s
                 where s.id = sid and s.submitter_id = auth.uid()
                   and s.status in ('draft','revision_required'))
$$;

create or replace function public.is_reviewer_of(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.review_assignments r
                 where r.submission_id = sid and r.reviewer_id = auth.uid()
                   and r.status in ('accepted','completed'))
$$;

-- Authors can only move draft/revision -> submitted; staff-only fields are locked
create or replace function public.guard_submission_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() then
    return new;
  end if;
  if new.editor_id is distinct from old.editor_id
     or new.decision_note is distinct from old.decision_note
     or new.submitter_id is distinct from old.submitter_id
     or new.journal_id is distinct from old.journal_id then
    raise exception 'Not allowed to change these fields';
  end if;
  if old.status not in ('draft','revision_required')
     and (new.title, new.abstract, new.keywords, new.language, new."references", new.cover_letter, new.section_id)
         is distinct from
         (old.title, old.abstract, old.keywords, old.language, old."references", old.cover_letter, old.section_id) then
    raise exception 'Submission is locked while in status %', old.status;
  end if;
  if new.status is distinct from old.status then
    if not (
      (old.status in ('draft','revision_required') and new.status = 'submitted')
      or (old.status not in ('published','rejected','withdrawn') and new.status = 'withdrawn')
    ) then
      raise exception 'Invalid status change % -> %', old.status, new.status;
    end if;
  end if;
  if new.status = 'submitted' and old.status <> 'submitted' then
    new.submitted_at := now();
  end if;
  return new;
end $$;
create trigger submissions_guard before update on public.submissions
  for each row execute function public.guard_submission_update();

-- Log every status change to the timeline
create or replace function public.log_submission_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.submission_events (submission_id, actor_id, from_status, to_status)
    values (new.id, auth.uid(), null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.submission_events (submission_id, actor_id, from_status, to_status, note)
    values (new.id, auth.uid(), old.status, new.status, new.decision_note);
  end if;
  return new;
end $$;
create trigger submissions_log after insert or update on public.submissions
  for each row execute function public.log_submission_status();

-- Reviewers may only fill in their own review fields
create or replace function public.guard_review_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() then
    return new;
  end if;
  if new.submission_id is distinct from old.submission_id
     or new.reviewer_id is distinct from old.reviewer_id
     or new.round is distinct from old.round
     or new.due_at is distinct from old.due_at then
    raise exception 'Not allowed';
  end if;
  if old.status in ('completed','cancelled','declined') then
    raise exception 'Review is closed';
  end if;
  if new.status = 'completed' then
    if new.recommendation is null then
      raise exception 'Recommendation is required';
    end if;
    new.completed_at := now();
  end if;
  return new;
end $$;
create trigger reviews_guard before update on public.review_assignments
  for each row execute function public.guard_review_update();

-- Authors see reviewer comments without seeing who the reviewer is (blind review)
create or replace function public.reviews_for_author(sid uuid)
returns table (round int, recommendation review_rec, comments_to_author text, completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.round, r.recommendation, r.comments_to_author, r.completed_at
  from public.review_assignments r
  join public.submissions s on s.id = r.submission_id
  where r.submission_id = sid
    and r.status = 'completed'
    and (s.submitter_id = auth.uid() or public.is_staff())
  order by r.round, r.completed_at
$$;

-- ---------------------------------------------------------------------
--  Published articles
-- ---------------------------------------------------------------------
create table public.articles (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid unique references public.submissions(id) on delete set null,
  journal_id      uuid not null references public.journals(id),
  issue_id        uuid references public.issues(id) on delete set null,
  section_id      uuid references public.sections(id),
  title           text not null,
  title_i18n      jsonb not null default '{}'::jsonb,   -- optional translated titles
  abstract        text not null default '',
  abstract_i18n   jsonb not null default '{}'::jsonb,   -- optional translated abstracts
  keywords        text[] not null default '{}',
  language        text not null default 'uz',
  authors         jsonb not null default '[]'::jsonb,   -- [{name, affiliation, orcid, email}]
  "references"    text,
  first_page      int,
  last_page       int,
  doi             text unique,
  pdf_path        text,                                 -- path in the "articles" bucket
  license         text not null default 'CC BY 4.0',
  status          article_status not null default 'scheduled',
  published_at    timestamptz,
  sort_order      int not null default 0,
  views           int not null default 0,
  downloads       int not null default 0,
  search          tsvector,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.articles (issue_id);
create index articles_search_idx on public.articles using gin (search);
create trigger articles_updated before update on public.articles
  for each row execute function public.set_updated_at();

create or replace function public.articles_search_update()
returns trigger language plpgsql as $$
begin
  new.search :=
       setweight(to_tsvector('simple', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(array_to_string(new.keywords, ' '), '')), 'A')
    || setweight(to_tsvector('simple', coalesce((
         select string_agg(a->>'name', ' ') from jsonb_array_elements(new.authors) a), '')), 'B')
    || setweight(to_tsvector('simple', coalesce(new.abstract, '')), 'C');
  return new;
end $$;
create trigger articles_search before insert or update on public.articles
  for each row execute function public.articles_search_update();

-- Public counters (callable by anonymous visitors)
create or replace function public.track_article(aid uuid, kind text)
returns void language sql security definer set search_path = public as $$
  update public.articles
     set views     = views     + case when kind = 'view'     then 1 else 0 end,
         downloads = downloads + case when kind = 'download' then 1 else 0 end
   where id = aid and status = 'published'
$$;
grant execute on function public.track_article(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------
--  Payments (publication fee / APC)
-- ---------------------------------------------------------------------
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) default auth.uid(),
  provider      text not null check (provider in ('click','payme','stripe','manual')),
  amount        numeric(12,2) not null,
  currency      text not null default 'UZS',
  status        payment_status not null default 'pending',
  external_id   text,
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  Site content (CMS)
-- ---------------------------------------------------------------------
create table public.pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        jsonb not null default '{}'::jsonb,
  body         jsonb not null default '{}'::jsonb,     -- HTML per language
  is_published boolean not null default true,
  show_in_menu boolean not null default false,
  sort_order   int not null default 0,
  updated_at   timestamptz not null default now()
);
create trigger pages_updated before update on public.pages
  for each row execute function public.set_updated_at();

create table public.editorial_board (
  id          uuid primary key default gen_random_uuid(),
  journal_id  uuid references public.journals(id) on delete cascade,
  full_name   jsonb not null default '{}'::jsonb,
  position    jsonb not null default '{}'::jsonb,
  affiliation jsonb not null default '{}'::jsonb,
  photo_url   text,
  email       text,
  orcid       text,
  sort_order  int not null default 0
);

create table public.site_settings (
  key   text primary key,
  value jsonb not null
);

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table public.profiles           enable row level security;
alter table public.journals           enable row level security;
alter table public.sections           enable row level security;
alter table public.volumes            enable row level security;
alter table public.issues             enable row level security;
alter table public.submissions        enable row level security;
alter table public.submission_authors enable row level security;
alter table public.submission_files   enable row level security;
alter table public.review_assignments enable row level security;
alter table public.submission_events  enable row level security;
alter table public.articles           enable row level security;
alter table public.payments           enable row level security;
alter table public.pages              enable row level security;
alter table public.editorial_board    enable row level security;
alter table public.site_settings      enable row level security;

-- profiles
create policy "profiles: read own or staff" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update" on public.profiles
  for update using (public.is_admin());

-- public catalogue
create policy "journals: read" on public.journals for select using (is_active or public.is_staff());
create policy "journals: staff write" on public.journals for all using (public.is_staff()) with check (public.is_staff());

create policy "sections: read" on public.sections for select using (true);
create policy "sections: staff write" on public.sections for all using (public.is_staff()) with check (public.is_staff());

create policy "volumes: read" on public.volumes for select using (true);
create policy "volumes: staff write" on public.volumes for all using (public.is_staff()) with check (public.is_staff());

create policy "issues: read published" on public.issues for select using (status = 'published' or public.is_staff());
create policy "issues: staff write" on public.issues for all using (public.is_staff()) with check (public.is_staff());

create policy "articles: read published" on public.articles for select using (status = 'published' or public.is_staff());
create policy "articles: staff write" on public.articles for all using (public.is_staff()) with check (public.is_staff());

create policy "pages: read" on public.pages for select using (is_published or public.is_staff());
create policy "pages: staff write" on public.pages for all using (public.is_staff()) with check (public.is_staff());

create policy "board: read" on public.editorial_board for select using (true);
create policy "board: staff write" on public.editorial_board for all using (public.is_staff()) with check (public.is_staff());

create policy "settings: read" on public.site_settings for select using (true);
create policy "settings: admin write" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- submissions
create policy "submissions: read" on public.submissions
  for select using (public.can_view_submission(id));
create policy "submissions: author insert" on public.submissions
  for insert with check (submitter_id = auth.uid() and status = 'draft');
create policy "submissions: update" on public.submissions
  for update using (
    public.is_staff()
    or (submitter_id = auth.uid() and status not in ('published','rejected','withdrawn'))
  );
create policy "submissions: delete draft" on public.submissions
  for delete using ((submitter_id = auth.uid() and status = 'draft') or public.is_admin());

-- submission authors
create policy "sub_authors: read" on public.submission_authors
  for select using (public.can_view_submission(submission_id));
create policy "sub_authors: write" on public.submission_authors
  for all using (public.can_edit_submission(submission_id))
  with check (public.can_edit_submission(submission_id));

-- submission files
create policy "sub_files: read" on public.submission_files
  for select using (public.can_view_submission(submission_id));
create policy "sub_files: insert" on public.submission_files
  for insert with check (
    uploaded_by = auth.uid() and (
      public.can_edit_submission(submission_id)
      or (kind = 'review_attachment' and public.is_reviewer_of(submission_id))
    )
  );
create policy "sub_files: delete" on public.submission_files
  for delete using (public.is_staff() or (uploaded_by = auth.uid() and public.can_edit_submission(submission_id)));

-- reviews
create policy "reviews: read" on public.review_assignments
  for select using (reviewer_id = auth.uid() or public.is_staff());
create policy "reviews: reviewer update" on public.review_assignments
  for update using (reviewer_id = auth.uid() or public.is_staff());
create policy "reviews: staff insert" on public.review_assignments
  for insert with check (public.is_staff());
create policy "reviews: staff delete" on public.review_assignments
  for delete using (public.is_staff());

-- timeline
create policy "events: read" on public.submission_events
  for select using (public.can_view_submission(submission_id));
create policy "events: staff insert" on public.submission_events
  for insert with check (public.is_staff());

-- payments
create policy "payments: read own" on public.payments
  for select using (user_id = auth.uid() or public.is_staff());
create policy "payments: create own pending" on public.payments
  for insert with check (
    user_id = auth.uid() and status = 'pending'
    and exists (select 1 from public.submissions s where s.id = submission_id and s.submitter_id = auth.uid())
  );
create policy "payments: staff update" on public.payments
  for update using (public.is_staff());

-- =====================================================================
--  Storage
--  covers      (public)  journal / issue covers
--  articles    (public)  final published PDFs
--  manuscripts (private) submission files, path: <submission_id>/<file>
-- =====================================================================
insert into storage.buckets (id, name, public) values
  ('covers', 'covers', true),
  ('articles', 'articles', true),
  ('manuscripts', 'manuscripts', false)
on conflict (id) do nothing;

create or replace function public.path_submission_id(path text)
returns uuid language plpgsql immutable as $$
begin
  return split_part(path, '/', 1)::uuid;
exception when others then
  return null;
end $$;

create policy "covers/articles: staff upload" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('covers','articles') and public.is_staff());
create policy "covers/articles: staff modify" on storage.objects
  for update to authenticated
  using (bucket_id in ('covers','articles') and public.is_staff());
create policy "covers/articles: staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('covers','articles') and public.is_staff());

create policy "manuscripts: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'manuscripts' and public.can_view_submission(public.path_submission_id(name)));
create policy "manuscripts: upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'manuscripts' and (
      public.can_edit_submission(public.path_submission_id(name))
      or public.is_reviewer_of(public.path_submission_id(name))
    )
  );
create policy "manuscripts: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'manuscripts' and public.can_edit_submission(public.path_submission_id(name)));
