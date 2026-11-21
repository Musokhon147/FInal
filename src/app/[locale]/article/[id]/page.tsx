import type { Metadata } from "next";
import { relatedArticles, type RelatedCandidate } from "@/lib/related";
import PdfViewer from "@/components/public/PdfViewer";
import ReadingRing from "@/components/fx/ReadingRing";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { publicFileUrl } from "@/lib/supabase/env";
import { getJournal, pagesRange } from "@/lib/data";
import { formatDate, tr, trExact, type I18nText } from "@/lib/i18n-field";
import { issueLabel } from "@/lib/issue-label";
import type { Article } from "@/lib/types";
import CiteBox from "@/components/fx/CiteBox";
import { ViewTransition } from "react";
import { alternates, articleLocale, SITE_URL } from "@/lib/site";
import { isDoi, isIssn } from "@/lib/identifiers";

type FullArticle = Article & {
  sections: { title: I18nText } | null;
  issues: {
    id: string; number: number; is_special: boolean; conference_id?: string | null;
    volumes: { number: number; year: number } | null; conferences?: { title: I18nText } | null;
  } | null;
};

async function load(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("*, sections(title), issues(id, number, is_special, conference_id, volumes(number, year), conferences(title))")
    .eq("id", id)
    .maybeSingle<FullArticle>();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/article/[id]">): Promise<Metadata> {
  const { id } = await params;
  const [a, locale] = await Promise.all([load(id), getLocale()]);
  if (!a) return {};
  const title = trExact(a.title_i18n, locale) || a.title;
  const description = (trExact(a.abstract_i18n, locale) || a.abstract).slice(0, 300);
  return {
    title,
    description,
    // one address per article for search engines and Scholar: its own language version
    alternates: { ...alternates(locale, `/article/${a.id}`), canonical: `/${articleLocale(a.language)}/article/${a.id}` },
    openGraph: { type: "article", title, description, publishedTime: a.published_at ?? undefined, authors: a.authors.map((x) => x.name) },
  };
}

/**
 * Google Scholar (Highwire Press) tags, plus Dublin Core for other indexes. Rendered as elements
 * so the order is kept — Scholar expects each citation_author_institution right after its author.
 * React places <meta> tags in <head>. Only real identifiers are given (a mistyped DOI or the
 * "0000-0000" placeholder ISSN would make Scholar distrust the page).
 */
function ScholarTags({ a, journalTitle, issns, publisher, locale }: { a: FullArticle; journalTitle: string; issns: string[]; publisher?: string | null; locale: string }) {
  const date = a.published_at?.slice(0, 10).replaceAll("-", "/");
  const url = `${SITE_URL}/${locale}/article/${a.id}`;
  const doi = isDoi(a.doi) ? a.doi : null;
  const conference = a.issues?.conferences ? tr(a.issues.conferences.title, "en") || tr(a.issues.conferences.title, locale) : "";
  const m = (name: string, content: string | number | null | undefined, key?: string | number) =>
    content === null || content === undefined || content === "" ? null : <meta key={key ?? name} name={name} content={String(content)} />;
  return (
    <>
      {m("citation_title", a.title)}
      {a.authors.flatMap((au, i) => [m("citation_author", au.name, `au${i}`), m("citation_author_institution", au.affiliation, `inst${i}`), au.orcid ? m("citation_author_orcid", `https://orcid.org/${au.orcid}`, `orcid${i}`) : null])}
      {m("citation_publication_date", date)}
      {conference ? m("citation_conference_title", conference) : m("citation_journal_title", journalTitle)}
      {issns.map((x, i) => m("citation_issn", x, `issn${i}`))}
      {m("citation_publisher", publisher)}
      {m("citation_volume", a.issues?.volumes?.number)}
      {m("citation_issue", a.issues?.number)}
      {m("citation_firstpage", a.first_page)}
      {m("citation_lastpage", a.last_page)}
      {m("citation_doi", doi)}
      {m("citation_language", a.language)}
      {m("citation_keywords", a.keywords.join("; "))}
      {m("citation_abstract_html_url", url)}
      {/* full text under the article's own address, as Scholar requires */}
      {a.pdf_path ? m("citation_pdf_url", `${url}/full-text.pdf`) : null}
      {/* Dublin Core (BASE, CyberLeninka, national catalogues) */}
      {m("DC.title", a.title)}
      {a.authors.map((au, i) => m("DC.creator", au.name, `dc-au${i}`))}
      {m("DC.date", a.published_at?.slice(0, 10))}
      {m("DC.identifier", doi ? `https://doi.org/${doi}` : url)}
      {m("DC.source", conference || journalTitle)}
      {issns[0] ? m("DC.source.ISSN", issns[0]) : null}
      {m("DC.publisher", publisher)}
      {m("DC.language", a.language)}
      {m("DC.subject", a.keywords.join("; "))}
      {m("DC.type", "Text.Serial.Journal")}
      {m("DC.rights", "https://creativecommons.org/licenses/by/4.0/")}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        headline: a.title,
        name: a.title,
        author: a.authors.map((au) => ({ "@type": "Person", name: au.name, affiliation: au.affiliation ? { "@type": "Organization", name: au.affiliation } : undefined })),
        datePublished: a.published_at ?? undefined,
        inLanguage: a.language,
        keywords: a.keywords.join(", "),
        abstract: a.abstract,
        url,
        sameAs: doi ? `https://doi.org/${doi}` : undefined,
        identifier: doi ? { "@type": "PropertyValue", propertyID: "DOI", value: doi } : undefined,
        isPartOf: { "@type": "Periodical", name: journalTitle, issn: issns.length ? issns : undefined },
        isAccessibleForFree: true,
        license: "https://creativecommons.org/licenses/by/4.0/",
      }).replace(/</g, "\\u003c") }} />
    </>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="mt-10 scroll-mt-28 text-xl">{children}</h2>;
}

