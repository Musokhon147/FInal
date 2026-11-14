-- Reader tools: full text of each article PDF, included in search (lowest weight).
alter table public.articles add column if not exists full_text text;

create or replace function public.articles_search_update()
returns trigger language plpgsql as $$
begin
  new.search :=
       setweight(to_tsvector('simple', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(array_to_string(new.keywords, ' '), '')), 'A')
    || setweight(to_tsvector('simple', coalesce((
         select string_agg(a->>'name', ' ') from jsonb_array_elements(new.authors) a), '')), 'B')
    || setweight(to_tsvector('simple', coalesce(new.abstract, '')
         || ' ' || coalesce((select string_agg(v, ' ') from jsonb_each_text(coalesce(new.title_i18n, '{}'::jsonb)) as t(k, v)), '')
         || ' ' || coalesce((select string_agg(v, ' ') from jsonb_each_text(coalesce(new.abstract_i18n, '{}'::jsonb)) as t(k, v)), '')), 'C')
    || setweight(to_tsvector('simple', left(coalesce(new.full_text, ''), 400000)), 'D');
  return new;
end $$;

-- refresh the search index for existing rows
update public.articles set full_text = full_text;
