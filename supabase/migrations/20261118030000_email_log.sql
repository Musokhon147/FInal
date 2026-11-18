-- Journal emails: one row per message the site tried to send (shown to editors in Admin → Emails).
create table if not exists public.email_log (
  id            bigserial primary key,
  key           text not null,                 -- template key, e.g. review_invite
  to_email      text not null,
  subject       text,
  submission_id uuid references public.submissions(id) on delete set null,
  review_id     uuid references public.review_assignments(id) on delete set null,
  status        text not null check (status in ('sent', 'failed', 'skipped')),
  error         text,
  provider_id   text,                          -- id returned by the email service
  created_at    timestamptz not null default now()
);
create index if not exists email_log_created_idx on public.email_log (created_at desc);
create index if not exists email_log_lookup_idx on public.email_log (key, submission_id, review_id);
alter table public.email_log enable row level security;
create policy "email log: staff read" on public.email_log for select using (public.is_staff());
-- written only by the server with the service key (no insert policy for users)
