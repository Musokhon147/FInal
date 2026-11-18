-- Record the submission date for everyone, including editors/admins submitting their own manuscripts
-- (the date used to be set only after the staff shortcut, so staff submissions had none).
create or replace function public.guard_submission_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'submitted' and old.status is distinct from 'submitted' then
    new.submitted_at := now();
  end if;
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
  return new;
end $$;
revoke execute on function public.guard_submission_update() from public, anon, authenticated;

update public.submissions s
   set submitted_at = e.at
  from (select submission_id, min(created_at) as at from public.submission_events where to_status = 'submitted' group by submission_id) e
 where e.submission_id = s.id and s.submitted_at is null and s.status <> 'draft';