export default async function ArticlePage({ params }: PageProps<"/[locale]/article/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const a = await load(id);
  if (!a) notFound();
  const journal = await getJournal();

  const supabase = await createClient();
  const [, { data: others }] = await Promise.all([
    supabase.rpc("track_article", { aid: a.id, kind: "view" }),
    supabase.from("articles").select("id, title, title_i18n, authors, keywords, published_at, section_id").eq("status", "published").neq("id", a.id).limit(500),
  ]);
  const related = relatedArticles(a.keywords, (others ?? []) as RelatedCandidate[], 3, a.section_id);

  const localTitle = trExact(a.title_i18n, locale);
  const localAbstract = trExact(a.abstract_i18n, locale);
  const range = pagesRange(a.first_page, a.last_page);
  const iss = a.issues, v = iss?.volumes;
  const year = a.published_at ? new Date(a.published_at).getFullYear() : "";
  const names = a.authors.map((x) => x.name), jt = tr(journal?.title, locale), doi = isDoi(a.doi) ? a.doi : null, doiUrl = doi ? `https://doi.org/${doi}` : "";
  const formats = {
    apa: `${names.join(", ")} (${year}). ${a.title}. ${jt}${v && iss ? `, ${v.number}(${iss.number})` : ""}${range ? `, ${range}` : ""}.${doiUrl ? ` ${doiUrl}` : ""}`,
    gost: `${names.join(", ")}. ${a.title} // ${jt}. – ${year}.${v ? ` – Т. ${v.number}` : ""}${iss ? `, № ${iss.number}` : ""}.${range ? ` – С. ${range}` : ""}.${doi ? ` – DOI: ${doi}` : ""}`,
    mla: `${names.join(", ")}. "${a.title}." ${jt}${v ? `, vol. ${v.number}` : ""}${iss ? `, no. ${iss.number}` : ""}, ${year}${range ? `, pp. ${range}` : ""}.${doiUrl ? ` ${doiUrl}.` : ""}`,
  };
  const toc = ([
    ["art-abstract", t("article.abstract")],
    a.keywords.length ? ["art-keywords", t("article.keywords")] : null,
    a.references ? ["art-refs", t("article.references")] : null,
    ["art-cite", t("article.cite")],
    a.pdf_path ? ["art-preview", t("x.pdfPreview")] : null,
  ].filter(Boolean)) as [string, string][];

  return (
    <>
      {/* Scholar reads one version of each article: the one in its own language (the others point there) */}
      {locale === articleLocale(a.language) && <ScholarTags a={a} journalTitle={tr(journal?.title, "en") || jt} issns={[journal?.issn_online, journal?.issn_print].filter(isIssn)} publisher={journal?.publisher} locale={locale} />}
      <span data-scene={`glyph:${(trExact(a.title_i18n, locale) || a.title).trim().charAt(0).toUpperCase()}`} hidden />
      <div id="readbar" className="read-progress" aria-hidden="true" />
      <ReadingRing />
      <div className="grid gap-8 lg:grid-cols-[1fr_290px]">
        <article id="article-body" className="card p-6 sm:p-10">
          <nav className="mb-6 text-sm text-slate-500">
            <Link href="/archives" className="hover:text-slate-900">{t("nav.archives")}</Link>
            {iss && <> / <Link href={`/issue/${iss.id}`} className="hover:text-slate-900">{issueLabel(t, iss)}</Link></>}
          </nav>
          {a.sections && <p className="mb-3 text-sm font-medium text-accent">{tr(a.sections.title, locale)}</p>}
          <ViewTransition name={`title-${a.id.replace(/[^a-z0-9]/gi, "")}`} share="morph" default="none">
            <h1 className="text-3xl leading-tight sm:text-4xl">{localTitle || a.title}</h1>
          </ViewTransition>
          {localTitle && localTitle !== a.title && <p className="mt-3 text-xl text-slate-600">{a.title}</p>}

          <ul className="mt-7 grid gap-4 sm:grid-cols-2">
            {a.authors.map((au, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 font-serif text-brand-700" aria-hidden="true">{au.name.charAt(0)}</span>
                <span>
                  <span className="font-semibold text-slate-900">{au.name}</span>
                  {au.orcid && <a href={`https://orcid.org/${au.orcid}`} className="ml-2 text-xs text-brand-700 hover:underline" target="_blank" rel="noreferrer">ORCID</a>}
                  {au.affiliation && <span className="block text-slate-500">{au.affiliation}</span>}
                </span>
              </li>
            ))}
          </ul>

          <H2 id="art-abstract">{t("article.abstract")}</H2>
          <p className="mt-3 max-w-[70ch] whitespace-pre-line text-[1.05rem] leading-[1.8]">{a.abstract}</p>
          {localAbstract && localAbstract !== a.abstract && (
            <>
              <h3 className="mt-6 text-base text-slate-600">{t("article.abstract")} ({t("article.translated")})</h3>
              <p className="mt-2 max-w-[70ch] whitespace-pre-line leading-[1.8] text-slate-700">{localAbstract}</p>
            </>
          )}

          {a.keywords.length > 0 && (
            <>
              <H2 id="art-keywords">{t("article.keywords")}</H2>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.keywords.map((k) => (
                  <Link key={k} href={`/search?q=${encodeURIComponent(k)}`} className="rounded-full border border-slate-200 px-3 py-1 text-sm transition hover:border-brand-600 hover:text-brand-700">{k}</Link>
                ))}
              </div>
            </>
          )}

          {a.references && (
            <>
              <H2 id="art-refs">{t("article.references")}</H2>
              <ol className="mt-3 space-y-1.5 text-sm text-slate-700">{a.references.split("\n").filter(Boolean).map((r, i) => <li key={i}>{r}</li>)}</ol>
            </>
          )}

          <H2 id="art-cite">{t("article.cite")}</H2>
          <CiteBox formats={formats} />

          {a.pdf_path && (
            <>
              <H2 id="art-preview">{t("x.pdfPreview")}</H2>
              <PdfViewer url={publicFileUrl("articles", a.pdf_path)} downloadHref={`/api/download/${a.id}`} />
            </>
          )}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {a.pdf_path && <a href={`/api/download/${a.id}`} className="btn-gold w-full py-3">{t("article.pdf")}</a>}
          <Link href={`/certificate/publication/${a.id}`} className="btn-secondary w-full">{t("x.certPublication")}</Link>
          <nav className="card p-5 text-sm" aria-label={t("x.onPage")}>
            <p className="mb-3 font-semibold text-slate-900">{t("x.onPage")}</p>
            <ul className="space-y-2 border-l border-slate-200">
              {toc.map(([id, label]) => (
                <li key={id}><a href={`#${id}`} className="-ml-px block border-l border-transparent pl-3 text-slate-600 transition hover:border-brand-600 hover:text-slate-900">{label}</a></li>
              ))}
            </ul>
          </nav>
          <dl className="card space-y-3 p-5 text-sm">
            {a.published_at && <div><dt className="text-slate-500">{t("article.published")}</dt><dd>{formatDate(a.published_at, locale)}</dd></div>}
            {iss && <div><dt className="text-slate-500">{t("article.issue")}</dt><dd>{issueLabel(t, iss)}</dd></div>}
            {range && <div><dt className="text-slate-500">{t("article.pages")}</dt><dd>{range}</dd></div>}
            {doi && <div><dt className="text-slate-500">DOI</dt><dd><a className="break-all text-brand-700 hover:underline" href={doiUrl}>{doi}</a></dd></div>}
            <div><dt className="text-slate-500">{t("article.license")}</dt><dd>{a.license}</dd></div>
            <div className="inline-block pr-6"><dt className="text-slate-500">{t("article.views")}</dt><dd>{a.views}</dd></div>
            <div className="inline-block"><dt className="text-slate-500">{t("article.downloads")}</dt><dd>{a.downloads}</dd></div>
          </dl>
        </aside>
      </div>

      {related.length > 0 && (
        <section data-reveal className="mt-16" aria-labelledby="related-h">
          <h2 id="related-h" className="text-2xl sm:text-3xl">{t("x.related")}</h2>
          <ul className="mt-6 grid gap-5 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`/article/${r.id}`} data-tilt="5" className="card flex h-full flex-col p-6 transition hover:border-brand-600/40">
                  <span className="font-semibold leading-snug text-slate-900">{trExact(r.title_i18n, locale) || r.title}</span>
                  <span className="mt-2 text-sm text-slate-500">{r.authors.map((x) => x.name).join(", ")}</span>
                  <span className="mt-auto flex flex-wrap gap-1.5 pt-4">
                    {r.shared.map((k) => <span key={k} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700">{k}</span>)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
