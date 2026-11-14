/* eslint-disable @typescript-eslint/no-explicit-any */
// Sample content for DEMO MODE. Every name, title and number here is made up.

export type DemoDb = Record<string, any[]>;

export const DEMO_ACCOUNTS = [
  { email: "admin@demo.uz", label: "Admin / editor" },
  { email: "author@demo.uz", label: "Author" },
  { email: "reviewer@demo.uz", label: "Reviewer" },
];

const d = (s: string) => new Date(s).toISOString();

export function createSeed(): DemoDb {
  const J = "journal-1";
  const S1 = "sec-research", S2 = "sec-review", S3 = "sec-short";

  const profiles = [
    { id: "u-admin", email: "admin@demo.uz", full_name: "Bosh muharrir (demo)", affiliation: "Tahririyat", orcid: null, role: "admin", is_reviewer: false, preferred_locale: "uz", created_at: d("2026-01-10") },
    { id: "u-author", email: "author@demo.uz", full_name: "Aziz Karimov", affiliation: "Toshkent davlat iqtisodiyot universiteti", orcid: "0000-0002-1825-0097", role: "user", is_reviewer: false, preferred_locale: "uz", created_at: d("2026-03-02") },
    { id: "u-reviewer", email: "reviewer@demo.uz", full_name: "Dilnoza Rahimova", affiliation: "Samarqand davlat universiteti", orcid: null, role: "user", is_reviewer: true, preferred_locale: "uz", created_at: d("2026-02-14") },
    { id: "u-reviewer2", email: "reviewer2@demo.uz", full_name: "Елена Иванова", affiliation: "Национальный университет Узбекистана", orcid: null, role: "user", is_reviewer: true, preferred_locale: "ru", created_at: d("2026-02-20") },
    { id: "u-author2", email: "author2@demo.uz", full_name: "John Lee", affiliation: "Westminster International University in Tashkent", orcid: null, role: "user", is_reviewer: false, preferred_locale: "en", created_at: d("2026-05-08") },
  ];

  const journals = [{
    id: J, slug: "main", sort_order: 0, is_active: true,
    title: { uz: "Ilmiy jurnal", ru: "Научный журнал", en: "Scientific Journal" },
    description: {
      uz: "Xalqaro taqrizlanadigan ilmiy jurnal. Barcha maqolalar ochiq kirishda: bepul o'qing va yuklab oling.",
      ru: "Международный рецензируемый научный журнал. Все статьи в открытом доступе: читайте и скачивайте бесплатно.",
      en: "An international peer-reviewed scientific journal. All articles are open access: free to read and download.",
    },
    issn_print: null, issn_online: "0000-0000", publisher: "[Publisher name]", cover_url: null, apc_amount: 300000, apc_currency: "UZS",
    logo_url: null, contact_email: "editor@example.uz",
    indexes: ["Google Scholar", "Crossref", "OpenAlex", "BASE", "ROAD", "CyberLeninka"],
    cfp_deadline: "2026-12-20",
    cfp_text: {
      uz: "4-son (dekabr 2026) uchun iqtisodiyot, ta'lim va raqamli texnologiyalar bo'yicha maqolalar qabul qilinadi.",
      ru: "Принимаются статьи в выпуск 4 (декабрь 2026) по экономике, образованию и цифровым технологиям.",
      en: "Papers on economics, education and digital technology are welcome for Issue 4 (December 2026).",
    },
  }];

  const sections = [
    { id: S1, journal_id: J, sort_order: 1, title: { uz: "Ilmiy maqola", ru: "Научная статья", en: "Research Article" } },
    { id: S2, journal_id: J, sort_order: 2, title: { uz: "Sharh maqola", ru: "Обзорная статья", en: "Review Article" } },
    { id: S3, journal_id: J, sort_order: 3, title: { uz: "Qisqa xabar", ru: "Краткое сообщение", en: "Short Communication" } },
  ];

  const volumes = [
    { id: "vol-1", journal_id: J, number: 1, year: 2024 },
    { id: "vol-2", journal_id: J, number: 2, year: 2025 },
    { id: "vol-3", journal_id: J, number: 3, year: 2026 },
  ];

  const iss = (id: string, vol: string, number: number, date: string | null, extra: any = {}) => ({
    id, volume_id: vol, number, is_special: false, status: date ? "published" : "draft", published_at: date ? d(date) : null,
    title: {}, description: {}, cover_url: null, created_at: d(date ?? "2026-11-10"), ...extra,
  });
  const issues = [
    iss("iss-1-1", "vol-1", 1, "2024-06-01"), iss("iss-1-2", "vol-1", 2, "2024-12-01"),
    iss("iss-2-1", "vol-2", 1, "2025-03-01"), iss("iss-2-2", "vol-2", 2, "2025-07-01"), iss("iss-2-3", "vol-2", 3, "2025-11-01"),
    iss("iss-3-1", "vol-3", 1, "2026-03-01"), iss("iss-3-2", "vol-3", 2, "2026-07-01"),
    iss("iss-3-s1", "vol-3", 1, "2026-06-15", {
      is_special: true,
      title: { uz: "Xalqaro konferensiya materiallari", ru: "Материалы международной конференции", en: "International conference proceedings" },
    }),
    iss("iss-3-3", "vol-3", 3, "2026-11-01"),
    iss("iss-3-4", "vol-3", 4, null),
  ];

  let n = 0;
  const art = (issue: string, section: string, p: [number, number], title: string, authors: any[], lang: string, kw: string[], abstract: string, i18n: any = {}) => ({
    id: `art-${++n}`, submission_id: null, journal_id: J, issue_id: issue, section_id: section,
    title, title_i18n: i18n.title ?? {}, abstract, abstract_i18n: i18n.abstract ?? {}, keywords: kw, language: lang, authors,
    references: "1. [Reference one — author, title, journal, year]\n2. [Reference two — author, title, journal, year]\n3. [Reference three — author, title, journal, year]",
    first_page: p[0], last_page: p[1], doi: `10.00000/demo.2026.${n}`, pdf_path: `demo/article-${n}.pdf`, license: "CC BY 4.0",
    status: "published", published_at: issues.find((i) => i.id === issue)!.published_at, sort_order: 0,
    views: 40 + n * 17, downloads: 12 + n * 5, created_at: d("2026-01-01"), updated_at: d("2026-01-01"),
  });

  const uni = (s: string) => `${s}, O'zbekiston`;
  const articles = [
    art("iss-3-3", S1, [1, 10], "O'zbekistonda raqamli iqtisodiyotni rivojlantirishning ustuvor yo'nalishlari",
      [{ name: "Karimov Aziz Bahodirovich", affiliation: uni("Toshkent davlat iqtisodiyot universiteti, Toshkent"), orcid: "0000-0002-1825-0097" }, { name: "Rahimova Dilnoza Sobirovna", affiliation: uni("Samarqand davlat universiteti, Samarqand") }],
      "uz", ["raqamli iqtisodiyot", "davlat siyosati", "IT-park", "innovatsiya"],
      "Maqolada O'zbekistonda raqamli iqtisodiyotni rivojlantirishning hozirgi holati tahlil qilinadi, uning asosiy to'siqlari aniqlanadi va davlat siyosatining ustuvor yo'nalishlari bo'yicha takliflar beriladi. Tadqiqotda statistik tahlil va xalqaro tajribani qiyosiy o'rganish usullaridan foydalanilgan.",
      {
        title: { ru: "Приоритетные направления развития цифровой экономики в Узбекистане", en: "Priority directions for developing the digital economy in Uzbekistan" },
        abstract: {
          ru: "В статье анализируется текущее состояние цифровой экономики Узбекистана, выявляются основные барьеры и предлагаются приоритетные направления государственной политики.",
          en: "The article analyses the current state of the digital economy in Uzbekistan, identifies its main barriers and proposes priority directions for state policy.",
        },
      }),
    art("iss-3-3", S1, [11, 19], "Методы оценки качества высшего образования в Центральной Азии",
      [{ name: "Иванова Елена Петровна", affiliation: "Национальный университет Узбекистана, Ташкент, Узбекистан" }],
      "ru", ["высшее образование", "оценка качества", "аккредитация"],
      "В статье рассматриваются современные методы оценки качества высшего образования и их применение в вузах Центральной Азии. Предложена модель показателей для внутренней системы мониторинга.",
      { title: { uz: "Markaziy Osiyoda oliy ta'lim sifatini baholash usullari", en: "Methods for assessing the quality of higher education in Central Asia" } }),
    art("iss-3-3", S1, [20, 31], "Machine learning approaches to crop yield forecasting in arid regions",
      [{ name: "Jasur Tursunov", affiliation: "Tashkent Institute of Irrigation and Agricultural Mechanization Engineers, Uzbekistan" }, { name: "John Lee", affiliation: "Westminster International University in Tashkent, Uzbekistan" }],
      "en", ["machine learning", "crop yield", "remote sensing", "arid agriculture"],
      "We compare gradient boosting, random forest and LSTM models for forecasting cotton and wheat yields from satellite indices and weather data. Ensemble models gave the most stable forecasts across districts."),
    art("iss-3-3", S2, [32, 40], "Alisher Navoiy ijodida ma'rifat masalalari: zamonaviy talqin",
      [{ name: "Yo'ldosheva Nodira", affiliation: uni("Alisher Navoiy nomidagi Toshkent davlat o'zbek tili va adabiyoti universiteti, Toshkent") }],
      "uz", ["Navoiy", "ma'rifat", "mumtoz adabiyot"],
      "Maqolada Alisher Navoiy asarlarida ilm va ma'rifat g'oyalarining ifodalanishi hamda ularning bugungi ta'lim tizimi uchun ahamiyati sharhlanadi."),
    art("iss-3-3", S1, [41, 55], "Water resource management strategies in the Aral Sea basin",
      [{ name: "Rustam Saidov", affiliation: "Karakalpak State University, Nukus, Uzbekistan" }, { name: "Olga Petrova", affiliation: "Kazakh National University, Almaty, Kazakhstan" }],
      "en", ["water management", "Aral Sea", "irrigation"],
      "The paper reviews water allocation policies in the Aral Sea basin and evaluates drip irrigation pilots in Karakalpakstan."),
    art("iss-3-2", S1, [1, 12], "Kichik biznes subyektlarini moliyalashtirishda mikromoliya tashkilotlarining roli",
      [{ name: "Xolmatov Sardor", affiliation: uni("Toshkent moliya instituti, Toshkent") }],
      "uz", ["mikromoliya", "kichik biznes", "kredit"],
      "Tadqiqotda mikromoliya tashkilotlarining kichik biznesni qo'llab-quvvatlashdagi o'rni 2020–2025-yillar ma'lumotlari asosida tahlil qilinadi."),
    art("iss-3-2", S3, [13, 18], "Цифровые компетенции учителей начальных классов",
      [{ name: "Ахмедова Малика", affiliation: "Ташкентский государственный педагогический университет, Узбекистан" }],
      "ru", ["цифровые компетенции", "учитель", "начальная школа"],
      "Представлены результаты анкетирования 240 учителей начальных классов о навыках работы с цифровыми образовательными ресурсами."),
    art("iss-3-s1", S1, [1, 6], "Renewable energy adoption in Central Asian households",
      [{ name: "Malika Usmonova", affiliation: "Inha University in Tashkent, Uzbekistan" }],
      "en", ["solar energy", "households", "energy policy"],
      "Survey evidence on the uptake of rooftop solar panels among households in three regions of Uzbekistan."),
    art("iss-3-1", S1, [1, 9], "Turizm klasterlarini shakllantirishning tashkiliy-iqtisodiy mexanizmlari",
      [{ name: "Ergashev Bobur", affiliation: uni("Samarqand iqtisodiyot va servis instituti, Samarqand") }],
      "uz", ["turizm", "klaster", "hududiy rivojlanish"],
      "Maqolada turizm klasterlarini shakllantirishning xorijiy tajribasi va Samarqand viloyatida qo'llash imkoniyatlari ko'rib chiqiladi."),
    art("iss-2-3", S2, [1, 14], "A review of e-government services in Uzbekistan, 2015–2025",
      [{ name: "Shahzod Nazarov", affiliation: "Tashkent University of Information Technologies, Uzbekistan" }],
      "en", ["e-government", "digital services", "public administration"],
      "This review traces the development of the my.gov.uz portal and related public digital services over ten years."),
  ];

  // ---------------- submissions in different workflow stages
  const sub = (id: string, submitter: string, status: string, title: string, created: string, extra: any = {}) => ({
    id, journal_id: J, section_id: S1, submitter_id: submitter, editor_id: status === "submitted" ? null : "u-admin", status, title,
    abstract: "Ushbu tadqiqotda masalaning nazariy asoslari, amaliy holati va takomillashtirish yo'llari ko'rib chiqiladi. (Demo annotatsiya.)",
    keywords: ["demo", "tadqiqot", "tahlil"], language: "uz", references: "1. [Reference]\n2. [Reference]",
    cover_letter: null, decision_note: null, submitted_at: d(created), created_at: d(created), updated_at: d(created), ...extra,
  });
  const submissions = [
    sub("sub-1", "u-author", "under_review", "Raqamli ta'lim platformalarining oliy ta'lim sifatiga ta'siri", "2026-10-02"),
    sub("sub-2", "u-author", "revision_required", "Hududiy innovatsion salohiyatni baholash metodikasi", "2026-09-05", {
      decision_note: "Taqrizchilar izohlarini hisobga olib, metodika bo'limini kengaytiring va 2025-yil ma'lumotlarini qo'shing.",
    }),
    sub("sub-3", "u-author2", "accepted", "Green finance instruments for SMEs in Uzbekistan", "2026-08-12", { language: "en", abstract: "This paper reviews green bonds and green credit lines available to small businesses. (Demo abstract.)", keywords: ["green finance", "SMEs"] }),
    sub("sub-4", "u-author2", "submitted", "Student motivation in blended learning: evidence from Tashkent universities", "2026-11-11", { language: "en", abstract: "A survey of 600 students on motivation in blended courses. (Demo abstract.)", keywords: ["blended learning", "motivation"] }),
  ];

  const submission_authors = [
    { id: "sa-1", submission_id: "sub-1", full_name: "Aziz Karimov", email: "author@demo.uz", affiliation: "Toshkent davlat iqtisodiyot universiteti", orcid: "0000-0002-1825-0097", is_corresponding: true, sort_order: 0 },
    { id: "sa-2", submission_id: "sub-1", full_name: "Lola Hasanova", email: null, affiliation: "Toshkent davlat iqtisodiyot universiteti", orcid: null, is_corresponding: false, sort_order: 1 },
    { id: "sa-3", submission_id: "sub-2", full_name: "Aziz Karimov", email: "author@demo.uz", affiliation: "Toshkent davlat iqtisodiyot universiteti", orcid: null, is_corresponding: true, sort_order: 0 },
    { id: "sa-4", submission_id: "sub-3", full_name: "John Lee", email: "author2@demo.uz", affiliation: "Westminster International University in Tashkent", orcid: null, is_corresponding: true, sort_order: 0 },
    { id: "sa-5", submission_id: "sub-4", full_name: "John Lee", email: "author2@demo.uz", affiliation: "Westminster International University in Tashkent", orcid: null, is_corresponding: true, sort_order: 0 },
  ];

  const file = (id: string, sid: string, kind: string, name: string, v: number, at: string, by = "u-author") =>
    ({ id, submission_id: sid, uploaded_by: by, kind, storage_path: `${sid}/${name}`, file_name: name, mime_type: "application/pdf", size_bytes: 480000, version: v, created_at: d(at) });
  const submission_files = [
    file("f-1", "sub-1", "manuscript", "manuscript.docx", 1, "2026-10-02"),
    file("f-2", "sub-2", "manuscript", "manuscript.docx", 1, "2026-09-05"),
    file("f-3", "sub-3", "manuscript", "green-finance.docx", 1, "2026-08-12", "u-author2"),
    file("f-4", "sub-3", "revision", "green-finance-v2.docx", 2, "2026-09-20", "u-author2"),
    file("f-5", "sub-4", "manuscript", "blended-learning.pdf", 1, "2026-11-11", "u-author2"),
  ];

  const review = (id: string, sid: string, rid: string, status: string, extra: any = {}) => ({
    id, submission_id: sid, reviewer_id: rid, round: 1, status, recommendation: null, comments_to_author: null, comments_to_editor: null,
    due_at: d("2026-11-30"), completed_at: null, created_at: d("2026-10-05"), ...extra,
  });
  const review_assignments = [
    review("rev-1", "sub-1", "u-reviewer", "invited"),
    review("rev-2", "sub-1", "u-reviewer2", "completed", { recommendation: "minor_revision", comments_to_author: "Работа актуальна. Рекомендую уточнить выборку и добавить сравнение с данными 2024 года.", comments_to_editor: "В целом статья хорошая.", completed_at: d("2026-10-28") }),
    review("rev-3", "sub-2", "u-reviewer", "completed", { recommendation: "major_revision", comments_to_author: "Metodika bo'limi juda qisqa. Indikatorlarni tanlash asoslanmagan, ma'lumotlar manbasini ko'rsating.", comments_to_editor: "Qayta ishlangandan keyin ko'rib chiqishga tayyorman.", completed_at: d("2026-10-01") }),
    review("rev-4", "sub-3", "u-reviewer", "completed", { recommendation: "accept", comments_to_author: "Well structured and clearly argued.", completed_at: d("2026-10-15") }),
  ];

  let e = 0;
  const ev = (sid: string, from: string | null, to: string, at: string, note: string | null = null) =>
    ({ id: ++e, submission_id: sid, actor_id: null, from_status: from, to_status: to, note, created_at: d(at) });
  const submission_events = [
    ev("sub-1", null, "submitted", "2026-10-02"), ev("sub-1", "submitted", "under_review", "2026-10-05"),
    ev("sub-2", null, "submitted", "2026-09-05"), ev("sub-2", "submitted", "under_review", "2026-09-08"),
    ev("sub-2", "under_review", "revision_required", "2026-10-03", submissions[1].decision_note),
    ev("sub-3", null, "submitted", "2026-08-12"), ev("sub-3", "submitted", "under_review", "2026-08-15"),
    ev("sub-3", "under_review", "revision_required", "2026-09-10"), ev("sub-3", "revision_required", "submitted", "2026-09-20"),
    ev("sub-3", "submitted", "accepted", "2026-10-16"),
    ev("sub-4", null, "submitted", "2026-11-11"),
  ];

  const page = (slug: string, sort: number, title: any, body: any) =>
    ({ id: `page-${slug}`, slug, title, body, is_published: true, show_in_menu: true, sort_order: sort, updated_at: d("2026-01-01") });
  const pages = [
    page("about", 1, { uz: "Jurnal haqida", ru: "О журнале", en: "About" }, {
      uz: "<p>Jurnal iqtisodiyot, ta'lim, ijtimoiy va texnika fanlari bo'yicha original ilmiy maqolalarni nashr etadi. Yiliga to'rt son chiqadi.</p><h2>Maqsad va vazifalar</h2><ul><li>Yosh olimlarning tadqiqotlarini nashr etish</li><li>Xalqaro ilmiy hamkorlikni rivojlantirish</li><li>Ochiq kirishni ta'minlash</li></ul>",
      ru: "<p>Журнал публикует оригинальные научные статьи по экономике, образованию, социальным и техническим наукам. Выходит четыре раза в год.</p><h2>Цели и задачи</h2><ul><li>Публикация исследований молодых учёных</li><li>Развитие международного научного сотрудничества</li><li>Обеспечение открытого доступа</li></ul>",
      en: "<p>The journal publishes original research in economics, education, social sciences and engineering. Four issues are published each year.</p><h2>Aims and scope</h2><ul><li>Publishing work by early-career researchers</li><li>Developing international research cooperation</li><li>Keeping all content open access</li></ul>",
    }),
    page("author-guidelines", 2, { uz: "Mualliflar uchun", ru: "Авторам", en: "For authors" }, {
      uz: "<h2>Maqolaga talablar</h2><ul><li>Hajmi: 6–15 sahifa, A4, Times New Roman 14</li><li>Annotatsiya: 150–250 so'z, uch tilda</li><li>Kalit so'zlar: 5–8 ta</li><li>Adabiyotlar: APA uslubida</li></ul><p>Maqola saytdagi «Maqola yuborish» tugmasi orqali yuboriladi.</p>",
      ru: "<h2>Требования к статье</h2><ul><li>Объём: 6–15 страниц, A4, Times New Roman 14</li><li>Аннотация: 150–250 слов, на трёх языках</li><li>Ключевые слова: 5–8</li><li>Литература: стиль APA</li></ul><p>Статья отправляется через кнопку «Отправить статью» на сайте.</p>",
      en: "<h2>Manuscript requirements</h2><ul><li>Length: 6–15 pages, A4, Times New Roman 14</li><li>Abstract: 150–250 words, in three languages</li><li>Keywords: 5–8</li><li>References: APA style</li></ul><p>Submit through the “Submit article” button on this site.</p>",
    }),
    page("peer-review", 3, { uz: "Taqriz jarayoni", ru: "Рецензирование", en: "Peer review" }, {
      uz: "<p>Har bir maqola ikki mustaqil taqrizchi tomonidan yopiq usulda baholanadi. Qaror odatda 3–4 hafta ichida qabul qilinadi.</p>",
      ru: "<p>Каждая статья проходит двойное слепое рецензирование двумя независимыми экспертами. Решение обычно принимается в течение 3–4 недель.</p>",
      en: "<p>Every manuscript is assessed by two independent reviewers in a double-blind process. A decision is usually made within 3–4 weeks.</p>",
    }),
    page("contact", 4, { uz: "Aloqa", ru: "Контакты", en: "Contact" }, {
      uz: "<p>Email: editor@example.uz<br>Manzil: [manzil], Toshkent</p>",
      ru: "<p>Email: editor@example.uz<br>Адрес: [адрес], Ташкент</p>",
      en: "<p>Email: editor@example.uz<br>Address: [address], Tashkent</p>",
    }),
  ];

  const editorial_board = [
    { id: "eb-1", journal_id: J, sort_order: 1, position_type: "chief", photo_url: null, email: null, orcid: null,
      full_name: { uz: "Abdullayev Jamshid", ru: "Абдуллаев Джамшид", en: "Jamshid Abdullayev" },
      position: { uz: "Bosh muharrir", ru: "Главный редактор", en: "Editor-in-Chief" },
      affiliation: { uz: "i.f.d., professor, Toshkent", ru: "д.э.н., профессор, Ташкент", en: "DSc (Economics), Professor, Tashkent" } },
    { id: "eb-2", journal_id: J, sort_order: 2, position_type: "deputy", photo_url: null, email: null, orcid: null,
      full_name: { uz: "Sobirova Gulnora", ru: "Собирова Гульнора", en: "Gulnora Sobirova" },
      position: { uz: "Bosh muharrir o'rinbosari", ru: "Заместитель главного редактора", en: "Deputy Editor" },
      affiliation: { uz: "PhD, dotsent, Samarqand", ru: "PhD, доцент, Самарканд", en: "PhD, Associate Professor, Samarkand" } },
    { id: "eb-3", journal_id: J, sort_order: 3, position_type: "member", photo_url: null, email: null, orcid: null,
      full_name: { uz: "Maria Schmidt", ru: "Мария Шмидт", en: "Maria Schmidt" },
      position: { uz: "Tahrir hay'ati a'zosi", ru: "Член редколлегии", en: "Editorial Board Member" },
      affiliation: { uz: "PhD, Berlin, Germaniya", ru: "PhD, Берлин, Германия", en: "PhD, Berlin, Germany" } },
    ...[
      ["eb-4", "deputy", 2, ["Rahmonov Otabek", "Рахмонов Отабек", "Otabek Rakhmonov"], ["Bosh muharrir o'rinbosari", "Заместитель главного редактора", "Deputy Editor"], ["DSc, professor, Toshkent", "DSc, профессор, Ташкент", "DSc, Professor, Tashkent"]],
      ["eb-5", "member", 4, ["Kim Yuna", "Ким Юна", "Yuna Kim"], ["Tahrir hay'ati a'zosi", "Член редколлегии", "Editorial Board Member"], ["PhD, Seul, Koreya", "PhD, Сеул, Корея", "PhD, Seoul, Korea"]],
      ["eb-6", "member", 5, ["Nazarova Feruza", "Назарова Феруза", "Feruza Nazarova"], ["Tahrir hay'ati a'zosi", "Член редколлегии", "Editorial Board Member"], ["PhD, dotsent, Buxoro", "PhD, доцент, Бухара", "PhD, Associate Professor, Bukhara"]],
      ["eb-7", "member", 6, ["Ahmet Yılmaz", "Ахмет Йылмаз", "Ahmet Yılmaz"], ["Tahrir hay'ati a'zosi", "Член редколлегии", "Editorial Board Member"], ["PhD, Anqara, Turkiya", "PhD, Анкара, Турция", "PhD, Ankara, Türkiye"]],
    ].map(([id, type, sort, n, p, a]: any) => ({
      id, journal_id: J, sort_order: sort, position_type: type, photo_url: null, email: null, orcid: null,
      full_name: { uz: n[0], ru: n[1], en: n[2] }, position: { uz: p[0], ru: p[1], en: p[2] }, affiliation: { uz: a[0], ru: a[1], en: a[2] },
    })),
  ];

  const news = [
    { id: "n1", date: "2026-11-05", pinned: true, created_at: d("2026-11-05"),
      title: { uz: "4-son uchun maqolalar qabuli boshlandi", ru: "Начат приём статей в выпуск 4", en: "Submissions open for Issue 4" },
      body: { uz: "<p>Tahririyat 2026-yil dekabr soni uchun maqolalarni 20-dekabrgacha qabul qiladi. Talablar «Mualliflar uchun» sahifasida.</p>", ru: "<p>Редакция принимает статьи в декабрьский выпуск до 20 декабря. Требования — на странице «Авторам».</p>", en: "<p>The editors accept papers for the December 2026 issue until 20 December. Requirements are on the “For authors” page.</p>" } },
    { id: "n2", date: "2026-10-18", pinned: false, created_at: d("2026-10-18"),
      title: { uz: "Xalqaro konferensiya materiallari nashr etildi", ru: "Опубликованы материалы международной конференции", en: "International conference proceedings published" },
      body: { uz: "<p>Maxsus son konferensiyada taqdim etilgan eng yaxshi ma'ruzalarni o'z ichiga oladi.</p>", ru: "<p>Специальный выпуск включает лучшие доклады конференции.</p>", en: "<p>The special issue collects the best papers presented at the conference.</p>" } },
    { id: "n3", date: "2026-09-02", pinned: false, created_at: d("2026-09-02"),
      title: { uz: "Tahrir hay'atiga yangi a'zolar qo'shildi", ru: "В редколлегию вошли новые члены", en: "New members join the editorial board" },
      body: { uz: "<p>Koreya va Turkiyadan olimlar tahrir hay'atiga qo'shildi.</p>", ru: "<p>В редколлегию вошли учёные из Кореи и Турции.</p>", en: "<p>Researchers from Korea and Türkiye have joined the board.</p>" } },
  ];

  const notifications = [
    { id: "nt1", user_id: "u-author", type: "status", submission_id: "sub-2", status: "revision_required", link: "/dashboard/submissions/sub-2", read: false, created_at: d("2026-10-03") },
    { id: "nt2", user_id: "u-reviewer", type: "invite", submission_id: "sub-1", status: null, link: "/dashboard/reviews/rev-1", read: false, created_at: d("2026-10-05") },
    { id: "nt3", user_id: "u-admin", type: "new", submission_id: "sub-4", status: null, link: "/admin/submissions/sub-4", read: false, created_at: d("2026-11-11") },
    { id: "nt4", user_id: "u-admin", type: "review", submission_id: "sub-1", status: null, link: "/admin/submissions/sub-1", read: true, created_at: d("2026-10-28") },
  ];

  // one rejected paper so the acceptance rate is realistic
  submissions.push(sub("sub-5", "u-author2", "rejected", "Social media use and exam performance: a pilot survey", "2026-07-01", {
    language: "en", abstract: "A small pilot survey of first-year students. (Demo abstract.)", keywords: ["social media", "students"],
    decision_note: "The sample is too small for the conclusions drawn.", updated_at: d("2026-07-24"),
  }));
  submission_authors.push({ id: "sa-6", submission_id: "sub-5", full_name: "John Lee", email: "author2@demo.uz", affiliation: "Westminster International University in Tashkent", orcid: null, is_corresponding: true, sort_order: 0 });
  submission_events.push(ev("sub-5", null, "submitted", "2026-07-01"), ev("sub-5", "submitted", "rejected", "2026-07-24", "The sample is too small for the conclusions drawn."));

  return {
    profiles, journals, sections, volumes, issues, articles, submissions, submission_authors, submission_files,
    review_assignments, submission_events, pages, editorial_board, payments: [], site_settings: [], news, notifications,
  };
}
