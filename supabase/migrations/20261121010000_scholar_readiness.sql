-- =====================================================================
--  Google Scholar readiness
--  * journals.google_verification: Search Console "HTML tag" code (the only way to verify a *.vercel.app site)
--  * article_pdf_sizes(): sizes of the article PDFs, so editors see files over Scholar's 5 MB limit
-- =====================================================================

alter table public.journals
  add column if not exists google_verification text
    check (google_verification is null or google_verification ~ '^[A-Za-z0-9_-]{10,100}$');

create or replace function public.article_pdf_sizes()
returns table (name text, size bigint)
language sql stable security definer
set search_path = ''
as $$
  select o.name, coalesce((o.metadata ->> 'size')::bigint, 0)
  from storage.objects o
  where o.bucket_id = 'articles' and public.is_staff();
$$;
revoke execute on function public.article_pdf_sizes() from public, anon;
grant execute on function public.article_pdf_sizes() to authenticated;
