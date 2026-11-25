-- =====================================================================
--  DOIs from Zenodo (free, no organisation needed), beside Crossref
--  * journals.doi_provider: which service gives the journal's DOIs
--  * articles.zenodo_id: the Zenodo record, so later edits update it
-- =====================================================================

alter table public.journals
  add column if not exists doi_provider text
    check (doi_provider is null or doi_provider in ('crossref', 'zenodo'));

-- journals that already set up Crossref keep it
update public.journals set doi_provider = 'crossref' where doi_provider is null and doi_prefix is not null;

alter table public.articles
  add column if not exists zenodo_id bigint;
