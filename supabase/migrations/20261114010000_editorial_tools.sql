-- =====================================================================
--  Editorial tools: review scores and plagiarism similarity check.
-- =====================================================================

alter table public.review_assignments
  add column if not exists scores jsonb not null default '{}'::jsonb;  -- {"originality":1-5,"methodology":..,"clarity":..,"significance":..}

alter table public.submissions
  add column if not exists similarity_percent numeric(5,2) check (similarity_percent between 0 and 100),
  add column if not exists similarity_note text;

-- Authors still may not touch editor-only fields (now including the similarity check)
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
