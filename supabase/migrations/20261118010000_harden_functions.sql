-- Security hardening (Supabase security advisor):
-- trigger-only functions are not callable through the API, and helpers get a fixed search_path.
revoke execute on function public.guard_profile_update() from public, anon, authenticated;
revoke execute on function public.guard_review_update() from public, anon, authenticated;
revoke execute on function public.guard_submission_update() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_change() from public, anon, authenticated;
revoke execute on function public.log_submission_status() from public, anon, authenticated;
revoke execute on function public.notify_review_change() from public, anon, authenticated;
revoke execute on function public.notify_submission_change() from public, anon, authenticated;

revoke execute on function public.board_member_emails() from public, anon;
grant execute on function public.board_member_emails() to authenticated;

alter function public.articles_search_update() set search_path = public;
alter function public.path_submission_id(text) set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.audit_label(jsonb) set search_path = public;
