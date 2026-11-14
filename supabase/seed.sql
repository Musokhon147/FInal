-- =====================================================================
--  Starter content. Safe to edit; run once after the migration.
-- =====================================================================

insert into public.journals (slug, title, description, issn_online, publisher, apc_amount, apc_currency)
values (
  'main',
  '{"uz":"Ilmiy jurnal","ru":"Научный журнал","en":"Scientific Journal"}',
  '{"uz":"Xalqaro ko''rib chiqiladigan ilmiy jurnal. Barcha maqolalar ochiq kirishda.",
    "ru":"Международный рецензируемый научный журнал. Все статьи в открытом доступе.",
    "en":"An international peer-reviewed scientific journal. All articles are open access."}',
  '0000-0000',
  'Publisher name',
  300000,
  'UZS'
);

insert into public.sections (journal_id, title, sort_order)
select id, s.title::jsonb, s.ord from public.journals,
  (values
    ('{"uz":"Ilmiy maqola","ru":"Научная статья","en":"Research Article"}', 1),
    ('{"uz":"Sharh maqola","ru":"Обзорная статья","en":"Review Article"}', 2),
    ('{"uz":"Qisqa xabar","ru":"Краткое сообщение","en":"Short Communication"}', 3)
  ) as s(title, ord)
where slug = 'main';

insert into public.volumes (journal_id, number, year)
select id, 1, 2026 from public.journals where slug = 'main';

insert into public.issues (volume_id, number, title, status, published_at)
select v.id, 1, '{"uz":"1-son","ru":"Выпуск 1","en":"Issue 1"}', 'published', now()
from public.volumes v join public.journals j on j.id = v.journal_id
where j.slug = 'main' and v.number = 1;

-- Example article so the public pages have something to show
insert into public.articles (journal_id, issue_id, section_id, title, abstract, keywords, language, authors,
                             "references", first_page, last_page, status, published_at)
select j.id, i.id, s.id,
  'Example article title',
  'This is an example abstract. Replace it from the admin panel.',
  array['example', 'journal', 'open access'],
  'en',
  '[{"name":"Author Name","affiliation":"University, Tashkent, Uzbekistan","orcid":"0000-0000-0000-0000"}]',
  E'1. Reference one.\n2. Reference two.',
  1, 10, 'published', now()
from public.journals j
join public.volumes v on v.journal_id = j.id
join public.issues i on i.volume_id = v.id
join public.sections s on s.journal_id = j.id and s.sort_order = 1
where j.slug = 'main';

insert into public.pages (slug, title, body, show_in_menu, sort_order) values
('about',
 '{"uz":"Jurnal haqida","ru":"О журнале","en":"About the Journal"}',
 '{"uz":"<p>Jurnal haqida ma''lumot.</p>","ru":"<p>Информация о журнале.</p>","en":"<p>Information about the journal.</p>"}',
 true, 1),
('author-guidelines',
 '{"uz":"Mualliflar uchun qo''llanma","ru":"Требования к авторам","en":"Author Guidelines"}',
 '{"uz":"<p>Maqolani tayyorlash talablari.</p>","ru":"<p>Требования к оформлению статей.</p>","en":"<p>Manuscript preparation requirements.</p>"}',
 true, 2),
('peer-review',
 '{"uz":"Taqriz jarayoni","ru":"Рецензирование","en":"Peer Review Process"}',
 '{"uz":"<p>Ikki tomonlama yopiq taqriz.</p>","ru":"<p>Двойное слепое рецензирование.</p>","en":"<p>Double-blind peer review.</p>"}',
 true, 3),
('publication-ethics',
 '{"uz":"Nashr etikasi","ru":"Публикационная этика","en":"Publication Ethics"}',
 '{"uz":"<p>COPE tamoyillariga amal qilamiz.</p>","ru":"<p>Мы следуем принципам COPE.</p>","en":"<p>We follow COPE principles.</p>"}',
 true, 4),
('open-access',
 '{"uz":"Ochiq kirish siyosati","ru":"Политика открытого доступа","en":"Open Access Policy"}',
 '{"uz":"<p>Barcha maqolalar CC BY 4.0 litsenziyasi ostida.</p>","ru":"<p>Все статьи публикуются по лицензии CC BY 4.0.</p>","en":"<p>All articles are published under CC BY 4.0.</p>"}',
 true, 5),
('contact',
 '{"uz":"Aloqa","ru":"Контакты","en":"Contact"}',
 '{"uz":"<p>Email: editor@example.uz</p>","ru":"<p>Email: editor@example.uz</p>","en":"<p>Email: editor@example.uz</p>"}',
 true, 6);

insert into public.editorial_board (journal_id, full_name, position, affiliation, sort_order)
select id,
  '{"uz":"Ism Familiya","ru":"Имя Фамилия","en":"Name Surname"}',
  '{"uz":"Bosh muharrir","ru":"Главный редактор","en":"Editor-in-Chief"}',
  '{"uz":"Universitet, Toshkent","ru":"Университет, Ташкент","en":"University, Tashkent"}',
  1
from public.journals where slug = 'main';

insert into public.site_settings (key, value) values
  ('site_name', '{"uz":"Ilmiy jurnal","ru":"Научный журнал","en":"Scientific Journal"}'),
  ('contact_email', '"editor@example.uz"'),
  ('metrics', '{"acceptance_rate":"","review_days":"","impact_factor":""}');
