-- =====================================================================
--  Three kinds of publication: scientific journal, local conference
--  theses, international conference theses. Plus: full PDFs for issues
--  (shown as a catalog in the archive), board member degrees, and the
--  per-type author guidance + sample files on the "For authors" page.
-- =====================================================================

-- conferences are local or international
alter table public.conferences
  add column if not exists scope text not null default 'local' check (scope in ('local', 'international'));

-- what the author is submitting, and (for theses) to which conference
alter table public.submissions
  add column if not exists pub_type text not null default 'journal'
    check (pub_type in ('journal', 'local_conference', 'international_conference')),
  add column if not exists conference_id uuid references public.conferences(id) on delete set null;
create index if not exists submissions_pub_type_idx on public.submissions (pub_type);

-- the whole issue / collection of theses as one PDF
alter table public.issues add column if not exists pdf_path text;

-- academic title and degree of editorial board members (e.g. "DSc, Professor")
alter table public.editorial_board add column if not exists academic_degree jsonb not null default '{}'::jsonb;

-- "For authors": guidance text (HTML per language) and a sample PDF for each type
-- { "journal": { "guide": {"uz": "...", "ru": "...", "en": "..."}, "template": "templates/journal.pdf" }, ... }
alter table public.journals add column if not exists author_kits jsonb not null default '{}'::jsonb;

-- authors choose the type and conference while drafting; both are locked once submitted
create or replace function public.guard_submission_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() then
    return new;
  end if;
  if new.editor_id is distinct from old.editor_id
     or new.decision_note is distinct from old.decision_note
     or new.submitter_id is distinct from old.submitter_id
     or new.journal_id is distinct from old.journal_id
     or new.similarity_percent is distinct from old.similarity_percent
     or new.similarity_note is distinct from old.similarity_note then
    raise exception 'Not allowed to change these fields';
  end if;
  if old.status not in ('draft','revision_required')
     and (new.title, new.abstract, new.keywords, new.language, new."references", new.cover_letter, new.section_id, new.pub_type, new.conference_id)
         is distinct from
         (old.title, old.abstract, old.keywords, old.language, old."references", old.cover_letter, old.section_id, old.pub_type, old.conference_id) then
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

-- Board member emails are for the editors only (reviewer contact), not for the public:
-- hide the column from the public API and give staff a function to read it.
revoke select on public.editorial_board from anon, authenticated;
grant select (id, journal_id, full_name, position, affiliation, academic_degree, photo_url, orcid, position_type, sort_order)
  on public.editorial_board to anon, authenticated;

create or replace function public.board_member_emails()
returns table (id uuid, email text, registered boolean)
language sql stable security definer set search_path = public as $$
  select b.id, b.email, exists (select 1 from public.profiles p where lower(p.email) = lower(b.email))
  from public.editorial_board b
  where public.is_staff() and b.email is not null
$$;
grant execute on function public.board_member_emails() to authenticated;
