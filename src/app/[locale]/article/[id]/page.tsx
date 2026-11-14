import type { Metadata } from "next";
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

type FullArticle = Article & {
  sections: { title: I18nText } | null;
  issues: { id: string; number: number; is_special: boolean; volumes: { number: number; year: number } | null } | null;
};

async function load(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("*, sections(title), issues(id, number, is_special, volumes(number, year))")
    .eq("id", id)
    .maybeSingle<FullArticle>();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/article/[id]">): Promise<Metadata> {
  const { id } = await params;
  const [a, journal, locale] = await Promise.all([load(id), getJournal(), getLocale()]);
  if (!a) return {};
  const date = a.published_at?.slice(0, 10).replaceAll("-", "/");

  // Google Scholar / Highwire Press tags
  const other: Record<string, string | string[]> = {
    citation_title: a.title,
    citation_author: a.authors.map((x) => x.name),
    citation_journal_title: tr(journal?.title, "en") || tr(journal?.title, locale),
    citation_language: a.language,
    citation_keywords: a.keywords.join("; "),
  };
  if (date) other.citation_publication_date = date;
  if (a.issues?.volumes) other.citation_volume = String(a.issues.volumes.number);
  if (a.issues) other.citation_issue = String(a.issues.number);
  if (a.first_page) other.citation_firstpage = String(a.first_page);
  if (a.last_page) other.citation_lastpage = String(a.last_page);
  if (a.doi) other.citation_doi = a.doi;
  if (journal?.issn_online) other.citation_issn = journal.issn_online;
  if (journal?.publisher) other.citation_publisher = journal.publisher;
  if (a.pdf_path) other.citation_pdf_url = publicFileUrl("articles", a.pdf_path);

  return {
    title: trExact(a.title_i18n, locale) || a.title,
    description: (trExact(a.abstract_i18n, locale) || a.abstract).slice(0, 300),
    other,
  };
}

export default async function ArticlePage({ params }: PageProps<"/[locale]/article/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const a = await load(id);
  if (!a) notFound();
  const journal = await getJournal();

  const supabase = await createClient();
  await supabase.rpc("track_article", { aid: a.id, kind: "view" });

  const localTitle = trExact(a.title_i18n, locale);
  const localAbstract = trExact(a.abstract_i18n, locale);
  const range = pagesRange(a.first_page, a.last_page);
  const year = a.published_at ? new Date(a.published_at).getFullYear() : "";
  const citation = [
    `${a.authors.map((x) => x.name).join(", ")} (${year}). ${a.title}.`,
    ` ${tr(journal?.title, locale)}`,
    a.issues?.volumes ? `, ${a.issues.volumes.number}(${a.issues.number})` : "",
    range ? `, ${range}` : "",
    ".",
    a.doi ? ` https://doi.org/${a.doi}` : "",
  ].join("");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <article className="card">
        <nav className="mb-4 text-sm text-slate-500">
          <Link href="/archives" className="hover:underline">{t("nav.archives")}</Link>
          {a.issues && (
            <>
              {" / "}
              <Link href={`/issue/${a.issues.id}`} className="hover:underline">{issueLabel(t, a.issues)}</Link>
            </>
          )}
        </nav>
        {a.sections && (
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-accent">{tr(a.sections.title, locale)}</p>
        )}
        <h1 className="text-3xl leading-tight">{a.title}</h1>
        {localTitle && localTitle !== a.title && (
          <p className="mt-2 font-serif text-xl text-slate-600">{localTitle}</p>
        )}

        <ul className="mt-5 space-y-1">
          {a.authors.map((au, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-slate-900">{au.name}</span>
              {au.orcid && (
                <a href={`https://orcid.org/${au.orcid}`} className="ml-2 text-xs text-green-700 hover:underline" target="_blank" rel="noreferrer">
                  ORCID
                </a>
              )}
              {au.affiliation && <span className="block text-slate-500">{au.affiliation}</span>}
            </li>
          ))}
        </ul>

        <h2 className="mt-8 text-xl">{t("article.abstract")}</h2>
        <p className="mt-2 whitespace-pre-line leading-relaxed">{a.abstract}</p>
        {localAbstract && localAbstract !== a.abstract && (
          <>
            <h3 className="mt-5 text-base text-slate-600">{t("article.abstract")} ({t("article.translated")})</h3>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">{localAbstract}</p>
          </>
        )}

        {a.keywords.length > 0 && (
          <>
            <h2 className="mt-6 text-xl">{t("article.keywords")}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {a.keywords.map((k) => (
                <Link key={k} href={`/search?q=${encodeURIComponent(k)}`} className="rounded-full bg-slate-100 px-3 py-1 text-sm hover:bg-brand-50">
                  {k}
                </Link>
              ))}
            </div>
          </>
        )}

        {a.references && (
          <>
            <h2 className="mt-8 text-xl">{t("article.references")}</h2>
            <ol className="mt-2 space-y-1 text-sm text-slate-700">
              {a.references.split("\n").filter(Boolean).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </>
        )}

        <h2 className="mt-8 text-xl">{t("article.cite")}</h2>
        <p className="mt-2 rounded bg-slate-50 p-3 text-sm">{citation}</p>
      </article>

      <aside className="space-y-4">
        {a.pdf_path && (
          <a href={`/api/download/${a.id}`} className="btn-primary w-full">{t("article.pdf")}</a>
        )}
        <dl className="card space-y-3 text-sm">
          {a.published_at && (
            <div><dt className="text-slate-500">{t("article.published")}</dt><dd>{formatDate(a.published_at, locale)}</dd></div>
          )}
          {a.issues && (
            <div><dt className="text-slate-500">{t("article.issue")}</dt><dd>{issueLabel(t, a.issues)}</dd></div>
          )}
          {range && <div><dt className="text-slate-500">{t("article.pages")}</dt><dd>{range}</dd></div>}
          {a.doi && (
            <div>
              <dt className="text-slate-500">DOI</dt>
              <dd><a className="break-all text-brand-600 hover:underline" href={`https://doi.org/${a.doi}`}>{a.doi}</a></dd>
            </div>
          )}
          <div><dt className="text-slate-500">{t("article.license")}</dt><dd>{a.license}</dd></div>
          <div className="flex gap-6">
            <div><dt className="text-slate-500">{t("article.views")}</dt><dd>{a.views}</dd></div>
            <div><dt className="text-slate-500">{t("article.downloads")}</dt><dd>{a.downloads}</dd></div>
          </div>
        </dl>
      </aside>
    </div>
  );
}
